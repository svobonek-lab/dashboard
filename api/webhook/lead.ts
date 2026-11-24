import { createHash } from 'node:crypto';

import publicIntakeHandler from '../public-intake.js';

export const config = {
  api: {
    bodyParser: { sizeLimit: '16kb' },
  },
};

type LeadWebhookBody = {
  company_slug?: unknown;
  public_key?: unknown;
  name?: unknown;
  phone?: unknown;
  email?: unknown;
  service_type?: unknown;
  notes?: unknown;
  request_key?: unknown;
  idempotency_key?: unknown;
  website?: unknown;
};

function queryValue(req: any, names: string[]): string {
  for (const name of names) {
    const fromQuery = req.query?.[name];
    const fromUrl = new URL(String(req.url || '/api/webhook/lead'), 'https://internal.invalid').searchParams.get(name);
    const value = Array.isArray(fromQuery) ? fromQuery[0] : fromQuery;
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (fromUrl?.trim()) return fromUrl.trim();
  }
  return '';
}

function fail(res: any, status: number, error: string): void {
  res.setHeader?.('Cache-Control', 'no-store');
  res.status(status).json({ error });
}

export default async function leadWebhookHandler(req: any, res: any): Promise<void> {
  res.setHeader?.('Cache-Control', 'no-store');
  if (req.method !== 'POST' && req.method !== 'OPTIONS') {
    res.setHeader?.('Allow', 'POST, OPTIONS');
    fail(res, 405, 'method_not_allowed');
    return;
  }

  const body = req.body as LeadWebhookBody | null;
  if (body && typeof body === 'object' && typeof body.website === 'string' && body.website.trim()) {
    await publicIntakeHandler({ ...req, body: { website: body.website } }, res);
    return;
  }

  if (req.method === 'OPTIONS') {
    await publicIntakeHandler(req, res);
    return;
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    fail(res, 400, 'invalid_lead');
    return;
  }

  const rawCompanySlug = body.company_slug ?? body.public_key ?? queryValue(req, ['company_slug', 'public_key']);
  if (typeof rawCompanySlug !== 'string') {
    fail(res, 400, 'invalid_lead');
    return;
  }
  const companySlug = rawCompanySlug.trim().toLowerCase();
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim() : '';
  const serviceType = typeof body.service_type === 'string' ? body.service_type.trim() : '';
  const notes = typeof body.notes === 'string' ? body.notes.trim() : '';

  if (!/^[a-z0-9][a-z0-9-]{0,119}$/.test(companySlug)
    || !name || name.length > 120
    || !phone || phone.length > 30
    || email.length > 254 || (email && !/^\S+@\S+\.\S+$/.test(email))
    || !serviceType || serviceType.length > 120
    || notes.length > 4_000) {
    fail(res, 400, 'invalid_lead');
    return;
  }

  const suppliedKey = body.request_key ?? body.idempotency_key;
  if (suppliedKey !== undefined && (typeof suppliedKey !== 'string'
    || suppliedKey.trim().length < 1 || suppliedKey.trim().length > 120
    || !/^[A-Za-z0-9._:@/_-]+$/.test(suppliedKey.trim()))) {
    fail(res, 400, 'invalid_lead');
    return;
  }
  const requestKey = typeof suppliedKey === 'string' && suppliedKey.trim()
    ? suppliedKey.trim()
    : createHash('sha256').update(JSON.stringify([companySlug, name, phone, email.toLowerCase(), serviceType, notes])).digest('hex');

  const mappedBody = {
    public_key: companySlug,
    request_key: requestKey,
    customer: name,
    phone,
    email,
    title: serviceType,
    description: notes || serviceType,
    value: 0,
  };
  await publicIntakeHandler({ ...req, body: mappedBody }, res);
}
