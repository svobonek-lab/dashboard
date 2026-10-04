import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
test('connector UI covers operational states and accessible errors',async()=>{const status=await readFile(new URL('../components/integrations/ConnectorStatus.tsx',import.meta.url),'utf8');const setup=await readFile(new URL('../components/integrations/ConnectorSetup.tsx',import.meta.url),'utf8');for(const state of ['awaiting_enrollment','mapping_required','dry_run_required','ready','running','success','partial_failure','paused','outdated','revoked'])assert.match(status,new RegExp(state));assert.match(setup,/aria-live/);assert.match(setup,/role="alert"/);});
