import { createServerlessSupabaseClient } from './_shared/supabaseClient.js';

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

export default async function resetEmployeePasswordHandler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed. Use POST.' });
    return;
  }

  if (process.env.APP_AUTH_RECOVERY_ENABLED !== 'true') {
    res.status(503).json({ error: 'Obnova hesla není na tomto deploymentu aktivovaná.', code: 'AUTH_RECOVERY_DISABLED' });
    return;
  }
  const email = String(req.body?.email || '').trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    res.status(400).json({ error: 'Zadejte platný e-mail.' });
    return;
  }
  const redirectTo = getAuthRedirectUrl(process.env.APP_URL);
  if (!redirectTo) {
    res.status(503).json({ error: 'Obnova hesla nemá bezpečnou cílovou adresu aplikace.', code: 'AUTH_REDIRECT_CONFIG_MISSING' });
    return;
  }
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) {
    res.status(503).json({ error: 'Auth recovery nemá nakonfigurovaný stagingový Supabase projekt.', code: 'AUTH_RECOVERY_CONFIG_MISSING' });
    return;
  }
  const client = createServerlessSupabaseClient(supabaseUrl, anonKey, { auth: { persistSession: false } });
  const { error } = await client.auth.resetPasswordForEmail(email, {
    redirectTo,
  });
  if (error) {
    res.status(502).json({ error: 'Obnovu hesla se nepodařilo zahájit.', code: 'AUTH_RECOVERY_FAILED' });
    return;
  }
  res.status(200).json({
    requested: true,
    message: 'Pokud účet existuje, přijde na něj odkaz pro obnovu hesla.',
  });
}
