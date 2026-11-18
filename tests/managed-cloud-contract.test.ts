import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('paid admin onboarding keeps a new tenant private and without entitlement', () => {
  const sql = readFileSync(new URL('../supabase/staging/20261117_managed_cloud_admin_onboarding.sql', import.meta.url), 'utf8');
  assert.match(sql, /p_plan not in \('starter', 'growth', 'pro'\)/);
  assert.match(sql, /p_plan, 'not_configured', false, false/);
  assert.match(sql, /insert into public\.app_email_outbox/);
  assert.match(sql, /insert into public\.app_platform_audit_events/);
  assert.match(sql, /revoke all on function public\.app_platform_create_company_onboarding[\s\S]*?from public, anon, authenticated/);
  assert.match(sql, /grant execute on function public\.app_platform_create_company_onboarding[\s\S]*?to service_role/);
});

test('first paid activation has a separate service-only transaction and subscription updates cannot preactivate', () => {
  const sql = readFileSync(new URL('../supabase/staging/20261117_managed_cloud_first_activation.sql', import.meta.url), 'utf8');
  assert.match(sql, /p_payment_status = 'paid'/);
  assert.match(sql, /v_company\.subscription_status = ''not_configured'' then v_result := ''stale''/);
  assert.match(sql, /subscription_status = 'not_configured'/);
  assert.match(sql, /app_activate_paid_checkout/);
  assert.match(sql, /app_stripe_webhook_events/);
  assert.match(sql, /reported_subscription_status/);
  assert.match(sql, /i\.accepted_by = m\.user_id/);
  assert.match(sql, /app_platform_audit_events/);
  assert.match(sql, /revoke all on function public\.app_activate_paid_checkout[\s\S]*?from public, anon, authenticated/);
  assert.match(sql, /grant execute on function public\.app_activate_paid_checkout[\s\S]*?to service_role/);
});

test('CI executes both proposals and negative cases in disposable PostgreSQL', () => {
  const workflow = readFileSync(new URL('../.github/workflows/verify.yml', import.meta.url), 'utf8');
  assert.match(workflow, /managed_cloud_setup\.sql[\s\S]*?20261117_managed_cloud_admin_onboarding\.sql[\s\S]*?20261117_managed_cloud_first_activation\.sql[\s\S]*?managed_cloud_verify\.sql/);
});
