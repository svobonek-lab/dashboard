import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { getPublicAppUrl, getPublicLandingUrl, replaceEmailAppOrigins } from '../api/_shared/publicUrls.js';

const root = new URL('..', import.meta.url).pathname.replace(/^\/(\w:)/, '$1');
const roots = ['src', 'api', 'supabase/templates'];
const emailSql = ['supabase/staging/20261014_immediate_email_notifications_contract.sql'];

function sourceFiles(path: string): string[] {
  return readdirSync(path, { withFileTypes: true }).flatMap((entry) => {
    const child = join(path, entry.name);
    return entry.isDirectory() ? sourceFiles(child) : /\.(?:ts|tsx|js|jsx|html|sql)$/.test(entry.name) ? [child] : [];
  });
}

test('no user-facing code or email template contains a Vercel deployment URL', () => {
  const files = [...roots.flatMap((directory) => sourceFiles(join(root, directory))), ...emailSql.map((file) => join(root, file))];
  const matches = files.flatMap((file) => {
    const content = readFileSync(file, 'utf8');
    return /https?:\/\/[^\s"'<>)]*\.vercel\.app/i.test(content) ? [file] : [];
  });
  assert.deepEqual(matches, [], `Vercel URLs remain in user-facing code: ${matches.map((file) => file.replace(root, '')).join(', ')}`);
});

test('frontend build receives the two explicit public URL settings', () => {
  const vite = readFileSync(join(root, 'vite.config.ts'), 'utf8');
  const example = readFileSync(join(root, '.env.example'), 'utf8');
  assert.match(vite, /PUBLIC_APP_URL/);
  assert.match(vite, /PUBLIC_LANDING_URL/);
  assert.match(example, /^PUBLIC_APP_URL=/m);
  assert.match(example, /^PUBLIC_LANDING_URL=/m);
});

test('server URL settings accept explicitly configured HTTPS origins and emails use that origin', () => {
  assert.equal(getPublicAppUrl({ PUBLIC_APP_URL: 'https://app.example.test', NODE_ENV: 'production' }), 'https://app.example.test');
  assert.equal(getPublicLandingUrl({ PUBLIC_LANDING_URL: 'https://www.example.test', NODE_ENV: 'production' }), 'https://www.example.test');
  assert.equal(getPublicAppUrl({ PUBLIC_APP_URL: 'https://dashboard-preview.vercel.app', NODE_ENV: 'production' }), 'https://dashboard-preview.vercel.app');
  assert.equal(getPublicAppUrl({ PUBLIC_APP_URL: 'http://dashboard-preview.vercel.app', NODE_ENV: 'production' }), null);
  assert.equal(getPublicAppUrl({ PUBLIC_APP_URL: 'https://user:password@dashboard-preview.vercel.app', NODE_ENV: 'production' }), null);
  assert.equal(replaceEmailAppOrigins('<a href="{{PUBLIC_APP_URL}}/?lead=abc">Open</a>', 'https://app.example.test'),
    '<a href="https://app.example.test/?lead=abc">Open</a>');
  assert.throws(() => replaceEmailAppOrigins('<a href="{{PUBLIC_APP_URL}}/">Open</a>', null), /PUBLIC_APP_URL_NOT_CONFIGURED/);
});
