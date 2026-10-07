import assert from 'node:assert/strict';
import test from 'node:test';
import { generateGeminiResponse } from '../lib/gemini';

test('retries transient Gemini unavailable responses', async () => {
  const originalFetch = globalThis.fetch;
  const originalApiKey = process.env.GEMINI_API_KEY;
  const originalModel = process.env.GEMINI_MODEL;
  let attempts = 0;

  process.env.GEMINI_API_KEY = 'test-key';
  process.env.GEMINI_MODEL = 'gemini-test';
  globalThis.fetch = async () => {
    attempts += 1;
    if (attempts < 3) {
      return new Response(JSON.stringify({
        error: { code: 503, message: 'temporary overload', status: 'UNAVAILABLE' },
      }), { status: 503, headers: { 'content-type': 'application/json' } });
    }
    return new Response(JSON.stringify({
      candidates: [{
        content: { parts: [{ text: '{"is_lead":false}' }], role: 'model' },
        finishReason: 'STOP',
      }],
      modelVersion: 'gemini-test',
      responseId: 'response-test',
    }), { status: 200, headers: { 'content-type': 'application/json' } });
  };

  try {
    const result = await generateGeminiResponse('prompt', 'body');
    assert.equal(result, '{"is_lead":false}');
    assert.equal(attempts, 3);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalApiKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = originalApiKey;
    if (originalModel === undefined) delete process.env.GEMINI_MODEL;
    else process.env.GEMINI_MODEL = originalModel;
  }
});
