import { createServerlessSupabaseClient } from './_shared/supabaseClient.js';
import { createAiInboxToken } from './_shared/aiInboxToken.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

interface IncomingLeadConfigDependencies {
  authorizeOwner: (accessToken: string, companyId: string) => Promise<boolean>;
  sign: (companyId: string) => string;
  appOrigin: string;
}

export function createIncomingLeadConfigHandler(dependencies: IncomingLeadConfigDependencies) {
  return async function incomingLeadConfigHandler(req: any, res: any) {
    if (req.method !== 'GET') {
      res.status(405).json({ error: 'Method Not Allowed. Use GET.' });
      return;
    }
    const parsedUrl = new URL(String(req.url || '/api/incoming-lead-config'), 'https://internal.invalid');
    const companyId = String(
      req.query?.org_id
      || req.query?.companyId
      || parsedUrl.searchParams.get('org_id')
      || parsedUrl.searchParams.get('companyId')
      || '',
    ).trim();
    const accessToken = String(req.headers?.authorization || req.headers?.Authorization || '').replace(/^Bearer\s+/i, '').trim();
    if (!UUID.test(companyId) || !accessToken) {
      res.status(400).json({ error: 'Chybí platná firma nebo přihlášení.' });
      return;
    }
    if (!await dependencies.authorizeOwner(accessToken, companyId)) {
      res.status(403).json({ error: 'Webhook může zobrazit pouze majitel firmy.' });
      return;
    }
    const token = dependencies.sign(companyId);
    const webhookUrl = `${dependencies.appOrigin}/api/incoming-lead?org_id=${encodeURIComponent(companyId)}&token=${encodeURIComponent(token)}`;
    res.status(200).json({ webhookUrl });
  };
}

function getOrigin(): string {
  const configured = String(process.env.APP_URL || '').trim().replace(/\/$/, '');
  const parsed = new URL(configured);
  if (parsed.protocol !== 'https:' || parsed.pathname !== '/' || parsed.search || parsed.hash) {
    throw new Error('APP_URL must be an HTTPS origin.');
  }
  return parsed.origin;
}

async function authorizeOwner(accessToken: string, companyId: string): Promise<boolean> {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !anonKey || !serviceKey) throw new Error('AI inbox server is not configured.');
  const auth = createServerlessSupabaseClient(supabaseUrl, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: authData, error: authError } = await auth.auth.getUser(accessToken);
  if (authError || !authData.user) return false;
  const service = createServerlessSupabaseClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await service.from('app_members').select('role').eq('company_id', companyId)
    .eq('user_id', authData.user.id).eq('active', true).maybeSingle();
  return !error && data?.role === 'owner';
}

let defaultHandler: ReturnType<typeof createIncomingLeadConfigHandler> | null = null;

export default async function incomingLeadConfigHandler(req: any, res: any) {
  try {
    if (!defaultHandler) {
      const secret = String(process.env.AI_INBOX_SIGNING_SECRET || '');
      defaultHandler = createIncomingLeadConfigHandler({
        authorizeOwner,
        sign: (companyId) => createAiInboxToken(companyId, secret),
        appOrigin: getOrigin(),
      });
    }
    return await defaultHandler(req, res);
  } catch (error) {
    console.error('AI inbox config failed:', error instanceof Error ? error.message : 'unknown error');
    res.status(503).json({ error: 'AI inbox zatím není na tomto prostředí aktivovaný.' });
  }
}
