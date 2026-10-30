import { createHmac } from 'node:crypto';
import { isIP } from 'node:net';
import { createServerlessSupabaseClient } from './_shared/supabaseClient.js';

const FIELD_LIMITS = { customer: 120, phone: 30, email: 254, title: 120, description: 4_000, public_key: 120, request_key: 120 } as const;

type PublicIntakeInput = {
  publicKey: string;
  requestKey: string;
  customer: string;
  phone: string;
  email: string;
  title: string;
  description: string;
  value: number;
  clientIpHash: string;
};

type Dependencies = {
  hashSecret?: string;
  submit?: (input: PublicIntakeInput) => Promise<string | null>;
};

function normalizedHeader(headers: Record<string, unknown> | undefined, name: string): string {
  const value = headers?.[name] ?? headers?.[name.toUpperCase()];
  return Array.isArray(value) ? String(value[0] ?? '') : typeof value === 'string' ? value : '';
}

/** Vercel overwrites x-forwarded-for at its edge; never accept a body/query IP. */
export function readTrustedClientIp(headers: Record<string, unknown> | undefined): string | null {
  const forwarded = normalizedHeader(headers, 'x-forwarded-for').trim();
  const candidate = forwarded.split(',', 1)[0]?.trim() ?? '';
  return isIP(candidate) ? candidate : null;
}

export function hashClientIp(ip: string, secret: string): string {
  return createHmac('sha256', secret).update(ip).digest('hex');
}

function parseInput(body: unknown): Omit<PublicIntakeInput, 'clientIpHash'> | null {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
  const value = body as Record<string, unknown>;
  const stringFields = Object.keys(FIELD_LIMITS) as Array<keyof typeof FIELD_LIMITS>;
  for (const field of stringFields) {
    if (typeof value[field] !== 'string' || (value[field] as string).trim().length > FIELD_LIMITS[field]) return null;
  }
  const publicKey = (value.public_key as string).trim().toLowerCase();
  const requestKey = (value.request_key as string).trim();
  const customer = (value.customer as string).trim();
  const phone = (value.phone as string).trim();
  const email = (value.email as string).trim();
  const title = (value.title as string).trim();
  const description = (value.description as string).trim();
  const amount = value.value;
  if (!/^[a-z0-9][a-z0-9-]*$/.test(publicKey) || !/^[A-Za-z0-9._:@/_-]+$/.test(requestKey)) return null;
  if (!customer || !phone || !title || !description || !requestKey) return null;
  if (email && !/^\S+@\S+\.\S+$/.test(email)) return null;
  if (typeof amount !== 'number' || !Number.isFinite(amount) || amount < 0 || amount > 1_000_000_000) return null;
  return { publicKey, requestKey, customer, phone, email, title, description, value: amount };
}

async function submitToSupabase(input: PublicIntakeInput): Promise<string | null> {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error('public intake server is not configured');
  const supabase = createServerlessSupabaseClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await supabase.rpc('app_submit_public_lead', {
    p_public_key: input.publicKey,
    p_request_key: input.requestKey,
    p_customer: input.customer,
    p_phone: input.phone,
    p_email: input.email || null,
    p_title: input.title,
    p_description: input.description,
    p_value: input.value,
    p_client_ip_hash: input.clientIpHash,
  });
  if (error) {
    if (error.code === '54000') throw Object.assign(new Error('rate limited'), { statusCode: 429 });
    throw new Error('public intake submission failed');
  }
  return typeof data === 'string' ? data : null;
}

export function createPublicIntakeHandler(dependencies: Dependencies = {}) {
  return async function publicIntakeHandler(req: any, res: any) {
    res.setHeader?.('Cache-Control', 'no-store');
    res.setHeader?.('Access-Control-Allow-Origin', '*');
    res.setHeader?.('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader?.('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader?.('Vary', 'Origin');
    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }
    if (req.method !== 'POST') {
      res.setHeader?.('Allow', 'POST, OPTIONS');
      res.status(405).json({ error: 'method_not_allowed' });
      return;
    }

    const body = req.body as Record<string, unknown> | null;
    // Honeypot submissions look accepted to bots and never touch the database.
    if (body && typeof body === 'object' && typeof body.website === 'string' && body.website.trim()) {
      res.status(202).json({ status: 'accepted' });
      return;
    }

    const hashSecret = dependencies.hashSecret ?? process.env.INTAKE_HASH_SECRET;
    const clientIp = readTrustedClientIp(req.headers);
    if (!hashSecret || hashSecret.length < 32 || !clientIp) {
      res.status(503).json({ error: 'public_intake_unavailable' });
      return;
    }
    const input = parseInput(req.body);
    if (!input) {
      res.status(400).json({ error: 'invalid_public_intake' });
      return;
    }

    try {
      const submit = dependencies.submit ?? submitToSupabase;
      await submit({ ...input, clientIpHash: hashClientIp(clientIp, hashSecret) });
      res.status(200).json({ status: 'accepted' });
    } catch (error) {
      if ((error as { statusCode?: number }).statusCode === 429) {
        res.setHeader?.('Retry-After', '600');
        res.status(429).json({ error: 'rate_limited' });
        return;
      }
      res.status(503).json({ error: 'public_intake_unavailable' });
    }
  };
}

export default createPublicIntakeHandler();
