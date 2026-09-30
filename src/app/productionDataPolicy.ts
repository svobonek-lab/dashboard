export const APP_SCHEMA_WRITES_BLOCKED_MESSAGE =
  'Produkční datový zápis čeká na ověření RLS a bezpečných RPC funkcí.';

export function isAppSchemaReadsEnabled(env: Record<string, unknown> = {}): boolean {
  return String(env.VITE_APP_SCHEMA_READS || '').toLowerCase() === 'true';
}

export function shouldBlockLegacyWrites(env: Record<string, unknown> = {}): boolean {
  // A configured production client must never write to the historical schema.
  // The feature flag remains useful for local/staging rehearsal, but production
  // is fail-closed even when an old deployment omitted the flag.
  return Boolean(env.PROD) || isAppSchemaReadsEnabled(env);
}
