import test from 'node:test';
import assert from 'node:assert/strict';
import { buildAppLoginUrl, buildAppRouteUrl, getDeploymentConfig, shouldShowLandingAtRoot, getLandingLoginUrl } from '../src/app/deploymentSurface';

test('unknown deployment surface stays on the safe unified default', () => {
  assert.deepEqual(getDeploymentConfig({ VITE_DEPLOYMENT_SURFACE: 'preview' }), { surface: 'unified', appUrl: '', landingUrl: '' });
});

test('surface config reads the two canonical public domains', () => {
  assert.deepEqual(getDeploymentConfig({ VITE_DEPLOYMENT_SURFACE: 'LANDING', PUBLIC_APP_URL: 'https://app.example.test/', PUBLIC_LANDING_URL: 'https://www.example.test/' }), {
    surface: 'landing',
    appUrl: 'https://app.example.test',
    landingUrl: 'https://www.example.test',
  });
});

test('deployment URLs accept configured HTTPS Vercel origins and preserve relative navigation when unconfigured', () => {
  assert.equal(getDeploymentConfig({ PUBLIC_APP_URL: 'https://dashboard-preview.vercel.app' }).appUrl, 'https://dashboard-preview.vercel.app');
  assert.equal(buildAppLoginUrl('https://dashboard-preview.vercel.app'), 'https://dashboard-preview.vercel.app/login');
});

test('login redirect preserves invite and email query parameters', () => {
  assert.equal(
    buildAppLoginUrl('https://app.example.test/', '?inviteToken=abc&email=worker%40firma.cz'),
    'https://app.example.test/login?inviteToken=abc&email=worker%40firma.cz',
  );
});

test('missing app URL keeps login local instead of creating a broken external link', () => {
  assert.equal(buildAppLoginUrl('', ''), '/login');
  assert.equal(buildAppRouteUrl('', '/register-paid?plan=starter'), '/register-paid?plan=starter');
});

test('sales login destination fails closed for missing or invalid app origins', () => {
  assert.equal(getLandingLoginUrl('', '?inviteToken=abc'), null);
  assert.equal(getLandingLoginUrl('http://app.example.test', ''), null);
  assert.equal(getLandingLoginUrl('https://app.example.test/path', ''), null);
  assert.equal(getLandingLoginUrl('https://app.example.test', '?inviteToken=abc'), 'https://app.example.test/login?inviteToken=abc');
});

test('preview host keeps the two Vercel surfaces separated when env is missing', () => {
  const previousWindow = (globalThis as typeof globalThis & { window?: unknown }).window;
  (globalThis as typeof globalThis & { window?: unknown }).window = {
    location: { hostname: 'jobflow-pro-git-sales-ready-pass.vercel.app' },
  } as any;
  try {
    assert.equal(getDeploymentConfig({}).surface, 'landing');
  } finally {
    if (previousWindow === undefined) delete (globalThis as typeof globalThis & { window?: unknown }).window;
    else (globalThis as typeof globalThis & { window?: unknown }).window = previousWindow;
  }
});

test('renamed sales preview host still fails closed as a landing surface', () => {
  const previousWindow = (globalThis as typeof globalThis & { window?: unknown }).window;
  (globalThis as typeof globalThis & { window?: unknown }).window = {
    location: { hostname: 'stavbaflow-landing-git-review.vercel.app' },
  } as any;
  try {
    assert.equal(getDeploymentConfig({}).surface, 'landing');
  } finally {
    if (previousWindow === undefined) delete (globalThis as typeof globalThis & { window?: unknown }).window;
    else (globalThis as typeof globalThis & { window?: unknown }).window = previousWindow;
  }
});

test('renamed application preview host remains the app surface', () => {
  const previousWindow = (globalThis as typeof globalThis & { window?: unknown }).window;
  (globalThis as typeof globalThis & { window?: unknown }).window = {
    location: { hostname: 'stavbaflow-git-review.vercel.app' },
  } as any;
  try {
    assert.equal(getDeploymentConfig({}).surface, 'app');
  } finally {
    if (previousWindow === undefined) delete (globalThis as typeof globalThis & { window?: unknown }).window;
    else (globalThis as typeof globalThis & { window?: unknown }).window = previousWindow;
  }
});

test('landing root remains public even when the browser has an app session', () => {
  assert.equal(shouldShowLandingAtRoot('landing'), true);
  assert.equal(shouldShowLandingAtRoot('app'), false);
  assert.equal(shouldShowLandingAtRoot('unified'), false);
});
