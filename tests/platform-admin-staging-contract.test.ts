import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const contractUrl = new URL('../supabase/staging/20261005_platform_admin_contract.sql', import.meta.url);
const supportContractUrl = new URL('../supabase/staging/20261009_platform_admin_support_contract.sql', import.meta.url);

test('platform contract isolates administrator identity from tenant membership', () => {
  const contract = fs.readFileSync(contractUrl, 'utf8');
  assert.match(contract, /create table if not exists public\.app_platform_admins/i);
  assert.match(contract, /user_id uuid primary key references auth\.users\(id\)/i);
  assert.match(contract, /alter table public\.app_platform_admins enable row level security/i);
  assert.match(contract, /revoke all on public\.app_platform_admins from public, anon, authenticated/i);
  assert.doesNotMatch(contract, /alter table public\.app_(?:companies|members|leads)[\s\S]*app_(?:is_)?platform_admin/i);
});

test('support contract keeps tenant RLS intact and exposes service-only actor-bound functions', () => {
  const contract = fs.readFileSync(supportContractUrl, 'utf8');
  assert.match(contract, /app_platform_list_companies\(p_actor_user_id uuid\)/i);
  assert.match(contract, /app_platform_create_support_session\(p_actor_user_id uuid, p_company_id uuid, p_reason text\)/i);
  assert.match(contract, /app_platform_get_support_session\(p_actor_user_id uuid, p_session_id uuid\)/i);
  assert.match(contract, /app_platform_revoke_support_session\(p_actor_user_id uuid, p_session_id uuid\)/i);
  assert.match(contract, /access_mode = 'read_only'/i);
  assert.match(contract, /interval '30 minutes'/i);
  assert.match(contract, /set search_path = ''/i);
  assert.match(contract, /grant execute on function[\s\S]*to service_role/i);
  assert.doesNotMatch(contract, /grant execute on function[\s\S]*to (?:anon|authenticated)/i);
  assert.doesNotMatch(contract, /create policy[\s\S]*app_(?:companies|members|leads)/i);
});

test('write-capable support remains bounded, actor-bound, tenant-scoped and fully audited', () => {
  const contract = fs.readFileSync(new URL('../supabase/staging/20261010_platform_admin_write_support_contract.sql', import.meta.url), 'utf8');
  assert.match(contract, /access_mode in \('read_only', 'full_support'\)/i);
  assert.match(contract, /app_platform_support_workspace\(p_actor_user_id uuid, p_session_id uuid\)/i);
  assert.match(contract, /app_platform_support_mutate_lead\([\s\S]*p_request_id text/i);
  assert.match(contract, /app_platform_get_support_session\([\s\S]*s\.access_mode = 'full_support'/i);
  assert.match(contract, /s\.platform_admin_id = p_actor_user_id[\s\S]*s\.access_mode = 'full_support'/i);
  assert.match(contract, /insert into public\.app_platform_audit_events/i);
  assert.match(contract, /support_session_id, request_id/i);
  assert.match(contract, /grant execute on function[\s\S]*to service_role/i);
  assert.doesNotMatch(contract, /grant execute on function[\s\S]*to (?:anon|authenticated)/i);
  assert.doesNotMatch(contract, /create policy[\s\S]*app_(?:companies|members|leads)/i);
});

test('self-role lookup exposes only the caller role through a fixed search path', () => {
  const contract = fs.readFileSync(contractUrl, 'utf8');
  assert.match(contract, /function public\.app_get_my_platform_role\(\)[\s\S]*returns jsonb/i);
  assert.match(contract, /security definer[\s\S]*set search_path = ''/i);
  assert.match(contract, /where a\.user_id = auth\.uid\(\)[\s\S]*a\.active = true/i);
  assert.match(contract, /revoke all on function public\.app_get_my_platform_role\(\) from public, anon/i);
  assert.match(contract, /grant execute on function public\.app_get_my_platform_role\(\) to authenticated/i);
});

test('support sessions are read-only, bounded and audited transactionally', () => {
  const contract = fs.readFileSync(contractUrl, 'utf8');
  assert.match(contract, /create table if not exists public\.app_platform_support_sessions/i);
  assert.match(contract, /expires_at timestamptz not null/i);
  assert.match(contract, /expires_at <= created_at \+ interval '30 minutes'/i);
  assert.match(contract, /access_mode text not null default 'read_only'/i);
  assert.match(contract, /create table if not exists public\.app_platform_audit_events/i);
  assert.match(contract, /function public\.app_create_platform_support_session/i);
  assert.match(contract, /insert into public\.app_platform_audit_events/i);
  assert.match(contract, /grant execute on function public\.app_create_platform_support_session\(uuid, text\) to service_role/i);
  assert.doesNotMatch(contract, /grant execute on function public\.app_create_platform_support_session\(uuid, text\) to authenticated/i);
});
