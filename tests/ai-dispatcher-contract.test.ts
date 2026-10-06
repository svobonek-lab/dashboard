import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const sql = readFileSync(new URL('../supabase/staging/20261006_ai_dispatcher_contract.sql', import.meta.url), 'utf8');

test('AI inbox contract is idempotent, tenant-bound and service-only', () => {
  assert.match(sql, /create table if not exists public\.app_ai_inbox_events/i);
  assert.match(sql, /unique\s*\(company_id,\s*request_key\)/i);
  assert.match(sql, /insert into public\.app_leads/i);
  assert.match(sql, /'ai_inbox'/i);
  assert.match(sql, /revoke all on function public\.app_submit_ai_inbox_lead[\s\S]+from public,\s*anon,\s*authenticated/i);
  assert.match(sql, /grant execute on function public\.app_submit_ai_inbox_lead[\s\S]+to service_role/i);
});

test('dead-lead contract selects new leads older than 24 hours and queues once', () => {
  assert.match(sql, /l\.status\s*=\s*'new'/i);
  assert.match(sql, /l\.created_at\s*<=\s*now\(\)\s*-\s*interval\s*'24 hours'/i);
  assert.match(sql, /unique\s*\(lead_id\)/i);
  assert.match(sql, /insert into public\.app_email_outbox/i);
  assert.match(sql, /app_members[\s\S]+role\s*=\s*'owner'/i);
});

test('AI internal tables have RLS and no browser grants', () => {
  assert.match(sql, /alter table public\.app_ai_inbox_events enable row level security/i);
  assert.match(sql, /alter table public\.app_dead_lead_notifications enable row level security/i);
  assert.match(sql, /revoke all on (table )?public\.app_ai_inbox_events from public, anon, authenticated/i);
  assert.match(sql, /revoke all on (table )?public\.app_dead_lead_notifications from public, anon, authenticated/i);
});

test('public widget records new inquiries with the widget source', () => {
  assert.match(sql, /create or replace function public\.app_submit_public_lead/i);
  assert.match(sql, /'widget',\s*'new'/i);
  assert.match(sql, /grant execute on function public\.app_submit_public_lead[\s\S]+to anon/i);
});
