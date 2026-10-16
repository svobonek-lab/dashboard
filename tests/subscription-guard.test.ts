import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { getSubscriptionAccess } from '../src/app/SubscriptionGuard.tsx';

test('subscription access is fail-closed and allows only active or trialing tenants', () => {
  assert.equal(getSubscriptionAccess('active', 'owner'), 'allowed');
  assert.equal(getSubscriptionAccess('trialing', 'employee'), 'allowed');
  assert.equal(getSubscriptionAccess('past_due', 'owner'), 'owner_blocked');
  assert.equal(getSubscriptionAccess('canceled', 'owner'), 'owner_blocked');
  assert.equal(getSubscriptionAccess(undefined, 'owner'), 'owner_blocked');
  assert.equal(getSubscriptionAccess('pilot', 'owner'), 'owner_blocked');
});

test('an employee with an unpaid tenant never receives the payment action', () => {
  assert.equal(getSubscriptionAccess('past_due', 'employee'), 'employee_blocked');
  assert.equal(getSubscriptionAccess('canceled', 'employee'), 'employee_blocked');
  assert.equal(getSubscriptionAccess(undefined, 'employee'), 'employee_blocked');
});

test('the guarded UI keeps employee copy separate and exposes checkout only to the owner branch', () => {
  const source = readFileSync(new URL('../src/app/SubscriptionGuard.tsx', import.meta.url), 'utf8');
  const employeeStart = source.indexOf("if (access === 'employee_blocked')");
  const employeeEnd = source.indexOf('\n  }\n\n  return (', employeeStart);
  const employeeBranch = source.slice(employeeStart, employeeEnd);
  assert.match(source, /Kontaktujte administrátora vaší společnosti\. Přístup k systému byl pozastaven\./);
  assert.match(source, /Předplatné vypršelo/);
  assert.match(source, /Přejít k platbě/);
  assert.doesNotMatch(employeeBranch, /Přejít k platbě|handlePayment/);
  assert.match(source, /memo\(SubscriptionGuardComponent\)/);
});
