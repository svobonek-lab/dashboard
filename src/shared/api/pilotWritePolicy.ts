export function canWritePilot(env: Record<string, unknown>): boolean {
  return env.VITE_PILOT_WRITES === 'true'
    && env.VITE_SUPABASE_URL === 'https://xwzweltjvreqhjpbjrxa.supabase.co';
}

export function canWriteStagingLeadStatus(env: Record<string, unknown>): boolean {
  return env.VITE_STAGING_LEAD_STATUS_WRITES === 'true'
    && env.VITE_SUPABASE_URL === 'https://xwzweltjvreqhjpbjrxa.supabase.co';
}

export function canWriteAppLeads(env: Record<string, unknown>): boolean {
  const raw = env.VITE_SUPABASE_URL;
  if (env.VITE_APP_LEAD_WRITES !== 'true' || typeof raw !== 'string') return false;
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:' || raw !== url.origin || url.port) return false;
    return url.hostname === 'xwzweltjvreqhjpbjrxa.supabase.co'
      || (url.hostname === 'oncmtmrhmjlerbwkrecv.supabase.co'
        && env.VITE_PRODUCTION_APP_LEAD_WRITES_APPROVED === 'true');
  } catch {
    return false;
  }
}
