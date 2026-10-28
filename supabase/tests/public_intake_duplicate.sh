#!/bin/sh
set -eu

output_dir="$(mktemp -d)"
trap 'rm -rf "$output_dir"' EXIT
request_key="parallel-idempotency-key"
pids=""
index=1

while [ "$index" -le 10 ]; do
  psql -v ON_ERROR_STOP=1 -qAt -U postgres -d postgres \
    -c "SET ROLE service_role; SELECT public.app_submit_public_lead('firma-a', '${request_key}', 'Synthetic Customer', '+420123456', '', 'Parallel retry', 'Synthetic idempotency acceptance', 0, repeat('e', 64));" \
    >"$output_dir/request-${index}.log" 2>&1 &
  pids="$pids $!"
  index=$((index + 1))
done

for pid in $pids; do
  if ! wait "$pid"; then
    echo "FAIL: a parallel retry returned an unexpected database error" >&2
    exit 1
  fi
done

distinct_ids="$(cat "$output_dir"/request-*.log | sort -u | wc -l | tr -d ' ')"
if [ "$distinct_ids" -ne 1 ]; then
  echo "FAIL: parallel retries returned different lead ids" >&2
  exit 1
fi

lead_count="$(psql -qAt -U postgres -d postgres -c "SELECT count(*) FROM public.app_leads l JOIN public.app_public_intake_events e ON e.lead_id = l.id WHERE e.company_id = '10000000-0000-4000-8000-000000000001' AND e.request_key = '${request_key}';")"
event_count="$(psql -qAt -U postgres -d postgres -c "SELECT count(*) FROM public.app_public_intake_events WHERE company_id = '10000000-0000-4000-8000-000000000001' AND request_key = '${request_key}';")"
if [ "$lead_count" -ne 1 ] || [ "$event_count" -ne 1 ]; then
  echo "FAIL: expected exactly one lead and one idempotency event; got $lead_count leads and $event_count events" >&2
  exit 1
fi

echo 'PASS: 10 parallel submissions with one idempotency key returned one synthetic lead'
