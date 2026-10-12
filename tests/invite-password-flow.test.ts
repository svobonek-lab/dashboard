import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  buildCompletedInviteMetadata,
  isInviteCallbackUrl,
  shouldLoadWorkspaceIdentity,
} from '../src/app/invitePassword.js';

const invitedOwner = {
  id: 'owner-auth-id',
  invited_at: '2026-10-12T10:00:00.000Z',
  user_metadata: { invite_id: 'invite-owner', role: 'owner', company_name: 'Střechy Novák' },
};

const invitedEmployee = {
  id: 'employee-auth-id',
  invited_at: '2026-10-12T10:00:00.000Z',
  user_metadata: { invite_id: 'invite-employee', role: 'employee', company_name: 'Střechy Novák' },
};

test('invite callback is recognized in both hash and query parameters', () => {
  assert.equal(isInviteCallbackUrl('https://app.example.cz/login#access_token=secret&type=invite'), true);
  assert.equal(isInviteCallbackUrl('https://app.example.cz/login?type=invite'), true);
  assert.equal(isInviteCallbackUrl('https://app.example.cz/login?type=recovery'), false);
});

test('invited owner session cannot resolve a dashboard before setting a password', () => {
  assert.equal(shouldLoadWorkspaceIdentity(invitedOwner, 'https://app.example.cz/login#type=invite'), false);
});

test('invited employee session uses the same password gate', () => {
  assert.equal(shouldLoadWorkspaceIdentity(invitedEmployee, 'https://app.example.cz/login#type=invite'), false);
});

test('successful password setup preserves invite metadata and unlocks identity resolution', () => {
  const user = {
    ...invitedOwner,
    user_metadata: buildCompletedInviteMetadata(invitedOwner.user_metadata, '2026-10-12T10:05:00.000Z'),
  };
  assert.equal(user.user_metadata.invite_password_set, true);
  assert.equal(user.user_metadata.invite_id, 'invite-owner');
  assert.equal(shouldLoadWorkspaceIdentity(user, 'https://app.example.cz/login'), true);
});

test('application keeps an invited session out of protected dashboards until password completion', () => {
  const context = readFileSync(new URL('../context/OrganizationContext.tsx', import.meta.url), 'utf8');
  const guard = readFileSync(new URL('../src/app/ProtectedRoute.tsx', import.meta.url), 'utf8');
  const login = readFileSync(new URL('../components/LoginPage.tsx', import.meta.url), 'utf8');
  assert.match(context, /requiresInvitePasswordSetup\(session\.user,[\s\S]{0,350}setDbUser\(null\)/);
  assert.match(guard, /isConfigured && \(!user \|\| !dbUser\)[\s\S]{0,120}Navigate to="\/login"/);
  assert.match(login, /invitePasswordRequired[\s\S]*Nastavte si heslo/);
  assert.match(login, /completeInvitePasswordSetup\(validatedPassword\)/);
});

test('owner and employee invitations include company name for the Czech email template', () => {
  const ownerRoute = readFileSync(new URL('../api/_platform/routes/companies.ts', import.meta.url), 'utf8');
  const employeeRoute = readFileSync(new URL('../api/invite-employee.ts', import.meta.url), 'utf8');
  assert.match(ownerRoute, /company_name:\s*value\.name/);
  assert.match(employeeRoute, /company_name:\s*company\.name/);
  assert.match(employeeRoute, /APP_INVITE_DELIVERY_UNAVAILABLE/);
});

test('repository contains the Czech invite template and SMTP operator runbook', () => {
  const template = readFileSync(new URL('../supabase/templates/invite.html', import.meta.url), 'utf8');
  const runbook = readFileSync(new URL('../docs/supabase-invite-email.md', import.meta.url), 'utf8');
  assert.match(template, /Přijměte pozvánku/);
  assert.match(template, /Data\.company_name/);
  assert.match(template, /ConfirmationURL/);
  assert.match(template, /7 dní/);
  assert.match(runbook, /vlastní SMTP/i);
  assert.match(runbook, /reálnou schránk/i);
  assert.match(runbook, /SMTP není/i);
});

test('database invitation acceptance requires a real password before membership activation', () => {
  const contract = readFileSync(
    new URL('../supabase/staging/20261013_invite_password_gate.sql', import.meta.url),
    'utf8',
  );
  assert.match(contract, /encrypted_password/i);
  assert.match(contract, /from auth\.users/i);
  assert.match(contract, /password setup required/i);
  assert.match(contract, /security definer\s+set search_path = ''/i);
  assert.match(contract, /revoke all on function app_private\.accept_invite\(uuid\)/i);
});
