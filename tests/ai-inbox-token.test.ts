import assert from 'node:assert/strict';
import test from 'node:test';
import { createAiInboxToken, verifyAiInboxToken } from '../api/_shared/aiInboxToken';

test('AI inbox token is bound to exactly one company and secret', () => {
  const token = createAiInboxToken('11111111-1111-4111-8111-111111111111', 'a'.repeat(32));
  assert.equal(verifyAiInboxToken('11111111-1111-4111-8111-111111111111', token, 'a'.repeat(32)), true);
  assert.equal(verifyAiInboxToken('22222222-2222-4222-8222-222222222222', token, 'a'.repeat(32)), false);
  assert.equal(verifyAiInboxToken('11111111-1111-4111-8111-111111111111', token, 'b'.repeat(32)), false);
});

test('AI inbox token rejects malformed and weak configuration', () => {
  assert.throws(() => createAiInboxToken('company-a', 'short'), /konfigurace/i);
  assert.equal(verifyAiInboxToken('company-a', 'not-a-token', 'a'.repeat(32)), false);
});
