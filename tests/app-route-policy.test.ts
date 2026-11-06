import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { isKnownAppPath, shouldRedirectProtectedRoute } from '../src/app/routePolicy.js';

const app = readFileSync(new URL('../src/app/App.tsx', import.meta.url), 'utf8');
const guard = readFileSync(new URL('../src/app/ProtectedRoute.tsx', import.meta.url), 'utf8');
const registration = readFileSync(new URL('../src/pages/auth/paid-registration/ui/PaidRegistration.tsx', import.meta.url), 'utf8');
const deployment = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8')) as {
  git?: { deploymentEnabled?: Record<string, boolean> };
  redirects?: Array<{ source: string; destination: string; permanent: boolean }>;
};
const widgetLoader = readFileSync(new URL('../public/widget.js', import.meta.url), 'utf8');

test('protected routes require an authenticated, configured application', () => {
  assert.equal(shouldRedirectProtectedRoute('/employee/jobs', false, true, true), true);
  assert.equal(shouldRedirectProtectedRoute('/employee/jobs', true, false, false), true);
  assert.equal(shouldRedirectProtectedRoute('/employee/jobs', true, true, false), true);
  assert.equal(shouldRedirectProtectedRoute('/employee/jobs', true, true, true), false);
});

test('public routes are an explicit allowlist and do not include similar-looking paths', () => {
  assert.equal(shouldRedirectProtectedRoute('/widget-iframe', false, false, false), false);
  assert.equal(shouldRedirectProtectedRoute('/widget-iframe.html', false, false, false), false);
  assert.equal(shouldRedirectProtectedRoute('/widget-iframe-untrusted', false, false, false), true);
});

test('known app routes are explicit and unknown paths do not fall through to owner pages', () => {
  assert.equal(isKnownAppPath('/dashboard'), true);
  assert.equal(isKnownAppPath('/employee/jobs'), true);
  assert.equal(isKnownAppPath('/integrations/synology'), true);
  assert.equal(isKnownAppPath('/not-a-real-route'), false);
  assert.equal(isKnownAppPath('/admin/not-a-real-route'), false);
  assert.equal(isKnownAppPath('/employee/not-a-real-route'), false);
  assert.equal(isKnownAppPath('/support/synthetic-session/leads'), true);
  assert.equal(isKnownAppPath('/support/synthetic-session/settings'), false);
});

test('application renders a clear not-found page for unknown routes', () => {
  assert.match(app, /!isKnownAppPath\(pathname\)/);
  assert.match(app, /Tahle stránka neexistuje/);
});

test('protected route component uses the fail-closed route policy', () => {
  assert.match(guard, /shouldRedirectProtectedRoute\(pathname, isConfigured, Boolean\(user\), Boolean\(dbUser\)\)/);
});

test('legacy widget iframe URL redirects to the SPA route and the embed emits the extensionless URL', () => {
  assert.deepEqual(deployment.redirects?.find((rule) => rule.source === '/widget-iframe.html'), {
    source: '/widget-iframe.html', destination: '/widget-iframe', permanent: true,
  });
  assert.match(widgetLoader, /rootUrl \+ '\/widget-iframe\?/);
});

test('pre-sales audit branch does not trigger an unverified Preview deployment', () => {
  const deploymentConfig = deployment.git?.deploymentEnabled;
  assert.equal(deploymentConfig?.['codex/pre-sales-readiness-followup'], false);
});

test('paid registration copy does not claim that the public flow is a test checkout', () => {
  assert.doesNotMatch(registration, /Testovací registrace|zkontrolujte tarif a cenu přímo na Stripe/i);
  assert.match(registration, /Samostatná registrace není dostupná/);
});
