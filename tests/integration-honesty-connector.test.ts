import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
test('disabled connector is presented honestly without demo success',async()=>{const page=await readFile(new URL('../src/pages/owner/integrations/ui/Integrations.tsx',import.meta.url),'utf8');assert.match(page,/VITE_CONNECTOR_ENABLED === 'true'/);assert.match(page,/není na tomto nasazení aktivovaný/);assert.doesNotMatch(page,/fake|demo connector|úspěšně připojeno/i);});

test('company database is a gated source-of-truth option beside Managed Cloud', async () => {
  const page = await readFile(new URL('../src/pages/owner/integrations/ui/Integrations.tsx', import.meta.url), 'utf8');
  assert.match(page, /Databáze firmy navíc/);
  assert.match(page, /Nemusíte přecházet ze stávající databáze/);
  assert.match(page, /V režimu Managed Cloud zůstává zdrojem Supabase/);
  assert.match(page, /V režimu BYODB je zdrojem vaše schválená firemní mapa/);
  assert.match(page, /zapíší do vaší databáze/);
  assert.match(page, /schválený image digest/);
});

test('BYODB owner profile edits use the source repository and cannot fall through to app_companies writes', async () => {
  const provider = await readFile(new URL('../src/app/providers/OrganizationProvider.tsx', import.meta.url), 'utf8');
  const start = provider.indexOf('const updateBrandingAdmin =');
  const end = provider.indexOf('const suspendOrganizationAdmin =', start);
  const update = provider.slice(start, end);
  assert.match(update, /await crmRepo\.repository\(targetOrgId\) === 'byodb'[\s\S]+await crmRepo\.saveBranding\(targetOrgId/);
  assert.ok(update.indexOf("await crmRepo.saveBranding(targetOrgId") < update.indexOf("supabase.from('app_companies').update(appRecord)"));
  assert.match(update, /return;[\s\S]+supabase\.from\('app_companies'\)\.update/);
});
