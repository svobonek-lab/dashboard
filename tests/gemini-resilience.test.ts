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
  let calledBody: Record<string, unknown> | null = null;
  process.env.GEMINI_API_KEY = 'synthetic-test-only';
  process.env.GEMINI_MODEL = 'unapproved-model';
  globalThis.fetch = async (input, init) => {
    calledUrl = String(input);
    calledBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
    return new Response(JSON.stringify({
      candidates: [{ content: { parts: [{ text: '{"is_lead":false}' }], role: 'model' }, finishReason: 'STOP' }],
    }), { status: 200, headers: { 'content-type': 'application/json' } });
  };
  try {
    assert.equal(await generateGeminiResponse('prompt', 'body'), '{"is_lead":false}');
    assert.match(calledUrl, /gemini-3\.8-flash/);
    assert.doesNotMatch(calledUrl, /unapproved-model/);
    const config = (calledBody?.generationConfig || {}) as Record<string, unknown>;
    assert.equal(config.temperature, undefined, 'Gemini 3.8 Flash does not accept the deprecated temperature parameter');
  } finally {
    globalThis.fetch = oldFetch;
    if (oldKey === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = oldKey;
    if (oldModel === undefined) delete process.env.GEMINI_MODEL; else process.env.GEMINI_MODEL = oldModel;
  }
});
test('incoming API exposes safe AI overload text without persisting a lead', async () => {
  const { createIncomingLeadHandler } = await import('../api/incoming-lead');
  let persisted = false;
  const handler = createIncomingLeadHandler({
    classify: () => withGeminiBackoff(async () => { throw { status: 401 }; }),
    persist: async () => { persisted = true; return 'unused'; },
  });
  const response = {
    code: 0, body: {} as any,
    status(code: number) { this.code = code; return this; },
    json(body: unknown) { this.body = body; return this; },
  };
  await handler({ method: 'POST', headers: {}, body: {
    org_id: '11111111-1111-4111-8111-111111111111', text_body: 'synthetic inquiry',
  } }, response);
  assert.equal(response.code, 503);
  assert.equal(response.body.error, GEMINI_BUSY_MESSAGE);
  assert.equal(persisted, false);
});
