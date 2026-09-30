import test from 'node:test';
import assert from 'node:assert/strict';
import { buildAppLoginUrl, getDeploymentConfig } from '../src/app/deploymentSurface';

test('unknown deployment surface stays on the safe unified default', () => {
  assert.deepEqual(getDeploymentConfig({ VITE_DEPLOYMENT_SURFACE: 'preview' }), { surface: 'unified', appUrl: '' });
});

test('landing surface normalizes the app URL', () => {
  assert.deepEqual(getDeploymentConfig({ VITE_DEPLOYMENT_SURFACE: 'LANDING', VITE_APP_URL: 'https://app.example.test/' }), {
    surface: 'landing',
    appUrl: 'https://app.example.test',
  });
});

test('login redirect preserves invite and email query parameters', () => {
  assert.equal(
    buildAppLoginUrl('https://app.example.test/', '?inviteToken=abc&email=worker%40firma.cz'),
    'https://app.example.test/login?inviteToken=abc&email=worker%40firma.cz',
  );
});

test('missing app URL keeps login local instead of creating a broken external link', () => {
  assert.equal(buildAppLoginUrl('', ''), '/login');
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
