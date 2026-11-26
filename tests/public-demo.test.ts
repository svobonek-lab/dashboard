import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateDemoMargin, createDemoLead, DEMO_COLUMNS, DEMO_SEED, nextDemoJourneyStep, nextDemoStatus, parseDemoLeads, moveDemoLead } from '../src/features/public-demo/model/demoState.ts';
import { getOwnerAttentionItems, getOwnerAverageMargin, getOwnerActiveJobs } from '../src/widgets/owner-dashboard';
import { addDemoNote, createDemoLeadFromDraft, createInitialDemoNotes, createPublicDemoLeads, DEMO_NOTE_MAX_LENGTH, getDemoLeadNotes, moveDemoLeadStatus, patchDemoLead, removeDemoNote } from '../src/features/public-demo/model/demoWorkspace.ts';
import { generateRealisticEmployees } from '../src/features/public-demo/model/demoData.ts';

const demoEmployees = generateRealisticEmployees('Brno');
const demoNow = new Date(2026, 10, 26, 9, 30);

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

test('interactive demo jobs come from the shared fixture and carry only synthetic contact data', () => {
  const leads = createPublicDemoLeads('org-demo', demoEmployees);
  assert.equal(leads.length, DEMO_SEED.length);
  assert.deepEqual(leads.map((lead) => lead.id), DEMO_SEED.map((lead) => lead.id));
  assert.ok(leads.every((lead) => lead.organization_id === 'org-demo'));
  assert.ok(leads.every((lead) => /^\+420 777 000 \d{3}$/.test(lead.customerPhone)), 'phone numbers must be the fictional 777 000 range');
  assert.ok(leads.every((lead) => /@(?:[a-z]+\.)?example\.test$/.test(lead.customerEmail)), 'emails must use the reserved example.test domain');
  assert.ok(leads.every((lead) => lead.history.length > 0));
  const assigned = leads.filter((lead) => lead.assignedEmployeeId);
  assert.ok(assigned.length > 0);
  assert.ok(assigned.every((lead) => demoEmployees.some((employee) => employee.id === lead.assignedEmployeeId && employee.name === lead.assignedEmployeeName)));
});

test('moving a demo job changes only that job, records it and never mutates the input', () => {
  const leads = createPublicDemoLeads('org-demo', demoEmployees);
  const before = JSON.stringify(leads);
  const moved = moveDemoLeadStatus(leads, 'demo-101', 'Contacted', demoNow);
  assert.equal(JSON.stringify(leads), before);
  assert.equal(moved.find((lead) => lead.id === 'demo-101')?.status, 'Contacted');
  assert.deepEqual(moved.filter((lead) => lead.id !== 'demo-101'), leads.filter((lead) => lead.id !== 'demo-101'));
  const entry = moved.find((lead) => lead.id === 'demo-101')?.history[0];
  assert.match(entry?.action ?? '', /Nová poptávka → Kontaktováno/);
  assert.equal(entry?.author, 'Demo majitel');
  assert.equal(moveDemoLeadStatus(leads, 'demo-101', leads[0].status, demoNow), leads);
  assert.equal(moveDemoLeadStatus(leads, 'demo-missing', 'Lost', demoNow), leads);
});

test('assigning an employee in the demo updates the job and records the change', () => {
  const leads = createPublicDemoLeads('org-demo', demoEmployees);
  const patched = patchDemoLead(leads, { id: 'demo-101', assignedEmployeeId: 'emp-3', assignedEmployeeName: 'Tomáš Veselý' }, demoNow);
  const lead = patched.find((item) => item.id === 'demo-101');
  assert.equal(lead?.assignedEmployeeName, 'Tomáš Veselý');
  assert.match(lead?.history[0].action ?? '', /přiřazena: Tomáš Veselý/);
  const unchanged = patchDemoLead(patched, { id: 'demo-101', assignedEmployeeId: 'emp-3', assignedEmployeeName: 'Tomáš Veselý' }, demoNow);
  assert.equal(unchanged.find((item) => item.id === 'demo-101')?.history.length, lead?.history.length);
  const removed = patchDemoLead(patched, { id: 'demo-101', assignedEmployeeId: '', assignedEmployeeName: '' }, demoNow);
  assert.match(removed.find((item) => item.id === 'demo-101')?.history[0].action ?? '', /odebráno/);
});

test('a job created in the demo gets a local id, starts as a new inquiry and is marked as demo-only', () => {
  const draft = { ...createPublicDemoLeads('x', demoEmployees)[0], id: '', status: 'Quote' as const, history: [] };
  const created = createDemoLeadFromDraft(draft, 'org-demo', demoNow);
  assert.equal(created.id, `demo-${demoNow.getTime()}`);
  assert.equal(created.organization_id, 'org-demo');
  assert.equal(created.status, 'New');
  assert.equal(created.history.length, 1);
  assert.match(created.history[0].action, /v demu/);
});

test('demo notes are added to the top, trimmed, capped, scoped to one job and removable', () => {
  const seed = createInitialDemoNotes();
  const leadIds = new Set(createPublicDemoLeads('org-demo', demoEmployees).map((lead) => lead.id));
  assert.ok(seed.every((note) => leadIds.has(note.leadId)), 'seed notes must belong to demo jobs');
  const added = addDemoNote(seed, 'demo-101', '  Zákazník chce dlažbu v šedé barvě.  ', demoNow);
  assert.equal(added.length, seed.length + 1);
  assert.equal(added[0].body, 'Zákazník chce dlažbu v šedé barvě.');
  assert.equal(added[0].author, 'Demo majitel');
  assert.equal(added[0].leadId, 'demo-101');
  assert.deepEqual(getDemoLeadNotes(added, 'demo-101').map((note) => note.id), [added[0].id]);
  assert.ok(getDemoLeadNotes(added, 'demo-102').every((note) => note.leadId === 'demo-102'));
  assert.equal(addDemoNote(seed, 'demo-101', '   ', demoNow), seed);
  assert.equal(addDemoNote(seed, 'demo-101', 'x'.repeat(DEMO_NOTE_MAX_LENGTH + 50), demoNow)[0].body.length, DEMO_NOTE_MAX_LENGTH);
  assert.equal(removeDemoNote(added, added[0].id).length, seed.length);
  assert.equal(removeDemoNote(added, 'missing'), added);
});
