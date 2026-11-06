import test from 'node:test';
import assert from 'node:assert/strict';
import { buildRecoveryRequest, getRecoveryErrorMessage, parseRecoveryResponse, validateNewPassword } from '../src/features/login';

test('password recovery sends only a normalized email and never an owner-chosen password', () => {
  assert.deepEqual(buildRecoveryRequest(' Worker@Example.COM '), { email: 'worker@example.com' });
  assert.throws(() => buildRecoveryRequest('not-an-email'), /e-mail/i);
});

test('password recovery accepts only the fail-safe server response contract', () => {
  assert.equal(parseRecoveryResponse({ requested: true, message: 'Odesláno' }), 'Odesláno');
  assert.throws(() => parseRecoveryResponse({ success: true, resetLink: 'https://unsafe.invalid' }), /nepotvrdil/i);
});

test('password recovery errors are actionable and never echo Auth provider details', () => {
  assert.match(getRecoveryErrorMessage({ code: 'AUTH_RECOVERY_DISABLED' }), /požádejte správce/i);
  assert.match(getRecoveryErrorMessage({ code: 'AUTH_RECOVERY_FAILED', error: 'provider secret detail' }), /později/i);
  assert.doesNotMatch(getRecoveryErrorMessage({ error: 'provider secret detail' }), /provider secret/i);
});

test('new password is validated in the authenticated recovery session', () => {
  assert.equal(validateNewPassword('DlouheHeslo-2026'), 'DlouheHeslo-2026');
  assert.throws(() => validateNewPassword('kratke'), /10 znaků/i);
});
