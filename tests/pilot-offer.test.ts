import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { estimatePilotScenario } from '../src/pages/public/landing/model/pilotOffer';

const landing = readFileSync(new URL('../src/pages/public/landing/ui/LandingPage.tsx', import.meta.url), 'utf8');
const demo = readFileSync(new URL('../src/pages/public/demo/ui/PublicDemoWorkspace.tsx', import.meta.url), 'utf8');
const demoModel = readFileSync(new URL('../src/features/public-demo/model/demoWorkspace.ts', import.meta.url), 'utf8');

test('landing and demo use the same fixture and the pilot has no inactive checkout CTA', () => {
  assert.match(landing, /PUBLIC_DEMO_LEADS/);
  // The demo builds its jobs from the same shared fixture, through the demo model.
  assert.match(demo, /createPublicDemoLeads/);
  assert.match(demoModel, /PUBLIC_DEMO_LEADS\.map/);
  assert.match(landing, /30denní Managed Cloud pilot s osobním zřízením/);
  assert.doesNotMatch(landing, /register-paid|Domluvit tarif|1\s*990\s*Kč|únor(?:&nbsp;|\s)+2027/);
});

test('the illustration compares a chosen 30-day scenario and requires an entered price for ROI', () => {
  const baseline = { monthlyLeads: 20, quotedRate: 50, winRate: 50, margin: 10_000, adminHoursWeekly: 7 };
  const noCost = estimatePilotScenario({ ...baseline, extraWinsPercent: 20, timeSavedPercent: 50, cost: null });
  assert.equal(noCost.baselineWins, 5);
  assert.equal(noCost.extraMargin, 10_000);
  assert.equal(noCost.hoursSaved, 15);
  assert.equal(noCost.roiPercent, null);
  const costed = estimatePilotScenario({ ...baseline, extraWinsPercent: 20, timeSavedPercent: 50, cost: 5_000 });
  assert.equal(costed.roiPercent, 100);
});
