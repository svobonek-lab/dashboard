import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
test('disabled connector is presented honestly without demo success',async()=>{const page=await readFile(new URL('../src/pages/owner/integrations/ui/Integrations.tsx',import.meta.url),'utf8');assert.match(page,/VITE_CONNECTOR_ENABLED === 'true'/);assert.match(page,/není na tomto nasazení aktivovaný/);assert.doesNotMatch(page,/fake|demo connector|úspěšně připojeno/i);});

test('company database is an optional read-only addition to StavbaFlow', async () => {
  const page = await readFile(new URL('../src/pages/owner/integrations/ui/Integrations.tsx', import.meta.url), 'utf8');
  assert.match(page, /Databáze firmy navíc/);
  assert.match(page, /Nemusíte přecházet ze stávající databáze/);
  assert.match(page, /StavbaFlow dál používá svou databázi/);
  assert.match(page, /pouze čte mapovaná data/);
  assert.match(page, /Do zdrojové databáze nikdy nezapisuje/);
});
