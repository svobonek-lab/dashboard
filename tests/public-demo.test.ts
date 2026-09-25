import assert from 'node:assert/strict';
import test from 'node:test';
import { createDemoLead, DEMO_SEED, parseDemoLeads, moveDemoLead } from '../features/publicDemo/demoState.ts';

test('public demo uses a small, synthetic construction pipeline', () => {
  assert.equal(DEMO_SEED.length, 4);
  assert.ok(DEMO_SEED.every((lead) => lead.id.startsWith('demo-')));
  assert.ok(DEMO_SEED.every((lead) => !lead.email && !lead.phone));
});

test('demo state safely restores seed when browser storage is invalid', () => {
  assert.deepEqual(parseDemoLeads('{broken'), DEMO_SEED);
  assert.deepEqual(parseDemoLeads('[]'), DEMO_SEED);
});

test('new inquiry is synthetic and can be advanced to a job', () => {
  const lead = createDemoLead({ customer: 'Ukázkový investor', project: 'Oprava střechy', city: 'Brno' }, 123);
  assert.equal(lead.id, 'demo-123');
  assert.equal(lead.status, 'new');
  const accepted = moveDemoLead(lead, 'job');
  assert.equal(accepted.status, 'job');
  assert.equal(moveDemoLead(accepted, 'new').status, 'new');
});
