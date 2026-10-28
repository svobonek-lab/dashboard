const STAGING_PROJECT_REF_PATTERN = /^[a-z0-9]{20}$/;

export function isLeadAttachmentsEnabled(environment: Record<string, unknown>): boolean {
  const enabled = environment.VITE_LEAD_NOTES_FILES_ENABLED === 'true';
  const stagingRef = String(environment.VITE_STAGING_SUPABASE_PROJECT_REF || '').trim();
  const supabaseUrl = String(environment.VITE_SUPABASE_URL || '').trim();

  if (!enabled || !STAGING_PROJECT_REF_PATTERN.test(stagingRef)) return false;

  try {
    const parsed = new URL(supabaseUrl);
    return parsed.protocol === 'https:'
      && parsed.hostname === `${stagingRef}.supabase.co`
      && !parsed.username
      && !parsed.password
      && !parsed.port
      && !parsed.search
      && !parsed.hash;
  } catch {
    return false;
  }
}
