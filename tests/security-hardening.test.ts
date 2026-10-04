import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import outbox from '../api/outbox-scheduler';

test('dashboard does not trust lead payloads from cross-window messages', () => {
  const app = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
  const context = readFileSync(new URL('../context/OrganizationContext.tsx', import.meta.url), 'utf8');
  assert.doesNotMatch(app, /addEventListener\(['"]message['"]/);
  assert.doesNotMatch(context, /postMessage\([^\n]+\*['"]/);
});

test('embed loader treats customer button text as text and validates message sender', () => {
  const widget = readFileSync(new URL('../public/widget.js', import.meta.url), 'utf8');
  assert.match(widget, /labelContainer\.textContent = label/);
  assert.match(widget, /event\.origin !== expectedOrigin/);
  assert.match(widget, /event\.source !== iframe\.contentWindow/);
  assert.doesNotMatch(widget, /innerHTML = sparklesIcon \+ '<span>' \+ btnText/);
});

test('paid website analysis requires a verified authenticated session', () => {
  const api = readFileSync(new URL('../api/analyze-website.ts', import.meta.url), 'utf8');
  const client = readFileSync(new URL('../lib/gemini.ts', import.meta.url), 'utf8');
  assert.match(api, /auth\.getUser\(token\)/);
  assert.match(api, /replace\(\/\^Bearer/);
  assert.match(client, /Authorization: `Bearer \$\{token\}`/);
});

test('deployment defines CSP and HSTS while keeping only intake pages embeddable', () => {
  const config = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));
  const serialized = JSON.stringify(config);
  assert.match(serialized, /Content-Security-Policy/);
  assert.match(serialized, /Strict-Transport-Security/);
  assert.match(serialized, /frame-ancestors \*/);
  assert.match(serialized, /frame-ancestors 'self'/);
  assert.match(serialized, /inquiry/);
});

test('metadata and package identity match the verified StavbaFlow pilot', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  assert.equal(pkg.name, 'stavbaflow-dashboard');
  assert.equal(pkg.dependencies?.express, undefined);
  assert.doesNotMatch(html, /marži|cenovou nabídku/i);
  assert.match(html, /přijímat poptávky/);
});

test('cron authentication has one generic failure response', async () => {
  const original = process.env.CRON_SECRET;
  try {
    process.env.CRON_SECRET = 'expected-synthetic-secret';
    for (const authorization of [undefined, 'Bearer wrong-secret']) {
      const res = { code: 0, body: null as any, status(code: number) { this.code = code; return this; }, json(body: any) { this.body = body; return this; } };
      await outbox({ method: 'POST', headers: { authorization } }, res);
      assert.equal(res.code, 401);
      assert.deepEqual(res.body, { error: 'Neautorizovaný přístup.' });
    }
  } finally {
    if (original === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = original;
  }
});
