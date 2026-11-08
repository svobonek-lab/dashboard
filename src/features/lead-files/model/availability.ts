const STAGING_PROJECT_REF_PATTERN = /^[a-z0-9]{20}$/;
const PRODUCTION_PROJECT_REF = 'oncmtmrhmjlerbwkrecv';

export function isLeadAttachmentsEnabled(environment: Record<string, unknown>): boolean {
  const enabled = environment.VITE_LEAD_NOTES_FILES_ENABLED === 'true';
  const stagingRef = String(environment.VITE_STAGING_SUPABASE_PROJECT_REF || '').trim();
  const supabaseUrl = String(environment.VITE_SUPABASE_URL || '').trim();

  if (!enabled) return false;

  try {
    const parsed = new URL(supabaseUrl);
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.port || parsed.search || parsed.hash || parsed.pathname !== '/') return false;

    if (STAGING_PROJECT_REF_PATTERN.test(stagingRef) && stagingRef !== PRODUCTION_PROJECT_REF && parsed.hostname === `${stagingRef}.supabase.co`) return true;

    // Client visibility is only a release gate. Database RLS and Storage policies remain authoritative.
    return environment.VITE_PRODUCTION_LEAD_NOTES_FILES_APPROVED === 'true'
      && parsed.hostname === `${PRODUCTION_PROJECT_REF}.supabase.co`;
  } catch {
    return false;
  }
}
