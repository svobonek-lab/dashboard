#!/usr/bin/env bash
set -euo pipefail

container="${1:-stripe-billing-postgres}"
output_dir="$(mktemp -d)"
trap 'rm -rf "$output_dir"' EXIT

apply_event="select public.app_apply_stripe_subscription_event('evt_parallel_a','customer.subscription.updated','2026-10-15T14:00:00Z',null,'cus_a','sub_a','past_due','2026-11-15T00:00:00Z')"
printf 'begin;\nset role service_role;\n%s;\nselect pg_sleep(6);\ncommit;\n' "$apply_event" > "$output_dir/first.sql"
printf 'set role service_role;\n%s;\n' "$apply_event" > "$output_dir/second.sql"

# Hold the first transaction open after the RPC returns so the second caller
# has to wait on the same company row. This exposes concurrent event delivery.
docker exec -i -e PGAPPNAME=stripe_billing_first "$container" \
  psql -X -A -t -v ON_ERROR_STOP=1 -U postgres \
  < "$output_dir/first.sql" > "$output_dir/first" &
first_pid=$!

first_sleeping=false
for attempt in {1..40}; do
  if ! kill -0 "$first_pid" 2>/dev/null; then break; fi
  state="$(docker exec "$container" psql -X -A -t -v ON_ERROR_STOP=1 -U postgres \
    -c "select count(*) from pg_stat_activity where application_name='stripe_billing_first' and wait_event='PgSleep';")"
  if [[ "$state" == "1" ]]; then first_sleeping=true; break; fi
  sleep 0.1
done
if [[ "$first_sleeping" != true ]]; then
  wait "$first_pid" || true
  echo 'First Stripe event never held its transaction open.' >&2
  exit 1
fi

docker exec -i -e PGAPPNAME=stripe_billing_second "$container" \
  psql -X -A -t -v ON_ERROR_STOP=1 -U postgres \
  < "$output_dir/second.sql" > "$output_dir/second" &
second_pid=$!

second_blocked=false
for attempt in {1..40}; do
  if ! kill -0 "$second_pid" 2>/dev/null; then break; fi
  state="$(docker exec "$container" psql -X -A -t -v ON_ERROR_STOP=1 -U postgres \
    -c "select count(*) from pg_stat_activity where application_name='stripe_billing_second' and wait_event_type='Lock';")"
  if [[ "$state" == "1" ]]; then second_blocked=true; break; fi
  sleep 0.1
done

wait "$first_pid"
wait "$second_pid"
if [[ "$second_blocked" != true ]]; then
  echo 'Concurrent Stripe event did not wait on the company lock.' >&2
  exit 1
fi
grep -Fxq 'applied' "$output_dir/first"
grep -Fxq 'duplicate' "$output_dir/second"

result="$(docker exec "$container" psql -X -A -t -v ON_ERROR_STOP=1 -U postgres \
  -c "select count(*) from public.app_stripe_webhook_events where event_id='evt_parallel_a' and result='applied';")"
[[ "$result" == "1" ]]
result="$(docker exec "$container" psql -X -A -t -v ON_ERROR_STOP=1 -U postgres \
  -c "select subscription_status from public.app_companies where id='10000000-0000-4000-8000-000000000001' and stripe_event_created_at='2026-10-15T14:00:00Z';")"
[[ "$result" == "past_due" ]]
echo 'Concurrent Stripe event delivery: one applied, one duplicate, one billing state.'
