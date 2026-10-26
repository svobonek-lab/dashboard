import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

function source(path: string): string {
  try { return readFileSync(new URL(path, import.meta.url), 'utf8'); }
  catch { return ''; }
}

const sentry = source('../src/shared/lib/sentry.ts');
const scheduler = source('../api/outbox-scheduler.ts');
const runEvidence = source('../api/outbox-run-evidence.ts');
const migration = source('../supabase/staging/20261027_outbox_run_evidence.sql');
const runbook = source('../docs/runbook-incident.md');

test('Sentry is DSN-gated and workspace context contains only a company UUID and approved role', () => {
  assert.match(sentry, /if\s*\(!dsn\)[\s\S]{0,160}return/);
  assert.match(sentry, /setSentryWorkspaceContext/);
  assert.match(sentry, /company_id/);
  assert.match(sentry, /platform_admin/);
  assert.doesNotMatch(sentry, /Sentry\.setUser|email:|displayName|user\.email|user\.name/);
});

test('scheduler persists bounded run summaries and never returns provider or customer details', () => {
  assert.match(scheduler, /persistOutboxRun/);
  assert.match(runEvidence, /app_email_outbox_runs/);
  assert.match(runEvidence, /selected_count/);
  assert.match(runEvidence, /error_code/);
  assert.doesNotMatch(scheduler, /providerMessageId|results,|sendErr\.message/);
  assert.match(migration, /create table if not exists public\.app_email_outbox_runs/i);
  assert.match(migration, /enable row level security/i);
  assert.match(migration, /grant select, insert, update on table public\.app_email_outbox_runs to service_role/i);
  assert.doesNotMatch(migration, /grant [^;]*(anon|authenticated)/i);
});

test('incident runbook covers Supabase, email outbox, Stripe and evidence-preserving escalation', () => {
  for (const topic of ['Supabase', 'outbox', 'Stripe', 'Vercel', 'zákazník|customer']) assert.match(runbook, new RegExp(topic, 'i'));
  assert.match(runbook, /do not[^.]*?(credential|secret|token)/i);
  assert.match(runbook, /incidentu|incident/i);
});
