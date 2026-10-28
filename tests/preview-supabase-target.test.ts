import assert from 'node:assert/strict';
import test from 'node:test';
import { assertPreviewSupabaseTarget } from '../scripts/assert-preview-supabase-target.mjs';

const origin = 'https://dashboard-git-test-svobonek-6462s-projects.vercel.app';
const stagingRef = 'xwzweltjvreqhjpbjrxa';
const productionRef = 'oncmtmrhmjlerbwkrecv';

function fakeFetch(bundle: string) {
  return (async (input: RequestInfo | URL) => {
    const url = String(input);
    const response = new Response(url.endsWith('/login')
      ? '<script type="module" src="/assets/index.js"></script>'
      : bundle);
    Object.defineProperty(response, 'url', { value: url });
    return response;
  }) as typeof fetch;
}

test('staging E2E preflight accepts a bundle targeting staging', async () => {
  await assert.doesNotReject(assertPreviewSupabaseTarget(origin, stagingRef, productionRef, fakeFetch(`https://${stagingRef}.supabase.co`)));
});

test('staging E2E preflight rejects a production or unidentified bundle', async () => {
  await assert.rejects(assertPreviewSupabaseTarget(origin, stagingRef, productionRef, fakeFetch(`https://${productionRef}.supabase.co`)), /targets production/);
  await assert.rejects(assertPreviewSupabaseTarget(origin, stagingRef, productionRef, fakeFetch('no Supabase target')), /does not identify/);
});
