import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateDemoMargin, createDemoLead, DEMO_COLUMNS, DEMO_SEED, nextDemoJourneyStep, nextDemoStatus, parseDemoLeads, moveDemoLead } from '../src/features/public-demo/model/demoState.ts';
import { getOwnerAttentionItems, getOwnerAverageMargin, getOwnerActiveJobs } from '../features/ownerDashboard/dashboardMetrics.ts';

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

test('guided company demo advances through four steps and reports a validated margin', () => {
  assert.deepEqual([nextDemoJourneyStep(0), nextDemoJourneyStep(1), nextDemoJourneyStep(2), nextDemoJourneyStep(3)], [1, 2, 3, null]);
  assert.equal(calculateDemoMargin(353000, 214500), 39.2);
  assert.equal(calculateDemoMargin(0, 100), null);
  assert.equal(calculateDemoMargin(100, -10), null);
});

test('owner dashboard attention and jobs come only from the company leads', () => {
  const leads = [
    { id: 'l-new', status: 'New' as const, customerName: 'Firma Nová', title: 'Střecha', price: 120000, priority: 'Urgent' as const, assignedEmployeeName: '' },
    { id: 'l-quote', status: 'Quote' as const, customerName: 'Rodina Malá', title: 'Koupelna', price: 230000, priority: 'Medium' as const, assignedEmployeeName: 'Pavel' },
    { id: 'l-job', status: 'In Progress' as const, customerName: 'Dům Zelených', title: 'Fasáda', price: 300000, priority: 'Low' as const, assignedEmployeeName: 'Adam' },
    { id: 'l-done', status: 'Completed' as const, customerName: 'Paní Modrá', title: 'Okna', price: 80000, priority: 'Low' as const, assignedEmployeeName: 'Adam' },
  ];

  assert.deepEqual(getOwnerAttentionItems(leads).map((item) => item.leadId), ['l-new', 'l-quote']);
  assert.deepEqual(getOwnerActiveJobs(leads).map((lead) => lead.id), ['l-job']);
  assert.equal(getOwnerAverageMargin([{ calculatedMargin: 20 }, { calculatedMargin: 30 }, { calculatedMargin: undefined }]), 25);
  assert.equal(getOwnerAverageMargin([{ calculatedMargin: undefined }]), null);
  assert.deepEqual(getOwnerAttentionItems([]), []);
});
