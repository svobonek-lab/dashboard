# Public intake rate-limit staging apply

This is a gated operator procedure for `supabase/migrations/20261026000000_public_intake_rate_limit.sql`. It is not an instruction to apply to production.

## Preflight

1. Capture a fresh metadata-only snapshot for the declared staging project. Confirm the project ref is the staging ref and differs from the production ref.
2. Stop if the target lacks `public.app_public_intake_events`, its `(company_id, request_key)` uniqueness constraint, `public.app_leads` columns used by the function, or the expected role `service_role`. Do not paste this migration into SQL Editor until these dependencies are reconciled with the actual `app_*` schema.
3. Review the exact migration diff. It replaces the `app_submit_public_lead` overload, revokes direct `anon`/`authenticated` execution, adds the HMAC-only client IP column/index, serializes same-IP requests, and enforces five unique requests per company/IP in ten minutes.
4. Confirm Preview is wired to the same isolated staging ref. Stop if Preview points at production.

## Apply and verify

1. In Supabase SQL Editor, select the verified staging project by project ref and run the reviewed migration exactly once. Do not run the disposable test setup or `public_intake_security_verify.sql` in a shared staging database: those scripts create persistent synthetic leads/events and use fixed fixture keys.
2. Capture a new metadata-only snapshot. Confirm the migration function signature and `service_role` execute grant, and confirm `anon` and `authenticated` cannot execute the RPC.
3. Run `npm run test:e2e:staging -- --grep 'public inquiry'` against staging Preview with unique synthetic request keys. Verify duplicate submission creates one lead and that the public response contains only `{ status: "accepted" }`.
4. For the burst check, use only disposable PostgreSQL: the 50-request parallel test is not a shared-staging load test. Staging rate limits accumulate state and must not be consumed with a burst acceptance run.
5. Record the UTC timestamp, Preview commit, staging ref, migration version and sanitized outcomes. Never record credentials, customer data, or raw IPs.

## Current status

The last available staging snapshot did not contain the rate-limit RPC/event table, so this procedure is blocked at preflight until a fresh metadata capture shows the dependencies. No staging or production migration was applied by this work.
