import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const landing = readFileSync(new URL('../src/pages/public/landing/ui/LandingPage.tsx', import.meta.url), 'utf8');
const loginPage = readFileSync(new URL('../src/pages/auth/login/ui/LoginPage.tsx', import.meta.url), 'utf8');

test('unaccepted production capabilities are visibly outside the pilot', () => {
  const heading = landing.indexOf('Mimo první pilot');
  const scope = landing.slice(heading, landing.indexOf('</ul>', heading));
  assert.ok(heading >= 0);
  for (const feature of ['CSV import', 'AI zpracování e-mailů', 'BYODB']) {
    const line = scope.split('\n').find(item => item.includes(feature));
    assert.ok(line?.includes('nejsou součástí prvního pilotu'));
  }
  assert.match(scope, /Poznámky, přílohy a historie změn čekají na produkční uvolnění/);
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

test('the workflow is presented as a pilot scenario, without claiming production acceptance', () => {
  assert.match(landing, /Plánovaný scénář pilotu/i);
  assert.match(landing, /před vložením zákaznických dat/i);
  assert.doesNotMatch(landing, /Změny se zapíšou do historie|Začínáme bezpečným CSV importem|Ověřený pracovní tok/i);
});

test('landing visibly marks IČO, legal address and VOP incomplete until explicitly supplied and approved', () => {
  assert.match(landing, /data-testid="legal-identity-placeholder"/);
  assert.match(landing, /IČO:[^<]*(?:doplnit|nedoplněno)/i);
  assert.match(landing, /Právní adresa:[^<]*(?:doplnit|nedoplněna)/i);
  assert.match(landing, /VOP:[^<]*(?:připravit|neschválené)/i);
  assert.match(landing, /VITE_COMPANY_VOP_APPROVED/);
});

test('the single pilot offer covers commercial terms without promising unavailable checkout', () => {
  const pricing = landing.slice(landing.indexOf('id="cenik"'), landing.indexOf('{/* 7. FAQ'));
  assert.match(pricing, /30denní Managed Cloud pilot s osobním zřízením/);
  for (const label of ['Cena za 30 dní a režim DPH', 'Jednorázové zřízení', 'Počet uživatelů', 'Soubory a limity', 'Podpora a reakční doba', 'Export dat', 'Ukončení pilotu']) {
    assert.ok(pricing.includes(label));
  }
  assert.match(pricing, /Domluvit 30denní pilot/);
  assert.doesNotMatch(pricing, /register-paid|Vybrat tarif|Domluvit tarif/);
});

test('owner login avoids unverified pilot claims and internal product jargon', () => {
  assert.doesNotMatch(loginPage, /Ověřený firemní pilot/);
  assert.match(loginPage, /Přihlášení do StavbaFlow/);
  assert.doesNotMatch(loginPage, /workspace|onboarding/i);
});
