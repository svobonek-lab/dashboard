import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { createPlatformCompanyOnboarding } from '../api/_platform/routes/companies.js';

const ownerConsent = {
  termsAccepted: true,
  dpaAccepted: true,
  acceptedAt: new Date().toISOString(),
};

const validInput: any = {
  name: 'Střechy Novák',
  slug: 'strechy-novak',
  ownerName: 'Jan Novák',
  ownerEmail: 'jan@example.cz',
  plan: 'pilot',
  legalConsent: ownerConsent,
};

test('platform onboarding rejects a company without both owner agreements before touching Supabase', async () => {
  let called = false;
  const service = { rpc: async () => { called = true; return { data: null, error: null }; } } as any;
  await assert.rejects(
    createPlatformCompanyOnboarding(service, 'admin-a', { ...validInput, legalConsent: { ...ownerConsent, dpaAccepted: false } }, 'https://app.example.cz'),
    /LEGAL_CONSENT_REQUIRED/,
  );
  assert.equal(called, false);
});

test('owner registration and owner invitation activation render both required legal agreements', () => {
  const login = readFileSync(new URL('../src/pages/auth/login/ui/LoginPage.tsx', import.meta.url), 'utf8');
  const fields = readFileSync(new URL('../components/LegalConsentFields.tsx', import.meta.url), 'utf8');
  assert.match(fields, /Souhlasím s Obchodními podmínkami \(TOS\)/);
  assert.match(fields, /Uzavírám Zpracovatelskou smlouvu \(DPA\) jménem své organizace/);
  assert.match(login, /LegalConsentFields/);
  assert.match(login, /disabled=\{[^}]*legal[^}]*\}/i);
});

test('staging legal consent contract records server-owned organization audit evidence', () => {
  const sql = readFileSync(new URL('../supabase/staging/20261016_legal_consent_contract.sql', import.meta.url), 'utf8');
  assert.match(sql, /app_company_legal_acceptances/);
  assert.match(sql, /clock_timestamp\(\)/);
  assert.match(sql, /terms_of_service/);
  assert.match(sql, /data_processing_agreement/);
  assert.match(sql, /enable row level security/);
  assert.match(sql, /revoke all.*from public/i);
});