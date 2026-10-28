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

- A reviewed tenant-bound lead mutation RPC and matching browser integration are needed before the owner status/CSV/export/logout acceptance can pass. Do not enable `VITE_PILOT_WRITES` merely to make the test green.
- `app_create_invite` and `app_accept_invite` are absent on this staging schema, so invitation delivery/activation remain unverified.
- `app_lead_files` and private Storage bucket `lead-files` are absent; the full notes/files isolation and Storage tests cannot run. The proposed notes/files migration remains unapplied.
- GitHub Actions jobs currently do not start because of the account billing limit. Local unit, lint and build checks are separate evidence, not substitutes for the pending staging acceptance.
