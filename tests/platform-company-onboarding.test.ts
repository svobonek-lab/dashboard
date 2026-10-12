import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

import {
  createPlatformCompanyOnboarding,
  getPlatformCompanyAction,
  type PlatformCompanyOnboardingInput,
} from '../api/_platform/routes/companies.js';

const validInput: PlatformCompanyOnboardingInput = {
  name: 'Střechy Novák',
  slug: 'strechy-novak',
  ownerName: 'Jan Novák',
  ownerEmail: 'jan@example.cz',
  plan: 'pilot',
};

test('company onboarding validates input before touching Supabase', async () => {
  let called = false;
  const service = { rpc: async () => { called = true; return { data: null, error: null }; } } as any;
  await assert.rejects(
    createPlatformCompanyOnboarding(service, 'admin-a', { ...validInput, slug: 'Špatný slug' }, 'https://app.example.cz'),
    /COMPANY_SLUG_INVALID/,
  );
  assert.equal(called, false);
});

test('company onboarding creates one pending owner invite through the actor-bound RPC', async () => {
  const calls: Array<{ name: string; args: any }> = [];
  const service = {
    rpc: async (name: string, args: any) => {
      calls.push({ name, args });
      return { data: [{ company_id: 'company-a', invite_id: 'invite-a', slug: 'strechy-novak' }], error: null };
    },
    auth: { admin: { inviteUserByEmail: async () => ({ data: { user: { id: 'owner-auth-a' } }, error: null }) } },
  } as any;
  const result = await createPlatformCompanyOnboarding(service, 'admin-a', validInput, 'https://app.example.cz');
  assert.equal(result.companyId, 'company-a');
  assert.equal(result.inviteId, 'invite-a');
  assert.equal(result.invitationStatus, 'sent');
  assert.equal(calls[0].name, 'app_platform_create_company_onboarding');
  assert.deepEqual(calls[0].args, {
    p_actor_user_id: 'admin-a', p_name: 'Střechy Novák', p_slug: 'strechy-novak',
    p_owner_name: 'Jan Novák', p_owner_email: 'jan@example.cz', p_plan: 'pilot',
  });
});

test('duplicate slug is returned as a clear conflict', async () => {
  const service = { rpc: async () => ({ data: null, error: { code: '23505', message: 'duplicate key' } }) } as any;
  await assert.rejects(
    createPlatformCompanyOnboarding(service, 'admin-a', validInput, 'https://app.example.cz'),
    /COMPANY_SLUG_EXISTS/,
  );
});

test('an existing Auth identity is rejected before company creation', async () => {
  let rpcCalled = false;
  const service = {
    rpc: async () => { rpcCalled = true; return { data: null, error: null }; },
    auth: { admin: { listUsers: async () => ({ data: { users: [{ id: 'existing-owner', email: 'jan@example.cz' }] }, error: null }) } },
  } as any;
  await assert.rejects(
    createPlatformCompanyOnboarding(service, 'admin-a', validInput, 'https://app.example.cz'),
    /COMPANY_OWNER_ALREADY_REGISTERED/,
  );
  assert.equal(rpcCalled, false);
});

test('failed Auth delivery compensates company and invite state', async () => {
  const calls: Array<{ name: string; args: any }> = [];
  const service = {
    rpc: async (name: string, args: any) => {
      calls.push({ name, args });
      if (name === 'app_platform_create_company_onboarding') {
        return { data: [{ company_id: 'company-a', invite_id: 'invite-a', slug: 'strechy-novak' }], error: null };
      }
      return { data: true, error: null };
    },
    auth: { admin: { inviteUserByEmail: async () => ({ data: { user: null }, error: new Error('SMTP unavailable') }) } },
  } as any;
  await assert.rejects(
    createPlatformCompanyOnboarding(service, 'admin-a', validInput, 'https://app.example.cz'),
    /COMPANY_INVITE_SEND_FAILED/,
  );
  assert.equal(calls[1].name, 'app_platform_cancel_company_onboarding');
  assert.equal(calls[1].args.p_company_id, 'company-a');
  assert.equal(calls[1].args.p_invite_id, 'invite-a');
});

test('company actions are actor-bound and return only a public form path', async () => {
  const calls: Array<{ name: string; args: any }> = [];
  const service = { rpc: async (name: string, args: any) => {
    calls.push({ name, args });
    return { data: [{ slug: 'strechy-novak' }], error: null };
  } } as any;
  const result = await getPlatformCompanyAction(service, 'admin-a', 'company-a', 'public_form_link');
  assert.deepEqual(result, { publicFormPath: '/inquiry?org=strechy-novak' });
  assert.equal(calls[0].name, 'app_platform_get_public_form_link');
  assert.equal(calls[0].args.p_actor_user_id, 'admin-a');
});

test('staging SQL keeps onboarding service-only, transactional and audited', () => {
  const sql = readFileSync(new URL('../supabase/staging/20261012_platform_company_onboarding.sql', import.meta.url), 'utf8');
  assert.match(sql, /app_platform_create_company_onboarding/i);
  assert.match(sql, /insert into public\.app_companies[\s\S]*insert into public\.app_invites/i);
  assert.match(sql, /app_platform_audit_events[\s\S]*company_onboarding\.created/i);
  assert.match(sql, /set search_path = ''/i);
  assert.match(sql, /grant execute on function[\s\S]*to service_role/i);
  assert.doesNotMatch(sql, /grant execute on function public\.app_platform_(?:create_company_onboarding|cancel_company_onboarding|resend_owner_invite|get_public_form_link)[^;]*to (?:anon|authenticated)/i);
});

test('company admin UI exposes creation, onboarding state, resend and public form actions', () => {
  const source = readFileSync(new URL('../src/pages/admin/Companies.tsx', import.meta.url), 'utf8');
  assert.match(source, /Nová firma/);
  assert.match(source, /Pozvánka odeslána|Pozvánka přijata/);
  assert.match(source, /První poptávka/);
  assert.match(source, /Znovu poslat pozvánku/);
  assert.match(source, /Kopírovat odkaz formuláře/);
});
