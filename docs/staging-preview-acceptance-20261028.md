# StavbaCore staging Preview acceptance — 2026-10-28

Target: isolated StavbaCore Staging `xwzweltjvreqhjpbjrxa`, Preview branch `codex/staging-preview-safety`. Production `oncmtmrhmjlerbwkrecv` was not written.

## Verified

- Two synthetic companies, each with active owner and employee, were seeded idempotently. Auth login, JWT tenant claim, active membership and company query succeeded for owner A.
- After separate approval, staging received the existing Stripe billing SQL from `20261015_stripe_billing_contract.sql` and `20261016_stripe_billing_completion.sql`; both returned SQL success. Only the two synthetic companies were set to `subscription_status=active`, confirmed by `UPDATE ... RETURNING` with two rows.
- Owner login then exposed a schema mismatch: `app_invites.accepted_at` was missing (PostgREST 42703). A separate reviewed migration in PR #136 was approved and applied only to staging. Metadata confirmed a nullable `timestamptz` column afterward.
- Four targeted Playwright tests against the staging Preview: employee assignment scope, logout/tenant cache and owner menu passed. The owner critical flow failed at persisted lead status change.
- Manual mouse drag generated the Kanban drop event. The browser then reported the intentional pilot write gate (`Produkční datový zápis čeká na ověření RLS a bezpečných RPC funkcí.`); no lead write request was sent. Staging metadata confirms `app_leads` has a tenant-bound read policy but no owner/employee write policy or table grant.
- The pilot write URL guard formerly matched the ref now used as production; its unit test was reversed and the guard now matches the isolated staging ref. The Preview flag remains disabled, and this change alone does not enable writes.

## Remaining gates

- The separately reviewed staging lead-status RPC is prepared on `codex/staging-lead-status-rpc` with an isolated PostgreSQL A/B test and a narrow `VITE_STAGING_LEAD_STATUS_WRITES` browser flag. It is **not applied to staging** and the flag remains false until the migration receives its own approval. This slice does not make the general lead editor or assignment writes available.

- A reviewed tenant-bound lead mutation RPC and matching browser integration are needed before the owner status/CSV/export/logout acceptance can pass. Do not enable `VITE_PILOT_WRITES` merely to make the test green.
- `app_create_invite` and `app_accept_invite` are absent on this staging schema, so invitation delivery/activation remain unverified.
- `app_lead_files` and private Storage bucket `lead-files` are absent; the full notes/files isolation and Storage tests cannot run. The proposed notes/files migration remains unapplied.
- The current public intake API calls `app_submit_public_lead`, but staging exposes only the older `app_public_lead(text,jsonb,uuid)`. `app_public_intake_events` is also absent, and both synthetic firms have `public_form=false`. No public intake burst or idempotency request was sent to this mismatched target.
- `app_get_my_platform_role` returns 404 on this staging schema. The owner route tolerates it, but it generates console errors that will fail the later no-console-error acceptance check. Preview also logs a Vercel feedback script CSP error.
- Vercel has a `VITE_SENTRY_DSN` variable across environments. Stripe variables exist for Preview, but the test secret and Start price are scoped to other Preview branches, so the current staging branch has no verified Stripe TEST checkout configuration.
- GitHub Actions jobs currently do not start because of the account billing limit. Local unit, lint and build checks are separate evidence, not substitutes for the pending staging acceptance.
