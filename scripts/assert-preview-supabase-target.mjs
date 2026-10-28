import { hasUnexpectedProductionTarget } from './preview-bundle-target.mjs';

export async function assertPreviewSupabaseTarget(previewOrigin, stagingRef, productionRef, fetchImpl = fetch) {
  const htmlResponse = await fetchImpl(`${previewOrigin}/login`, { redirect: 'follow' });
  if (!htmlResponse.ok) throw new Error(`Staging Preview returned HTTP ${htmlResponse.status}.`);
  if (new URL(htmlResponse.url).origin !== previewOrigin) throw new Error('Staging Preview redirected outside its own origin.');
  const html = await htmlResponse.text();
  const scripts = [...html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+\.js)["'][^>]*>/gi)]
    .map((match) => new URL(match[1], previewOrigin).href);
  if (scripts.length === 0) throw new Error('Staging Preview has no inspectable JavaScript bundle.');

  let foundStaging = false;
  for (const scriptUrl of scripts) {
    if (new URL(scriptUrl).origin !== previewOrigin) throw new Error('Staging Preview loads a script outside its own origin.');
    const response = await fetchImpl(scriptUrl, { redirect: 'follow' });
    if (!response.ok) throw new Error(`Staging Preview JavaScript returned HTTP ${response.status}.`);
    if (new URL(response.url).origin !== previewOrigin) throw new Error('Staging Preview JavaScript redirected outside its own origin.');
    const body = await response.text();
    if (hasUnexpectedProductionTarget(body, productionRef)) {
      throw new Error('Refusing staging E2E: Preview JavaScript targets production Supabase.');
    }
    if (body.includes(`${stagingRef}.supabase.co`)) foundStaging = true;
  }
  if (!foundStaging) throw new Error('Refusing staging E2E: Preview JavaScript does not identify the staging Supabase project.');
}
