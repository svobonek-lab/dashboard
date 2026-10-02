import test from 'node:test';
import assert from 'node:assert/strict';
import { buildRecoveryRequest, parseRecoveryResponse, validateNewPassword } from '../src/app/authRecovery';

test('password recovery sends only a normalized email and never an owner-chosen password', () => {
  assert.deepEqual(buildRecoveryRequest(' Worker@Example.COM '), { email: 'worker@example.com' });
  assert.throws(() => buildRecoveryRequest('not-an-email'), /e-mail/i);
});

test('password recovery accepts only the fail-safe server response contract', () => {
  assert.equal(parseRecoveryResponse({ requested: true, message: 'Odesláno' }), 'Odesláno');
  assert.throws(() => parseRecoveryResponse({ success: true, resetLink: 'https://unsafe.invalid' }), /nepotvrdil/i);
});

test('new password is validated in the authenticated recovery session', () => {
  assert.equal(validateNewPassword('DlouheHeslo-2026'), 'DlouheHeslo-2026');
  assert.throws(() => validateNewPassword('kratke'), /10 znaků/i);
});
