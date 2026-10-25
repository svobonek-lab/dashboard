import assert from 'node:assert/strict';
import test from 'node:test';
import { createRetryingFetch } from '../api/_shared/retryingFetch';
import { createServerlessSupabaseClient } from '../api/_shared/supabaseClient';

function retryOptions(delays: number[]) {
  return {
    random: () => 0.5,
    sleep: async (ms: number) => { delays.push(ms); },
  };
}

test('GET retries a transient network failure and returns the next response', async () => {
  let attempts = 0;
  const delays: number[] = [];
  const fetch = createRetryingFetch(async () => {
    attempts++;
    if (attempts === 1) throw new TypeError('network unavailable');
    return new Response('ok', { status: 200 });
  }, retryOptions(delays));

  const response = await fetch('https://project.example.test/rest/v1/app_leads');

  assert.equal(await response.text(), 'ok');
  assert.equal(attempts, 2);
  assert.deepEqual(delays, [50]);
});

test('GET retries a transient 503 response with exponential delay', async () => {
  let attempts = 0;
  const delays: number[] = [];
  const fetch = createRetryingFetch(async () => {
    attempts++;
    return attempts === 1
      ? new Response('busy', { status: 503 })
      : new Response('ok', { status: 200 });
  }, retryOptions(delays));

  const response = await fetch('https://project.example.test/rest/v1/app_leads');

  assert.equal(response.status, 200);
  assert.equal(attempts, 2);
  assert.deepEqual(delays, [50]);
});

test('GET retries transient 520 responses after the SDK retry layer is disabled', async () => {
  let attempts = 0;
  const delays: number[] = [];
  const fetch = createRetryingFetch(async () => {
    attempts++;
    return attempts === 1
      ? new Response('upstream unavailable', { status: 520 })
      : new Response('ok', { status: 200 });
  }, retryOptions(delays));

  const response = await fetch('https://project.example.test/rest/v1/app_leads');

  assert.equal(response.status, 200);
  assert.equal(attempts, 2);
  assert.deepEqual(delays, [50]);
});

test('HEAD retries transient responses using the same backoff policy', async () => {
  let attempts = 0;
  const delays: number[] = [];
  const fetch = createRetryingFetch(async () => {
    attempts++;
    return new Response(null, { status: attempts === 1 ? 429 : 200 });
  }, retryOptions(delays));

  const response = await fetch('https://project.example.test/rest/v1/app_leads', { method: 'HEAD' });

  assert.equal(response.status, 200);
  assert.equal(attempts, 2);
  assert.deepEqual(delays, [50]);
});

test('GET stops after three total attempts and preserves the final network error', async () => {
  let attempts = 0;
  const delays: number[] = [];
  const error = new TypeError('network unavailable');
  const fetch = createRetryingFetch(async () => {
    attempts++;
    throw error;
  }, retryOptions(delays));

  await assert.rejects(fetch('https://project.example.test/rest/v1/app_leads'), error);

  assert.equal(attempts, 3);
  assert.deepEqual(delays, [50, 100]);
});

test('POST is never retried after a transient response', async () => {
  let attempts = 0;
  const delays: number[] = [];
  const fetch = createRetryingFetch(async () => {
    attempts++;
    return new Response('busy', { status: 503 });
  }, retryOptions(delays));

  const response = await fetch('https://project.example.test/rest/v1/app_leads', { method: 'POST', body: '{}' });

  assert.equal(response.status, 503);
  assert.equal(attempts, 1);
  assert.deepEqual(delays, []);
});

test('GET passes permanent 400 responses through without retry', async () => {
  let attempts = 0;
  const delays: number[] = [];
  const fetch = createRetryingFetch(async () => {
    attempts++;
    return new Response('bad request', { status: 400 });
  }, retryOptions(delays));

  const response = await fetch('https://project.example.test/rest/v1/app_leads');

  assert.equal(response.status, 400);
  assert.equal(await response.text(), 'bad request');
  assert.equal(attempts, 1);
  assert.deepEqual(delays, []);
});

test('GET does not retry caller aborts', async () => {
  let attempts = 0;
  const delays: number[] = [];
  const error = new DOMException('request aborted', 'AbortError');
  const fetch = createRetryingFetch(async () => {
    attempts++;
    throw error;
  }, retryOptions(delays));

  await assert.rejects(fetch('https://project.example.test/rest/v1/app_leads'), error);

  assert.equal(attempts, 1);
  assert.deepEqual(delays, []);
});

test('GET honors Retry-After when the requested delay fits the retry budget', async () => {
  let attempts = 0;
  const delays: number[] = [];
  const fetch = createRetryingFetch(async () => {
    attempts++;
    return attempts === 1
      ? new Response('busy', { status: 429, headers: { 'Retry-After': '1' } })
      : new Response('ok', { status: 200 });
  }, { ...retryOptions(delays), maxDelayMs: 1000 });

  const response = await fetch('https://project.example.test/rest/v1/app_leads');

  assert.equal(response.status, 200);
  assert.equal(attempts, 2);
  assert.deepEqual(delays, [1000]);
});

test('GET returns a throttled response when Retry-After exceeds the retry budget', async () => {
  let attempts = 0;
  const delays: number[] = [];
  const fetch = createRetryingFetch(async () => {
    attempts++;
    return new Response('rate limited', { status: 429, headers: { 'Retry-After': '30' } });
  }, { ...retryOptions(delays), maxDelayMs: 1000 });

  const response = await fetch('https://project.example.test/rest/v1/app_leads');

  assert.equal(response.status, 429);
  assert.equal(await response.text(), 'rate limited');
  assert.equal(attempts, 1);
  assert.deepEqual(delays, []);
});

test('serverless Supabase client preserves global options and retries a read', async () => {
  let attempts = 0;
  let requestUrl = '';
  let customHeader = '';
  const client = createServerlessSupabaseClient('https://project.example.test', 'test-anon-key', {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      headers: { 'X-Contract-Test': 'preserved' },
      fetch: async (input, init) => {
        attempts++;
        requestUrl = String(input);
        customHeader = new Headers(init?.headers).get('X-Contract-Test') || '';
        if (attempts === 1) throw new TypeError('network unavailable');
        return new Response('[]', { status: 200, headers: { 'content-type': 'application/json' } });
      },
    },
  });

  const { data, error } = await client.from('app_leads').select('id');

  assert.equal(error, null);
  assert.deepEqual(data, []);
  assert.match(requestUrl, /\/rest\/v1\/app_leads\?select=id/);
  assert.equal(customHeader, 'preserved');
  assert.equal(attempts, 2);
});

test('serverless Supabase client applies only its bounded retry policy to PostgREST reads', async () => {
  let attempts = 0;
  const client = createServerlessSupabaseClient('https://project.example.test', 'test-anon-key', {
    global: {
      fetch: async () => {
        attempts++;
        return new Response('temporarily unavailable', {
          status: 503,
          headers: { 'Retry-After': '0' },
        });
      },
    },
  });

  const { error } = await client.from('app_leads').select('id');

  assert.ok(error);
  assert.equal(attempts, 3);
});
