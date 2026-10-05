import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const contractUrl = new URL('../supabase/staging/20261005_platform_admin_contract.sql', import.meta.url);

test('platform contract isolates administrator identity from tenant membership', () => {
  const contract = fs.readFileSync(contractUrl, 'utf8');
  assert.match(contract, /create table if not exists public\.app_platform_admins/i);
  assert.match(contract, /user_id uuid primary key references auth\.users\(id\)/i);
  assert.match(contract, /alter table public\.app_platform_admins enable row level security/i);
  assert.match(contract, /revoke all on public\.app_platform_admins from public, anon, authenticated/i);
  assert.doesNotMatch(contract, /alter table public\.app_(?:companies|members|leads)[\s\S]*app_(?:is_)?platform_admin/i);
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
