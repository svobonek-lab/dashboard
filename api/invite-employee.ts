import { createClient } from '@supabase/supabase-js';

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
  const authClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false }, global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: authData, error: authError } = await authClient.auth.getUser(token);
  if (authError || !authData.user) {
    res.status(401).json({ error: 'Přihlášení pro pozvánku není platné.' });
    return;
  }
  const serviceClient = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
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
    res.status(502).json({ error: 'Pozvánku se nepodařilo připravit.', code: 'APP_INVITE_CREATE_FAILED' });
    return;
  }
  const { error: authInviteError } = await serviceClient.auth.admin.inviteUserByEmail(email, {
    data: { company_id: companyId, invite_id: inviteId, role: 'employee', name: name || email, company_name: company.name },
    redirectTo,
  });
  if (authInviteError) {
    await serviceClient.from('app_invites').delete().eq('id', inviteId).eq('company_id', companyId).is('accepted_at', null);
    res.status(502).json({
      error: 'E-mailovou pozvánku nelze odeslat. Ověřte vlastní SMTP v Supabase a zkuste to znovu.',
      code: 'APP_INVITE_DELIVERY_UNAVAILABLE',
    });
    return;
  }
  res.status(200).json({ invited: true, inviteId, expiresInDays: 7 });
}
