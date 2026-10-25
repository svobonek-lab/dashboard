import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { suggestCanonicalField } from '../src/features/manage-integrations/model/byodbMapping.js';

test('BYODB field suggestions use only source names and SQL types',()=>{
  assert.deepEqual(suggestCanonicalField({name:'firma_nazev',dataType:'varchar',nullable:false}),{entityType:'company',targetField:'name',conversion:{kind:'text'}});
  assert.deepEqual(suggestCanonicalField({name:'kontakt_email',dataType:'varchar',nullable:true}),{entityType:'lead',targetField:'email',conversion:{kind:'email'}});
  assert.deepEqual(suggestCanonicalField({name:'zakazka_stav',dataType:'varchar',nullable:true}),{entityType:'lead',targetField:'status',conversion:{kind:'text'}});
  assert.deepEqual(suggestCanonicalField({name:'assigned_email',dataType:'varchar',nullable:true}),{entityType:'lead',targetField:'assignedToEmail',conversion:{kind:'email'}});
  assert.equal(suggestCanonicalField({name:'customer_api_token',dataType:'varchar',nullable:true}),undefined);
});

test('connector UI covers operational states and accessible errors',async()=>{const status=await readFile(new URL('../src/features/manage-integrations/ui/ConnectorStatus.tsx',import.meta.url),'utf8');const setup=await readFile(new URL('../src/features/manage-integrations/ui/ConnectorSetup.tsx',import.meta.url),'utf8');for(const state of ['awaiting_enrollment','mapping_required','dry_run_required','ready','running','success','partial_failure','paused','outdated','revoked'])assert.match(status,new RegExp(state));assert.match(setup,/aria-live/);assert.match(setup,/role="alert"/);assert.match(status,/aria-busy/);assert.match(status,/role="alert"/);});

test('mapping UI uses inspected metadata and requires explicit dry-run approval',async()=>{
  const mapping=await readFile(new URL('../src/features/manage-integrations/ui/ConnectorMapping.tsx',import.meta.url),'utf8');
  assert.match(mapping,/sourceSchema/);
  assert.match(mapping,/Schválit kontrolní běh/);
  assert.match(mapping,/dryRun/);
  assert.match(mapping,/approveMapping/);
  assert.doesNotMatch(mapping,/useState\('leads'\)/);
});
