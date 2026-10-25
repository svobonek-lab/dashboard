import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
test('connector setup stays actionable without presenting an unverified link as live',async()=>{const page=await readFile(new URL('../src/pages/owner/integrations/ui/Integrations.tsx',import.meta.url),'utf8');assert.doesNotMatch(page,/VITE_CONNECTOR_ENABLED === 'true'/);assert.match(page,/Připojit vlastní databázi/);assert.match(page,/Databáze zatím není připojená/);assert.doesNotMatch(page,/fake|demo connector|úspěšně připojeno/i);});

test('company database is a gated source-of-truth option beside Managed Cloud', async () => {
  const page = await readFile(new URL('../src/pages/owner/integrations/ui/Integrations.tsx', import.meta.url), 'utf8');
  assert.match(page, /Vlastní firemní databáze \(Synology \/ On-Premise\)/);
  assert.match(page, /Ponechte si svůj PostgreSQL, MariaDB \/ MySQL nebo Microsoft SQL Server/);
  assert.match(page, /schválení/);
  assert.match(page, /vydání ověřeného image digestu/);
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
