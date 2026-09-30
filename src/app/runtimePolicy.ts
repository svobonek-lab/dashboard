export interface RuntimePolicy {
  production: boolean;
  supabaseConfigured: boolean;
  appSchemaReads: boolean;
  allowLocalMockAuth: boolean;
  allowLocalDataFallback: boolean;
  failClosedMessage: string;
}

const FAIL_CLOSED_MESSAGE = 'Produkční workspace není dostupný. Ověřte připojení a kontaktujte podporu.';

export function getRuntimePolicy(env: Record<string, unknown> = {}): RuntimePolicy {
  const production = Boolean(env.PROD);
  const supabaseConfigured = Boolean(env.VITE_SUPABASE_URL && env.VITE_SUPABASE_ANON_KEY);
  const appSchemaReads = String(env.VITE_APP_SCHEMA_READS || '').toLowerCase() === 'true';
  return {
    production,
    supabaseConfigured,
    appSchemaReads,
    allowLocalMockAuth: !production,
    allowLocalDataFallback: !production,
    failClosedMessage: FAIL_CLOSED_MESSAGE,
  };
}

export function shouldFailClosed(policy: RuntimePolicy, error?: { code?: string; message?: string } | null): boolean {
  if (!policy.production) return false;
  if (!error) return !policy.supabaseConfigured;
  return true;
}
