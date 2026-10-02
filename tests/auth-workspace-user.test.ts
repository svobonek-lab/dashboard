import assert from 'node:assert/strict';
import test from 'node:test';
import { toAuthenticatedWorkspaceUser } from '../src/app/authWorkspaceUser';

const authUser = {
  id: 'auth-user-1',
  email: 'owner@example.invalid',
  user_metadata: { name: 'Owner' },
};

test('uses the freshly resolved owner identity after login', () => {
  const result = toAuthenticatedWorkspaceUser(authUser, {
    organization_id: 'company-a',
    role: 'owner',
  });

  assert.equal(result.role, 'owner');
  assert.equal(result.organization_id, 'company-a');
});

test('does not guess an employee role while membership is unresolved', () => {
  assert.throws(
    () => toAuthenticatedWorkspaceUser(authUser, null),
    /aktivní členství/i,
  );
});
