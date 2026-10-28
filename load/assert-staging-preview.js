import http from 'k6/http';

export function assertK6StagingPreviewTarget(previewOrigin, stagingRef, productionRef) {
  const headers = __ENV.STAGING_PREVIEW_BYPASS_TOKEN
    ? { 'x-vercel-protection-bypass': __ENV.STAGING_PREVIEW_BYPASS_TOKEN }
    : {};
  const page = http.get(`${previewOrigin}/login`, { headers, redirects: 0 });
  if (page.status !== 200) throw new Error('Refusing load: staging Preview login is unavailable.');

  const scriptPattern = /<script\b[^>]*\bsrc=["']([^"']+\.js)["'][^>]*>/gi;
  const scriptUrls = [];
  let match;
  while ((match = scriptPattern.exec(String(page.body || ''))) !== null) {
    const path = match[1];
    if (!/^\/assets\/[a-z0-9_./-]+\.js$/i.test(path) || path.includes('..')) {
      throw new Error('Refusing load: Preview JavaScript path is not a local asset.');
    }
    scriptUrls.push(`${previewOrigin}${path}`);
  }
  if (scriptUrls.length === 0) throw new Error('Refusing load: Preview has no inspectable JavaScript bundle.');

  let foundStaging = false;
  for (const scriptUrl of scriptUrls) {
    const script = http.get(scriptUrl, { headers, redirects: 0 });
    if (script.status !== 200) throw new Error('Refusing load: Preview JavaScript is unavailable.');
    const body = String(script.body || '');
    if (body.includes(`${productionRef}.supabase.co`)) {
      throw new Error('Refusing load: Preview JavaScript targets production Supabase.');
    }
    if (body.includes(`${stagingRef}.supabase.co`)) foundStaging = true;
  }
  if (!foundStaging) throw new Error('Refusing load: Preview JavaScript does not target staging Supabase.');
}
