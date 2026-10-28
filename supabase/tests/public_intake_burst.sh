#!/bin/sh
set -eu

output_dir="$(mktemp -d)"
trap 'rm -rf "$output_dir"' EXIT
started_ms="$(psql -qAt -U postgres -d postgres -c "SELECT floor(extract(epoch FROM clock_timestamp()) * 1000)::bigint")"
pids=""
request_number=1

while [ "$request_number" -le 50 ]; do
  log_file="$output_dir/request-${request_number}.log"
  psql -v ON_ERROR_STOP=1 -qAt -U postgres -d postgres \
    -c "SET ROLE service_role; SELECT public.app_submit_public_lead('firma-a', 'burst-${request_number}', 'Synthetic Customer', '+420123456', '', 'Burst test', 'Synthetic description', 0, repeat('d', 64));" \
    >"$log_file" 2>&1 &
  pids="$pids $!"
  request_number=$((request_number + 1))
done

accepted=0
limited=0
index=1
for pid in $pids; do
  if wait "$pid"; then
    accepted=$((accepted + 1))
  elif grep -Fq 'rate limited' "$output_dir/request-${index}.log"; then
    limited=$((limited + 1))
  else
    cat "$output_dir/request-${index}.log" >&2
    echo "FAIL: request ${index} failed for an unexpected reason" >&2
    exit 1
  fi
  index=$((index + 1))
done

finished_ms="$(psql -qAt -U postgres -d postgres -c "SELECT floor(extract(epoch FROM clock_timestamp()) * 1000)::bigint")"
elapsed_ms=$(( finished_ms - started_ms ))
if [ "$accepted" -ne 5 ] || [ "$limited" -ne 45 ] || [ "$elapsed_ms" -ge 10000 ]; then
  echo "FAIL: expected 5 accepted and 45 rate limited in under 10000ms; got $accepted accepted, $limited limited, ${elapsed_ms}ms" >&2
  exit 1
fi

printf 'PASS: 50 same-IP requests in %sms; %s accepted, %s rate limited\n' "$elapsed_ms" "$accepted" "$limited"
