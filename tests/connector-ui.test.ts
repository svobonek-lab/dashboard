import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { suggestCanonicalField } from '../src/features/manage-integrations/model/byodbMapping.js';
import { buildConnectorMapping } from '../src/features/manage-integrations/model/buildConnectorMapping.js';
import { buildConnectorPackage } from '../src/features/manage-integrations/model/buildConnectorPackage.js';
import JSZip from 'jszip';

test('BYODB field suggestions use only source names and SQL types',()=>{
  assert.deepEqual(suggestCanonicalField({name:'firma_nazev',dataType:'varchar',nullable:false}),{entityType:'company',targetField:'name',conversion:{kind:'text'}});
  assert.deepEqual(suggestCanonicalField({name:'kontakt_email',dataType:'varchar',nullable:true}),{entityType:'lead',targetField:'email',conversion:{kind:'email'}});
  assert.deepEqual(suggestCanonicalField({name:'zakazka_stav',dataType:'varchar',nullable:true}),{entityType:'lead',targetField:'status',conversion:{kind:'text'}});
  assert.deepEqual(suggestCanonicalField({name:'assigned_email',dataType:'varchar',nullable:true}),{entityType:'lead',targetField:'assignedToEmail',conversion:{kind:'email'}});
  assert.equal(suggestCanonicalField({name:'customer_api_token',dataType:'varchar',nullable:true}),undefined);
});

test('mapping cannot be saved until the entity required field is mapped', () => {
  const mapping = { mappingVersion: 1, entityType: 'lead' as const, sourceSystem: 'fixture', schema: 'public', table: 'leads', externalIdColumn: 'id', fields: [{ sourceColumn: 'title', targetField: 'title', conversion: { kind: 'text' as const } }] };
  assert.throws(() => buildConnectorMapping({ ...mapping, fields: [] }), /BYODB_REQUIRED_FIELD_UNMAPPED/);
  assert.deepEqual(buildConnectorMapping(mapping).fields, [{ sourceColumn: 'title', targetField: 'title', conversion: { kind: 'text' } }]);
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

test('connector package requires an immutable digest and contains only safe Synology templates', async () => {
  const options = { image: `ghcr.io/svobonek-lab/stavbaflow-connector@sha256:${'a'.repeat(64)}`, driver: 'postgres' as const, apiBaseUrl: 'https://app.example.test' };
  const bundle = await buildConnectorPackage(options);
  const zip = await JSZip.loadAsync(bundle);
  assert.deepEqual(Object.keys(zip.files).filter(name => !zip.files[name]!.dir).sort(), ['config.json', 'docker-compose.synology.yml']);
  const compose = await zip.file('docker-compose.synology.yml')!.async('string');
  const config = await zip.file('config.json')!.async('string');
  assert.match(compose, /source_db_password/);
  assert.match(compose, /connector_identity/);
  assert.match(config, /"driver": "postgres"/);
  assert.match(config, /passwordFile/);
  assert.match(config, /writePasswordFile/);
  assert.doesNotMatch(`${compose}\n${config}`, /connectorSecret|connector-secret-value|enrollment-code-value|"password"\s*:/i);
  await assert.rejects(buildConnectorPackage({ ...options, image: 'latest' }), /CONNECTOR_IMAGE_DIGEST_REQUIRED/);
  await assert.rejects(buildConnectorPackage({ ...options, image: `ghcr.io/svobonek-lab/stavbaflow-connector@sha256:${'z'.repeat(64)}` }), /CONNECTOR_IMAGE_DIGEST_REQUIRED/);
  await assert.rejects(buildConnectorPackage({ ...options, apiBaseUrl: 'https://user:pass@app.example.test/path' }), /CONNECTOR_API_URL_INVALID/);
});

test('owner integration UI names both storage modes and keeps write status visible', async () => {
  const integrations = await readFile(new URL('../src/pages/owner/integrations/ui/Integrations.tsx', import.meta.url), 'utf8');
  const status = await readFile(new URL('../src/features/manage-integrations/ui/ConnectorStatus.tsx', import.meta.url), 'utf8');
  assert.match(integrations, /Managed Cloud/);
  assert.match(integrations, /Firemní databáze/);
  assert.match(integrations, /connectorClient\.setDatabaseMode/);
  assert.match(integrations, /entityType === 'company'[\s\S]+mappedTargets\.includes\('name'\)/);
  assert.match(integrations, /entityType === 'lead'[\s\S]+mappedTargets\.includes\('assignedToEmail'\)/);
  const settings = await readFile(new URL('../src/pages/owner/settings/ui/Settings.tsx', import.meta.url), 'utf8');
  assert.match(settings, /Firemní údaje se načítají ze zdrojové databáze/);
  assert.match(settings, /disabled=\{byodbMode\}/);
  assert.match(status, /čekající zápisy/i);
  assert.match(status, /konflikt/i);
});
