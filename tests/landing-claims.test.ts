import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const landing = readFileSync(new URL('../src/pages/public/landing/ui/LandingPage.tsx', import.meta.url), 'utf8');

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
});

test('Founding Pilot promise still names the verified onboarding and delivery scope', () => {
  const pilotDescription = landing.slice(landing.indexOf('Osobní založení firmy'), landing.indexOf('</p>', landing.indexOf('Osobní založení firmy')));
  for (const item of ['přihlášení majitele', 'pozvání zaměstnanců', 'webového formuláře', 'kontrolovaný CSV import']) {
    assert.ok(pilotDescription.includes(item), `Founding Pilot must continue to include: ${item}`);
  }
});
