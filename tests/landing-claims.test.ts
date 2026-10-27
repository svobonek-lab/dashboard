import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const landing = readFileSync(new URL('../src/pages/public/landing/ui/LandingPage.tsx', import.meta.url), 'utf8');
const loginPage = readFileSync(new URL('../src/pages/auth/login/ui/LoginPage.tsx', import.meta.url), 'utf8');

test('landing marks every unavailable pilot capability it mentions as preparing or outside scope', () => {
  const heading = landing.indexOf('Mimo první pilot');
  const roadmapEnd = landing.indexOf('</ul>', heading);
  assert.ok(heading >= 0 && roadmapEnd > heading, 'unavailable features need an explicit roadmap section');
  const roadmap = landing.slice(heading, roadmapEnd);
  assert.match(roadmap, /Tyto části zatím nejsou součástí obchodního slibu/);
  assert.match(roadmap, /Klientský portál[^<]*Připravujeme, nejsou součástí prvního pilotu/);
});

test('ROI calculator identifies its figures as illustrative and approximate', () => {
  assert.match(landing, /ilustrativní výpočet s orientačními hodnotami/i);
});

test('landing claim changelog records unsupported features and illustrative calculator copy', () => {
  const changelog = readFileSync(new URL('../docs/landing-claims.md', import.meta.url), 'utf8');
  assert.match(changelog, /Klientský portál/);
  assert.match(changelog, /follow-upy/);
  assert.match(changelog, /ilustrativní výpočet/i);
  assert.match(changelog, /připravujeme|mimo první pilot/i);
  assert.match(changelog, /NO_ACTIVE_MEMBERSHIP/);
  assert.match(changelog, /nasazení draft PR/);
  assert.match(changelog, /Ověřený firemní pilot/);
});

test('Founding Pilot promise still names its onboarding and delivery scope', () => {
  const pilotDescription = landing.slice(landing.indexOf('Osobní založení firmy'), landing.indexOf('</p>', landing.indexOf('Osobní založení firmy')));
  for (const item of ['přihlášení majitele', 'pozvání zaměstnanců', 'webového formuláře', 'kontrolovaný CSV import']) {
    assert.ok(pilotDescription.includes(item), `Founding Pilot must continue to include: ${item}`);
  }
});

test('sales copy does not describe the current staging flow as accepted until owner acceptance passes', () => {
  assert.doesNotMatch(landing, /Ověřený pracovní tok Founding Pilotu/);
  assert.doesNotMatch(landing, /Tento průchod je ověřený v odděleném stagingu/);
  assert.doesNotMatch(landing, /OVĚŘENÝ PILOTNÍ TOK/);
  assert.doesNotMatch(landing, /Oddělení: firma A nevidí firmu B/);
  assert.doesNotMatch(landing, /Výsledek: skutečná uložená data bez demo fallbacku/);
  assert.doesNotMatch(landing, /Funkce ověřené ve stagingu a zahrnuté v prvním nasazení/);
  assert.doesNotMatch(landing, /Ověřený základ/);
  assert.doesNotMatch(landing, /ukážeme ověřený tok formulář/);
  assert.match(landing, /Funkce plánované pro první nasazení/);
  assert.match(landing, /před zákaznickými daty/);
});

test('owner login badge does not claim an unverified pilot acceptance', () => {
  assert.doesNotMatch(loginPage, /Ověřený firemní pilot/);
  assert.match(loginPage, /Firemní pilot StavbaFlow/);
});
