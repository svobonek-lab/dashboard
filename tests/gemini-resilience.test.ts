import assert from 'node:assert/strict';
import test from 'node:test';
import { withGeminiBackoff, GEMINI_MODEL, GEMINI_BUSY_MESSAGE } from '../lib/gemini';

test('429 retries four times with exact 2/4/8 second delays', async () => {
  let attempts = 0;
  const delays: number[] = [];
  const result = await withGeminiBackoff(async () => {
    attempts++;
    if (attempts < 4) throw { status: 429 };
    return 'ok';
  }, async (ms) => { delays.push(ms); });
  assert.equal(result, 'ok');
  assert.equal(attempts, 4);
  assert.deepEqual(delays, [2000, 4000, 8000]);
  assert.equal(GEMINI_MODEL, 'gemini-3.8-flash');
});

test('exhausted 429 requests return only the safe Czech error', async () => {
  let attempts = 0;
  const delays: number[] = [];
  await assert.rejects(withGeminiBackoff(async () => {
    attempts++; throw { status: 429, message: 'private provider detail' };
  }, async ms => { delays.push(ms); }), { message: GEMINI_BUSY_MESSAGE });
  assert.equal(attempts, 4);
  assert.deepEqual(delays, [2000, 4000, 8000]);
});

test('non-429 and unexpected failures fail immediately without retry or detail leakage', async () => {
  for (const error of [{ status: 503 }, { status: 401 }, new Error('private detail')]) {
    let attempts = 0;
    await assert.rejects(withGeminiBackoff(async () => {
      attempts++; throw error;
    }, async () => { assert.fail('must not sleep'); }), { message: GEMINI_BUSY_MESSAGE });
    assert.equal(attempts, 1);
  }
});
test('server generation uses the fixed model even when an environment override exists', async () => {
  const { generateGeminiResponse } = await import('../lib/gemini');
  const oldFetch = globalThis.fetch;
  const oldKey = process.env.GEMINI_API_KEY;
  const oldModel = process.env.GEMINI_MODEL;
  let calledUrl = '';
  process.env.GEMINI_API_KEY = 'synthetic-test-only';
  process.env.GEMINI_MODEL = 'unapproved-model';
  globalThis.fetch = async (input) => {
    calledUrl = String(input);
    return new Response(JSON.stringify({
      candidates: [{ content: { parts: [{ text: '{"is_lead":false}' }], role: 'model' }, finishReason: 'STOP' }],
    }), { status: 200, headers: { 'content-type': 'application/json' } });
  };
  try {
    assert.equal(await generateGeminiResponse('prompt', 'body'), '{"is_lead":false}');
    assert.match(calledUrl, /gemini-3\.8-flash/);
    assert.doesNotMatch(calledUrl, /unapproved-model/);
  } finally {
    globalThis.fetch = oldFetch;
    if (oldKey === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = oldKey;
    if (oldModel === undefined) delete process.env.GEMINI_MODEL; else process.env.GEMINI_MODEL = oldModel;
  }
});
