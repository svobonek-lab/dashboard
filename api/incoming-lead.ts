import { createHash } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { generateGeminiResponse } from '../lib/gemini.js';
import { verifyAiInboxToken } from './_shared/aiInboxToken.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_MAIL_LENGTH = 50_000;

export interface AiLeadExtraction {
  is_lead: boolean;
  client_name: string | null;
  phone: string | null;
  job_type: string;
  description: string;
  location: string | null;
}

interface PersistedAiLead extends AiLeadExtraction {
  companyId: string;
  requestKey: string;
  source: 'ai_inbox';
  status: 'new';
}

interface IncomingLeadDependencies {
  authorize?: (req: any, companyId: string) => boolean;
  classify: (prompt: string, textBody: string) => Promise<string>;
  persist: (lead: PersistedAiLead) => Promise<string>;
}

function firstNonEmptyString(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value !== 'string') continue;
    const normalized = value.trim();
    if (normalized) return normalized;
  }
  return '';
}

export function extractIncomingEmailText(body: unknown): string {
  if (!body || typeof body !== 'object') return '';
  const payload = body as Record<string, unknown>;
  const subject = firstNonEmptyString(payload.subject, payload.Subject);
  const message = firstNonEmptyString(
    payload.text,
    payload.text_body,
    payload['stripped-text'],
    payload.stripped_text,
  );
  if (subject && message) return `Předmět: ${subject}\n\n${message}`;
  if (subject) return `Předmět: ${subject}`;
  return message;
}

function boundedString(value: unknown, max: number, nullable = false): string | null {
  if (value === null && nullable) return null;
  if (typeof value !== 'string') throw new Error('AI odpověď má neplatný formát.');
  const normalized = value.trim();
  if (normalized.length > max) throw new Error('AI odpověď překročila povolenou délku.');
  return normalized || (nullable ? null : '');
}

export function buildAiLeadPrompt(): string {
  return `Rozhodni, zda text obsahuje skutečnou poptávku po stavební práci nebo cenové nabídce.
Vrať pouze striktní JSON bez dalšího textu v přesném tvaru:
{"is_lead":boolean,"client_name":string|null,"phone":string|null,"job_type":string,"description":string,"location":string|null}
Nevymýšlej chybějící údaje. Pokud text není poptávka, nastav is_lead na false a ostatní textová pole na prázdný řetězec nebo null.`;
}

export function parseAiLeadResponse(raw: string): AiLeadExtraction {
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw.trim()) as Record<string, unknown>;
  } catch {
    throw new Error('AI vrátila neplatný JSON.');
  }
  if (typeof parsed?.is_lead !== 'boolean') throw new Error('AI vrátila neplatný výsledek klasifikace.');
  const expectedKeys = ['client_name', 'description', 'is_lead', 'job_type', 'location', 'phone'];
  const actualKeys = Object.keys(parsed).sort();
  if (actualKeys.length !== expectedKeys.length || actualKeys.some((key, index) => key !== expectedKeys[index])) {
    throw new Error('AI odpověď neodpovídá povolenému JSON kontraktu.');
  }
  const result: AiLeadExtraction = {
    is_lead: parsed.is_lead,
    client_name: boundedString(parsed.client_name, 160, true),
    phone: boundedString(parsed.phone, 60, true),
    job_type: boundedString(parsed.job_type, 160) as string,
    description: boundedString(parsed.description, 4_000) as string,
    location: boundedString(parsed.location, 500, true),
  };
  if (result.is_lead && (!result.job_type || !result.description)) {
    throw new Error('AI výsledek neobsahuje povinný typ práce a popis.');
  }
  return result;
}

function requestKeyFor(headers: Record<string, unknown> | undefined, companyId: string, textBody: string): string {
  const supplied = String(headers?.['x-idempotency-key'] || headers?.['X-Idempotency-Key'] || '').trim();
  if (supplied) {
    if (supplied.length > 160 || !/^[A-Za-z0-9._:@/+\-=]+$/.test(supplied)) throw new Error('Neplatný idempotency key.');
    return supplied;
  }
  return createHash('sha256').update(companyId).update('\0').update(textBody).digest('hex');
}

async function persistAiLead(input: PersistedAiLead): Promise<string> {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) throw new Error('AI inbox není nakonfigurovaný.');
  const service = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await service.rpc('app_submit_ai_inbox_lead', {
    p_company_id: input.companyId,
    p_request_key: input.requestKey,
    p_customer: input.client_name || 'Zájemce z e-mailu',
    p_phone: input.phone || '',
    p_title: input.job_type,
    p_description: input.description,
    p_location: input.location || '',
  });
  if (error || typeof data !== 'string') throw new Error(error?.message || 'AI poptávku se nepodařilo uložit.');
  return data;
}

export function createIncomingLeadHandler(dependencies: IncomingLeadDependencies) {
  return async function incomingLeadHandler(req: any, res: any) {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method Not Allowed. Use POST.' });
      return;
    }
    const textBody = extractIncomingEmailText(req.body);
    const parsedUrl = new URL(String(req.url || '/api/incoming-lead'), 'https://internal.invalid');
    const companyId = String(req.body?.org_id || req.query?.org_id || parsedUrl.searchParams.get('org_id') || '').trim();
    if (!UUID.test(companyId) || !textBody) {
      res.status(400).json({ error: 'Požadavek vyžaduje platné org_id a neprázdný předmět nebo text e-mailu.' });
      return;
    }
    if (textBody.length > MAX_MAIL_LENGTH) {
      res.status(413).json({ error: 'E-mail je příliš dlouhý. Limit je 50 000 znaků.' });
      return;
    }
    if (dependencies.authorize && !dependencies.authorize(req, companyId)) {
      res.status(401).json({ error: 'Webhook podpis není platný.' });
      return;
    }

    try {
      const extracted = parseAiLeadResponse(await dependencies.classify(buildAiLeadPrompt(), textBody));
      if (!extracted.is_lead) {
        res.status(200).json({ status: 'ignored' });
        return;
      }
      const leadId = await dependencies.persist({
        ...extracted,
        companyId,
        requestKey: requestKeyFor(req.headers, companyId, textBody),
        source: 'ai_inbox',
        status: 'new',
      });
      res.status(201).json({ status: 'created', lead_id: leadId });
    } catch (error) {
      console.error('Incoming lead processing failed:', error instanceof Error ? error.message : 'unknown error');
      res.status(502).json({ error: 'E-mail se nepodařilo bezpečně zpracovat.' });
    }
  };
}

function authorizeIncomingLead(req: any, companyId: string): boolean {
  const secret = String(process.env.AI_INBOX_SIGNING_SECRET || '');
  if (!secret && process.env.NODE_ENV === 'development' && !process.env.VERCEL_ENV) {
    console.warn('AI_INBOX_SIGNING_SECRET není nastavený; nepodepsaný webhook je povolený pouze v lokálním vývoji.');
    return true;
  }
  const url = new URL(String(req.url || '/api/incoming-lead'), 'https://internal.invalid');
  const token = String(req.query?.token || req.body?.webhook_token || url.searchParams.get('token') || '').trim();
  return verifyAiInboxToken(companyId, token, secret);
}

export default createIncomingLeadHandler({ authorize: authorizeIncomingLead, classify: generateGeminiResponse, persist: persistAiLead });
