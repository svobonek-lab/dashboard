function httpsOrigin(value, label) {
  const match = /^https:\/\/([a-z0-9.-]+)\/?$/i.exec(String(value || ''));
  if (!match) throw new Error(`Refusing load: ${label} must be an HTTPS origin without credentials, path, port, query or fragment.`);
  return { origin: `https://${match[1].toLowerCase()}`, host: match[1].toLowerCase() };
}

export function validateK6StagingEnvironment(environment) {
  const stagingRef = String(environment.STAGING_SUPABASE_PROJECT_REF || '');
  const productionRef = String(environment.PRODUCTION_SUPABASE_PROJECT_REF || '');
  if (!/^[a-z0-9]{20}$/.test(stagingRef) || !/^[a-z0-9]{20}$/.test(productionRef) || stagingRef === productionRef) {
    throw new Error('Refusing load: staging and production Supabase refs must be distinct.');
  }
  const staging = httpsOrigin(environment.STAGING_SUPABASE_URL, 'staging Supabase URL');
  const preview = httpsOrigin(environment.STAGING_PREVIEW_URL, 'Preview URL');
  const production = httpsOrigin(environment.PRODUCTION_BASE_URL, 'production URL');
  if (staging.host !== `${stagingRef}.supabase.co`
      || !/^dashboard-[a-z0-9-]+-svobonek-6462s-projects\.vercel\.app$/.test(preview.host)
      || preview.origin === production.origin) {
    throw new Error('Refusing load: staging Supabase and Preview must be isolated from production.');
  }
  return { supabaseUrl: staging.origin, previewUrl: preview.origin };
}
