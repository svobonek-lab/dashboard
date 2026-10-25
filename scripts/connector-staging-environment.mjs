const projectRefPattern = /^[a-z0-9]{20}$/;

export function assertIsolatedStagingProject(environment) {
  const stagingUrlValue = String(environment.STAGING_SUPABASE_URL || '').trim();
  const stagingProjectRef = String(environment.STAGING_SUPABASE_PROJECT_REF || '').trim();
  const productionProjectRef = String(environment.PRODUCTION_SUPABASE_PROJECT_REF || '').trim();

  if (!projectRefPattern.test(stagingProjectRef)) {
    throw new Error('STAGING_SUPABASE_PROJECT_REF must be a 20-character Supabase project ref.');
  }
  if (!projectRefPattern.test(productionProjectRef)) {
    throw new Error('PRODUCTION_SUPABASE_PROJECT_REF must be a 20-character Supabase project ref.');
  }
  if (stagingProjectRef === productionProjectRef) {
    throw new Error('Staging Supabase project ref must be different from production.');
  }

  let stagingUrl;
  try {
    stagingUrl = new URL(stagingUrlValue);
  } catch {
    throw new Error('STAGING_SUPABASE_URL must be a valid HTTPS Supabase project URL.');
  }
  if (stagingUrl.protocol !== 'https:' || stagingUrl.hostname !== `${stagingProjectRef}.supabase.co`) {
    throw new Error('STAGING_SUPABASE_URL does not match the staging project ref.');
  }

  return { stagingUrl: stagingUrl.toString(), stagingProjectRef };
}
