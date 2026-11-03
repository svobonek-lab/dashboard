import { createServerlessSupabaseClient } from './_shared/supabaseClient.js';

export function mapInviteRpcError(error: { message?: unknown; details?: unknown } | null | undefined) {
  const code = typeof error?.message === 'string' ? error.message : '';
  if (code === 'SEAT_LIMIT_REACHED') {
    return {
      status: 409,
      body: {
        code,
        error: typeof error?.details === 'string' && error.details.trim()
          ? error.details
          : 'Firma dosáhla limitu zaměstnanců pro svůj tarif. Zrušte nevyužitou pozvánku nebo změňte tarif.',
      },
    };
  }
  if (code === 'SEAT_LIMIT_PLAN_UNSUPPORTED') {
    return {
      status: 409,
      body: {
        code,
        error: typeof error?.details === 'string' && error.details.trim()
          ? error.details
          : 'Pro tento tarif nelze přidat zaměstnance. Nastavte podporovaný tarif.',
      },
    };
  }
  return {
    status: 502,
    body: { error: 'Pozvánku se nepodařilo připravit.', code: 'APP_INVITE_CREATE_FAILED' },
  };
}

function getAuthRedirectUrl(rawUrl: string | undefined): string | null {
  try {
    const url = new URL(String(rawUrl || ''));
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || (url.pathname !== '/' && url.pathname !== '')) return null;
    url.pathname = '/login';
    return url.toString();
  } catch {
    return null;
  }
}

export default async function inviteEmployeeHandler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed. Use POST.' });
    return;
  }

  if (process.env.APP_INVITE_WORKER_ENABLED !== 'true') {
    res.status(503).json({ error: 'Pozvánky nejsou na tomto deploymentu aktivované.', code: 'APP_INVITE_WORKER_DISABLED' });
    return;
  }
  const authHeader = String(req.headers?.authorization || req.headers?.Authorization || '');
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  const companyId = String(req.body?.companyId || '').trim();
  const email = String(req.body?.email || '').trim().toLowerCase();
  const name = String(req.body?.name || '').trim().slice(0, 160);
  if (!token || !companyId || !email || !/^\S+@\S+\.\S+$/.test(email)) {
    res.status(400).json({ error: 'Pozvánka vyžaduje přihlášený účet, firmu a platný e-mail.' });
    return;
  }
  const redirectTo = getAuthRedirectUrl(process.env.APP_URL);
  if (!redirectTo) {
    res.status(503).json({ error: 'Pozvánky nemají bezpečnou cílovou adresu aplikace.', code: 'AUTH_REDIRECT_CONFIG_MISSING' });
    return;
  }
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !anonKey || !serviceKey) {
    res.status(503).json({ error: 'Pozvánky nemají nakonfigurované stagingové Supabase klíče.', code: 'APP_INVITE_CONFIG_MISSING' });
    return;
  }
  const authClient = createServerlessSupabaseClient(supabaseUrl, anonKey, {
    auth: { persistSession: false }, global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: authData, error: authError } = await authClient.auth.getUser(token);
  if (authError || !authData.user) {
    res.status(401).json({ error: 'Přihlášení pro pozvánku není platné.' });
    return;
  }
  const serviceClient = createServerlessSupabaseClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const { data: member, error: memberError } = await serviceClient
    .from('app_members')
    .select('role')
    .eq('company_id', companyId)
    .eq('user_id', authData.user.id)
    .eq('active', true)
    .maybeSingle();
  if (memberError || member?.role !== 'owner') {
    res.status(403).json({ error: 'Pozvánku může odeslat pouze aktivní majitel firmy.' });
    return;
  }
  const { data: company, error: companyError } = await serviceClient
    .from('app_companies')
    .select('name')
    .eq('id', companyId)
    .eq('active', true)
    .maybeSingle();
  if (companyError || !company?.name) {
    res.status(404).json({ error: 'Aktivní firma pro pozvánku nebyla nalezena.' });
    return;
  }
  const { data: inviteId, error: inviteError } = await authClient.rpc('app_create_invite', {
    p_company_id: companyId,
    p_email: email,
    p_name: name || email,
  });
  if (inviteError || !inviteId) {
    const mapped = mapInviteRpcError(inviteError);
    res.status(mapped.status).json(mapped.body);
    return;
  }
  const { data: queuedInvite, error: queueError } = await serviceClient
    .from('app_email_outbox').select('id,status,last_error').eq('invite_id', inviteId).eq('notification_kind', 'auth_invite').maybeSingle();
  if (queueError || !queuedInvite) {
    res.status(502).json({
      error: 'Pozvánku se nepodařilo bezpečně zařadit k odeslání. Zkuste to znovu.',
      code: 'APP_INVITE_QUEUE_FAILED',
    });
    return;
  }
  if (!['pending', 'retry', 'processing', 'sending'].includes(String(queuedInvite.status))) {
    const reviewRequired = ['AUTH_INVITE_USER_REVIEW_REQUIRED', 'AUTH_INVITE_SCOPE_MISMATCH'].includes(String(queuedInvite.last_error));
    res.status(reviewRequired ? 409 : 503).json({
      error: reviewRequired ? 'Pozvánka vyžaduje bezpečnostní kontrolu správce.' : 'Pozvánka není připravena k odeslání.',
      code: reviewRequired ? 'APP_INVITE_REVIEW_REQUIRED' : 'APP_INVITE_NOT_QUEUED',
    });
    return;
  }
  res.status(200).json({ invited: true, invitationStatus: 'queued', inviteId, expiresInDays: 7 });
}
