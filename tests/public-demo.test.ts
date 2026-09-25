import assert from 'node:assert/strict';
import test from 'node:test';
import { createDemoLead, DEMO_COLUMNS, DEMO_SEED, nextDemoStatus, parseDemoLeads, moveDemoLead } from '../features/publicDemo/demoState.ts';

test('public demo uses a small, synthetic construction pipeline', () => {
  assert.equal(DEMO_SEED.length, 5);
  assert.ok(DEMO_SEED.every((lead) => lead.id.startsWith('demo-')));
  assert.ok(DEMO_SEED.every((lead) => !lead.email && !lead.phone));
});

test('demo state safely restores seed when browser storage is invalid', () => {
  assert.deepEqual(parseDemoLeads('{broken'), DEMO_SEED);
  assert.deepEqual(parseDemoLeads('[]'), DEMO_SEED);
});

test('the owner dashboard supports a scheduled site visit and keeps it after reload', () => {
  assert.deepEqual(DEMO_COLUMNS.map((column) => column.id), ['new', 'contacted', 'scheduled', 'quote', 'job']);
  const scheduled = { ...DEMO_SEED[0], status: 'scheduled' as const, updated: 'Zaměření · zítra 10:30' };
  assert.deepEqual(parseDemoLeads(JSON.stringify([scheduled])), [scheduled]);
  assert.equal(nextDemoStatus('new'), 'contacted');
  assert.equal(nextDemoStatus('contacted'), 'scheduled');
  assert.equal(nextDemoStatus('scheduled'), 'quote');
  assert.equal(nextDemoStatus('quote'), 'job');
  assert.equal(nextDemoStatus('job'), null);
});

test('new inquiry is synthetic and can be advanced to a job', () => {
  const lead = createDemoLead({ customer: 'Ukázkový investor', project: 'Oprava střechy', city: 'Brno' }, 123);
  assert.equal(lead.id, 'demo-123');
  assert.equal(lead.status, 'new');
  const accepted = moveDemoLead(lead, 'job');
  assert.equal(accepted.status, 'job');
  assert.equal(moveDemoLead(accepted, 'new').status, 'new');
});
