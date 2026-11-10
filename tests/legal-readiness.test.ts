import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { getLegalIdentityReadiness } from '../src/pages/public/landing';

const landing = readFileSync(new URL('../src/pages/public/landing/ui/LandingPage.tsx', import.meta.url), 'utf8');
const envExample = readFileSync(new URL('../.env.example', import.meta.url), 'utf8');
const checklist = readFileSync(new URL('../docs/go-live-checklist.md', import.meta.url), 'utf8');

test('missing legal identity shows a public notice in development and production', () => {
  const missing = { VITE_COMPANY_NAME: '', VITE_COMPANY_ICO: '', VITE_COMPANY_ADDRESS: '', VITE_COMPANY_EMAIL: '' };
  assert.equal(getLegalIdentityReadiness({ ...missing, DEV: true }).showIncompleteNotice, true);
  assert.equal(getLegalIdentityReadiness({ ...missing, DEV: false }).showIncompleteNotice, true);
  assert.equal(getLegalIdentityReadiness({ ...missing, VITE_COMPANY_NAME: 'StavbaFlow s.r.o.', VITE_COMPANY_ICO: '12345678', VITE_COMPANY_ADDRESS: 'Ulice 1, Praha', VITE_COMPANY_EMAIL: 'legal@example.cz', VITE_COMPANY_VOP_APPROVED: 'true' }).showIncompleteNotice, false);
});

test('VOP approval is required before legal documents are presented as complete', () => {
  const identity = {
    VITE_COMPANY_NAME: 'StavbaFlow s.r.o.', VITE_COMPANY_ICO: '12345678',
    VITE_COMPANY_ADDRESS: 'Ulice 1, Praha', VITE_COMPANY_EMAIL: 'legal@example.cz', DEV: false,
  };
  assert.equal(getLegalIdentityReadiness({ ...identity, VITE_COMPANY_VOP_APPROVED: 'false' }).ready, false);
  assert.deepEqual(getLegalIdentityReadiness({ ...identity, VITE_COMPANY_VOP_APPROVED: 'false' }).missing, ['VITE_COMPANY_VOP_APPROVED']);
  assert.equal(getLegalIdentityReadiness({ ...identity, VITE_COMPANY_VOP_APPROVED: 'true' }).ready, true);
});

test('public contact fallbacks do not count as configured legal address or identity', () => {
  const result = getLegalIdentityReadiness({
    VITE_COMPANY_NAME: 'StavbaFlow s.r.o.',
    VITE_COMPANY_ICO: '12345678',
    VITE_COMPANY_ADDRESS: '',
    VITE_COMPANY_EMAIL: '',
    DEV: true,
  });
  assert.equal(result.ready, false);
  assert.deepEqual(result.missing, ['VITE_COMPANY_ADDRESS', 'VITE_COMPANY_EMAIL', 'VITE_COMPANY_VOP_APPROVED']);
});

test('a complete legal identity requires explicit legal name, IČO, address and email', () => {
  assert.equal(getLegalIdentityReadiness({
    VITE_COMPANY_NAME: 'StavbaFlow s.r.o.', VITE_COMPANY_ICO: '12345678',
    VITE_COMPANY_ADDRESS: 'Ulice 1, Praha', VITE_COMPANY_EMAIL: 'legal@example.invalid', VITE_COMPANY_VOP_APPROVED: 'true', DEV: false,
  }).ready, true);
});

test('an invalid legal email does not unlock the legal document text', () => {
  const result = getLegalIdentityReadiness({
    VITE_COMPANY_NAME: 'StavbaFlow s.r.o.', VITE_COMPANY_ICO: '12345678',
    VITE_COMPANY_ADDRESS: 'Ulice 1, Praha', VITE_COMPANY_EMAIL: 'not-an-email', VITE_COMPANY_VOP_APPROVED: 'true', DEV: true,
  });
  assert.equal(result.ready, false);
  assert.deepEqual(result.missing, ['VITE_COMPANY_EMAIL']);
});

test('legal footer controls open all three available document panels', () => {
  assert.match(landing, /setActiveLegalModal\('vop'\)/);
  assert.match(landing, /setActiveLegalModal\('gdpr'\)/);
  assert.match(landing, /setActiveLegalModal\('dpa'\)/);
  assert.match(landing, /activeLegalModal === 'vop'/);
  assert.match(landing, /activeLegalModal === 'gdpr'/);
  assert.match(landing, /activeLegalModal === 'dpa'/);
});

test('release checklist documents every environment variable with an owner and evidence gate', () => {
  const names = envExample.split(/\r?\n/)
    .map((line) => line.match(/^([A-Z][A-Z0-9_]*)=/)?.[1])
    .filter((name): name is string => Boolean(name));
  for (const name of names) assert.ok(checklist.includes(name), `missing ${name} in go-live checklist`);
  assert.match(checklist, /Owner\s*\|\s*Evidence/i);
  assert.match(checklist, /staging/i);
  assert.match(checklist, /production/i);
});
