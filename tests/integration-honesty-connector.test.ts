import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
test('disabled connector is presented honestly without demo success',async()=>{const page=await readFile(new URL('../src/pages/owner/Integrations.tsx',import.meta.url),'utf8');assert.match(page,/VITE_CONNECTOR_ENABLED === 'true'/);assert.match(page,/není na tomto nasazení aktivovaný/);assert.doesNotMatch(page,/fake|demo connector|úspěšně připojeno/i);});
