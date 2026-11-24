import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { estimatePilotScenario } from '../src/pages/public/landing/model/pilotOffer';

const landing = readFileSync(new URL('../src/pages/public/landing/ui/LandingPage.tsx', import.meta.url), 'utf8');
const demo = readFileSync(new URL('../src/pages/public/demo/ui/PublicDemoWorkspace.tsx', import.meta.url), 'utf8');

test('landing and interactive demo share the fixture and show the monthly free-trial offer', () => {
  assert.match(landing, /PUBLIC_DEMO_LEADS/);
  assert.match(demo, /PUBLIC_DEMO_LEADS/);
  assert.match(landing, /30 dní zdarma, potom měsíční předplatné/);
  assert.match(demo, /30 dní zdarma/);
  assert.match(demo, /1 990 Kč měsíčně/);
  assert.doesNotMatch(landing, /register-paid|Domluvit tarif|únor(?:&nbsp;|\s)+2027/);
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
