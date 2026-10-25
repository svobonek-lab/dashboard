import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
test('connector UI covers operational states and accessible errors',async()=>{const status=await readFile(new URL('../src/features/manage-integrations/ui/ConnectorStatus.tsx',import.meta.url),'utf8');const setup=await readFile(new URL('../src/features/manage-integrations/ui/ConnectorSetup.tsx',import.meta.url),'utf8');for(const state of ['awaiting_enrollment','mapping_required','dry_run_required','ready','running','success','partial_failure','paused','outdated','revoked'])assert.match(status,new RegExp(state));assert.match(setup,/aria-live/);assert.match(setup,/role="alert"/);assert.match(status,/aria-busy/);assert.match(status,/role="alert"/);});

test('mapping UI uses inspected metadata and requires explicit dry-run approval',async()=>{
  const mapping=await readFile(new URL('../src/features/manage-integrations/ui/ConnectorMapping.tsx',import.meta.url),'utf8');
  assert.match(mapping,/sourceSchema/);
  assert.match(mapping,/Schválit kontrolní běh/);
  assert.match(mapping,/dryRun/);
  assert.match(mapping,/approveMapping/);
  assert.doesNotMatch(mapping,/useState\('leads'\)/);
});
