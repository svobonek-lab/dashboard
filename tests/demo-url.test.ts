import assert from 'node:assert/strict';
import test from 'node:test';

import { isPublicDemoPath, resolveDemoUrl } from '../src/shared/lib/demoUrl';

test('only explicit public demo routes bypass the application login', () => {
  assert.equal(isPublicDemoPath('/demo'), true);
  assert.equal(isPublicDemoPath('/demo/'), true);
  assert.equal(isPublicDemoPath('/interaktivni-demo'), true);
  assert.equal(isPublicDemoPath('/login'), false);
  assert.equal(isPublicDemoPath('/demo-company'), false);
});

test('explicit HTTPS demo URL wins and is normalized without query or fragment', () => {
  assert.deepEqual(resolveDemoUrl(
    { VITE_DEMO_URL: 'https://dashboard.example.test/demo/' },
    { isDevelopment: false, origin: 'https://sales.example.test', allowRelative: false },
  ), { url: 'https://dashboard.example.test/demo', error: null });
});

test('app URL fallback points to the real demo workspace', () => {
  assert.deepEqual(resolveDemoUrl(
    { VITE_APP_URL: 'https://dashboard.example.test/' },
    { isDevelopment: false, origin: 'https://sales.example.test', allowRelative: false },
  ), { url: 'https://dashboard.example.test/demo', error: null });
});

test('local or deliberately unified deployments may keep demo relative', () => {
  assert.equal(resolveDemoUrl({}, { isDevelopment: true, origin: 'http://localhost:3000', allowRelative: true }).url, '/demo');
  assert.equal(resolveDemoUrl({}, { isDevelopment: false, origin: 'https://unified.example.test', allowRelative: true }).url, '/demo');
});

test('unsafe and ambiguous public demo URLs fail closed', () => {
  for (const value of [
    'javascript:alert(1)',
    'data:text/html,hello',
    '//attacker.example/demo',
    'http://dashboard.example.test/demo',
    'https://user:pass@dashboard.example.test/demo',
    'https://dashboard.example.test/demo?token=secret',
    'https://dashboard.example.test/demo#section',
    'not a url',
  ]) {
    const result = resolveDemoUrl(
      { VITE_DEMO_URL: value },
      { isDevelopment: false, origin: 'https://sales.example.test', allowRelative: false },
    );
    assert.equal(result.url, null, value);
    assert.match(result.error || '', /demo/i);
  }
});

test('configured invalid URL never falls through to another destination', () => {
  const result = resolveDemoUrl(
    { VITE_DEMO_URL: 'http://unsafe.example.test/demo', VITE_APP_URL: 'https://safe.example.test' },
    { isDevelopment: false, origin: 'https://sales.example.test', allowRelative: false },
  );
  assert.equal(result.url, null);
});
