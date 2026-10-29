# Staging public-intake acceptance

**Status: prepared and verified in disposable PostgreSQL; not applied to Supabase.** The current StavbaCore Staging catalog lacks `app_public_intake_events` and the hardened `app_submit_public_lead` overload. The synthetic Company A row has `public_form=false`. Production must remain untouched.

## Reviewed SQL order

In the Supabase SQL Editor, first confirm the project header is **StavbaCore Staging** (`xwzweltjvreqhjpbjrxa`). Do not run these files against StavbaFlow Production.

1. Apply `supabase/staging/20261029_public_intake_events.sql`. It creates only the missing idempotency table, enables RLS, revokes direct access from browser and service roles, and adds a deny policy for `anon` and `authenticated`.
2. Apply `supabase/migrations/20261026000000_public_intake_rate_limit.sql`. It adds the lead link and hashed-IP columns, enforces five unique submissions per tenant/IP per ten minutes, and exposes only the bounded RPC to `service_role`. Do not use `supabase/staging/pilot_public_intake.sql`; its anonymous RPC grant bypasses the server proxy.
3. Enable the public form only on the synthetic A fixture, after the first two SQL files have passed catalog and function privilege checks:

   ```sql
   update public.app_companies
   set public_form = true
   where slug = 'e2e-synthetic-company-a'
     and active = true
   returning id, slug, public_form;
   ```

   Expect exactly one synthetic company. If the row count differs, stop and inspect staging metadata. The matching rollback is to set `public_form=false` for that exact synthetic slug; retain its synthetic test leads for auditability.

The staging Preview must be rebuilt from code that reads the server-only `INTAKE_HASH_SECRET`. The secret is already configured as a Vercel sensitive Preview variable scoped to `codex/staging-preview-safety`; do not rename it to a `PUBLIC_` or `VITE_` variable. Keep `SUPABASE_SERVICE_ROLE_KEY` server-side.

## Disposable database evidence

PostgreSQL 17 applied the new bridge, the existing rate-limit migration, and `supabase/tests/public_intake_security_verify.sql` successfully. The test also started without `app_public_intake_events`, proving the bridge fills the known schema gap. The burst check completed 50 concurrent same-IP requests in 459 ms: five accepted and 45 returned rate-limited. Ten concurrent retries with one idempotency key returned one lead. No live staging or production SQL was applied during this verification.

## Still required for live acceptance

- Rebuild the approved staging Preview with the corrected server-only secret name.
- After review and manual application of the two SQL files above, enable the synthetic Company A public form.
- Run the Playwright idempotency and cross-company response checks, then the 200-request/one-minute k6 profile. Keep `docs/load-results.md` marked NOT RUN until actual staging measurements exist.
- GitHub Actions was unable to allocate a runner because the account spending limit is exhausted. This does not change the disposable SQL result and is not evidence that the live acceptance passed.
