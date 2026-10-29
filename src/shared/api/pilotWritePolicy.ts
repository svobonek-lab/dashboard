export function canWritePilot(env: Record<string, unknown>): boolean {
  return env.VITE_PILOT_WRITES === 'true'
    && env.VITE_SUPABASE_URL === 'https://xwzweltjvreqhjpbjrxa.supabase.co';
}

export function canWriteStagingLeadStatus(env: Record<string, unknown>): boolean {
  return env.VITE_STAGING_LEAD_STATUS_WRITES === 'true'
    && env.VITE_SUPABASE_URL === 'https://xwzweltjvreqhjpbjrxa.supabase.co';
}
