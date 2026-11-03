# Invitation outbox implementation plan

## Context
Implement the approved invitation design in the existing outbox PR. The specification is `docs/superpowers/specs/2026-11-03-invitation-outbox-design.md`. Supabase `generateLink` is used server-side with a custom provider; it does not send email itself ([official reference](https://supabase.com/docs/reference/javascript/auth-admin-generatelink)). No live database or deployment configuration changes.

## File map
- `api/_invite-link-crypto.ts`: AES-256-GCM, URL-safe ciphertext envelope; no plaintext logging.
- `api/_invite-outbox.ts`: queue helpers, invitation validation, encrypted link generation/recovery, email rendering.
- `api/_outbox-scheduler.ts`: dispatch invitation records alongside regular notification records; clear sensitive payload on terminal transitions.
- `api/invite-employee.ts`, `api/_platform/routes/companies.ts`: queue invitations and return `queued`, without Auth SMTP.
- `src/app/providers/OrganizationProvider.tsx`, `src/pages/admin/companies/ui/Companies.tsx`: truthful queued/sent status.
- `supabase/staging/20261103_invitation_outbox.sql`: additive invitation columns, service-only grants/policies, status query/view support where needed; staging proposal only.
- `supabase/staging/20261103_outbox_minute_scheduler.sql`: opt-in pg_cron/pg_net/Vault scheduler, no embedded secret, rollback included; proposal only.
- `tests/invite-outbox.test.ts`, `tests/auth-api.test.ts`, `tests/platform-company-onboarding.test.ts`, SQL contracts: crypto, queue, retry, expiry, revocation, crash recovery, no leakage, and access boundaries.
- `docs/email-setup.md`: server-only variables, auth link TTL, provider setup, scheduler and truthful limitations.

## Tasks
1. Add RED/GREEN-tested AES-GCM encryption with strict 32-byte key validation, authenticated decrypt, and no plaintext persistence.
2. Add invitation outbox contracts/tests; queue employee and platform owner invites before API success, compensate company creation only when durable queue insert itself fails, and represent delivery as queued.
3. Extend worker with invitation validation, `generateLink`, stable provider idempotency, ciphertext persistence before send, expiry renewal, retry handling, and sensitive-field clearing on terminal outcomes. Existing Auth user recovery requires exact matching pending invite metadata; any mismatch fails closed for operator review.
4. Add staging-only SQL proposals for additive invite payload fields, service-role-only outbox access (removing existing browser read policy), safe cleanup/indexes, and a reversible minute scheduler using Vault credentials. Verify both on disposable PostgreSQL; do not apply to live Staging or Production.
5. Update UI labels and email setup guide; add static contract tests.
6. Run focused tests, full npm test/lint/build, inspect diff and secrets, update PR #160, then report CI outcomes. No merge.

## Configuration decisions
- `EMAIL_LINK_ENCRYPTION_KEY` must decode to exactly 32 bytes from base64; missing/invalid configuration keeps invite delivery queued and fails closed.
- `AUTH_EMAIL_LINK_TTL_SECONDS` is required, integer 300–3600 seconds, and must not exceed Supabase Auth email OTP expiry. The code treats the configured TTL as an upper bound, not proof of exact Auth server expiry.
- Only `service_role` can select or mutate outbox invitation payloads; no browser grants or policies are retained for `app_email_outbox` by the new staging proposal.
- Delivery is at least once; stable provider idempotency applies within Resend's retention window. Ambiguous delivery past 20 hours is not blindly retried.

## Review focus
- Crash after Auth creates a user but before ciphertext persistence.
- Concurrent workers racing on the same queued row/link generation.
- Outbox access through existing RLS policy or SQL grants.
- Expired/revoked/accepted invite link being sent after queueing.
- Plaintext link leaked by API, logs, evidence, provider errors, or terminal rows.
- Existing Auth user metadata mismatch and stale invite correlation.

## Completion
All acceptance criteria in the spec are covered by tests or explicitly reported as blocked by unavailable staging/deployment secrets. No staging/production writes or secret changes occur.
