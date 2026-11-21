export function canWritePilot(env: Record<string, unknown>): boolean {
  return env.VITE_PILOT_WRITES === 'true'
    && env.VITE_SUPABASE_URL === 'https://xwzweltjvreqhjpbjrxa.supabase.co';
}

export function canWriteStagingLeadStatus(env: Record<string, unknown>): boolean {
  return env.VITE_STAGING_LEAD_STATUS_WRITES === 'true'
    && env.VITE_SUPABASE_URL === 'https://xwzweltjvreqhjpbjrxa.supabase.co';
}

export function canWriteAppLeads(env: Record<string, unknown>): boolean {
  if (env.VITE_APP_LEAD_WRITES !== 'true') return false;
  return env.VITE_SUPABASE_URL === 'https://xwzweltjvreqhjpbjrxa.supabase.co'
    || (env.VITE_SUPABASE_URL === 'https://oncmtmrhmjlerbwkrecv.supabase.co'
      && env.VITE_PRODUCTION_APP_LEAD_WRITES_APPROVED === 'true');
}
