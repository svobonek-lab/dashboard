import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const contract = readFileSync(new URL('../supabase/staging/20261015_stripe_billing_contract.sql', import.meta.url), 'utf8');
const completion = readFileSync(new URL('../supabase/staging/20261016_stripe_billing_completion.sql', import.meta.url), 'utf8');
const workflow = readFileSync(new URL('../.github/workflows/verify.yml', import.meta.url), 'utf8');

test('Stripe billing contract is service-only, idempotent and rejects cross-tenant customer binding', () => {
  assert.match(contract, /add column if not exists stripe_customer_id text/i);
  assert.match(contract, /add column if not exists current_period_end timestamptz/i);
  assert.match(contract, /subscription_status[^;]+check/i);
  assert.match(contract, /app_stripe_webhook_events/i);
  assert.match(contract, /on conflict \(event_id\) do nothing/i);
  assert.match(contract, /stripe customer is already bound to another tenant/i);
  assert.match(contract, /revoke all on function public\.app_apply_stripe_subscription_event/i);
  assert.match(contract, /grant execute on function public\.app_apply_stripe_subscription_event[^;]+to service_role/i);
  assert.doesNotMatch(contract, /grant execute[^;]+to (anon|authenticated)/i);
});

test('CI executes the disposable Stripe billing database contract', () => {
  assert.match(workflow, /stripe-billing-contract:/);
  assert.match(workflow, /supabase\/tests\/stripe_billing_setup\.sql/);
  assert.match(workflow, /supabase\/staging\/20261015_stripe_billing_contract\.sql/);
  assert.match(workflow, /supabase\/staging\/20261016_stripe_billing_completion\.sql/);
  assert.match(workflow, /supabase\/tests\/stripe_billing_verify\.sql/);
  assert.match(workflow, /supabase\/tests\/stripe_billing_concurrency\.sh/);
});

test('billing completion functions are service-only and plan changes cannot activate access', () => {
  assert.match(completion, /app_bind_stripe_customer/);
  assert.match(completion, /app_platform_set_billing_plan/);
  assert.match(completion, /v_plan not in \('pilot', 'starter', 'growth'\)/);
  assert.match(completion, /revoke all on function public\.app_bind_stripe_customer\(uuid, text\) from public, anon, authenticated/i);
  assert.match(completion, /revoke all on function public\.app_platform_set_billing_plan\(uuid, uuid, text\) from public, anon, authenticated/i);
  assert.doesNotMatch(completion, /set subscription_status/);
});
