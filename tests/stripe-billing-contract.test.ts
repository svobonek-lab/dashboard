import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const contract = readFileSync(new URL('../supabase/staging/20261015_stripe_billing_contract.sql', import.meta.url), 'utf8');
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
  assert.match(workflow, /supabase\/tests\/stripe_billing_verify\.sql/);
});
