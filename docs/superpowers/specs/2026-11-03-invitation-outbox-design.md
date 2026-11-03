# Invitation delivery through the email outbox

## Intent

Make employee and platform-owner invitation email delivery durable and retryable through the existing `app_email_outbox` and configured Resend provider. Preserve the current membership and invitation acceptance rules. A queued invitation must never be reported as delivered until the provider confirms it.

## Current behavior

- Employee invite API creates an `app_invites` row, then calls Supabase Auth `inviteUserByEmail`, which sends through Supabase Auth SMTP.
- Platform-owner invite and resend routes use the same Auth SMTP path.
- The Resend outbox worker handles queued notifications but not these Auth invite emails.
- Auth invite links are single-use and expire under Supabase Auth's configured OTP expiry. The application invite row separately expires after seven days.
- Vercel Hobby's configured cron runs once per day, so an eligible retry may not run until the following day.

## Design

1. Keep authorization, invitation creation, expiry, acceptance, revocation, and tenant boundaries in the existing RPC/application contract.
2. Replace direct Auth email sending with `auth.admin.generateLink({ type: 'invite', ... })` in the server-side outbox pipeline. Supabase documents this API for links sent through a custom email provider.
3. Queue the invite delivery durably before returning success. The queue item contains the company/invite identifiers and safe template fields; it does not contain a bearer link until the worker generates one.
4. Before provider submission, generate the Supabase link and encrypt it using a dedicated `EMAIL_LINK_ENCRYPTION_KEY`. Persist the encrypted link so retries send identical content and reuse the same Resend idempotency key. Never return, log, or include the plaintext link in run evidence.
5. If a saved link has expired before delivery, generate a fresh link, atomically replace the encrypted value, and increment a payload generation used in the provider idempotency key. Delivery of older, expired links remains harmless.
6. Clear encrypted link material after confirmed delivery, terminal failure, revocation, or invite expiry. Keep ordinary outbox rows and aggregate run evidence according to the existing retention behavior.
7. Retry provider failures with the existing five-attempt exponential backoff and preserve the current manual review state for ambiguous provider outcomes. The daily Hobby cron means automatic attempts can be delayed up to about a day; this must be shown honestly until a more frequent approved scheduler exists.
8. Apply the required schema change only as a reviewable migration proposal. Do not apply it to staging or production in this task without a separate staging approval; never write to production.

## Failure decisions

- If link generation succeeds but encryption or database persistence fails, do not call the email provider. Leave the outbox item retryable and resolve the existing Auth user by normalized email plus the exact pending `app_invites.id` in `user_metadata.invite_id` before choosing the correct Auth link type on retry. The metadata is correlation only, never authorization or a tenant source. A mismatched `company_id`, `role`, invite ID, accepted/revoked/expired application invite, or missing metadata requires manual review; never infer tenant scope from Auth metadata or send a plaintext in-memory link as a fallback. The application RPC remains the authority for invite acceptance.
- Resend idempotency protects retries only within its documented retention window. The worker may automatically recover a stale claim and retry with the same idempotency key while still inside that window. Once the existing 20-hour ambiguity threshold is reached, mark delivery state unknown and require manual review. A manually requeued delivery gets a new payload generation and can result in a duplicate if the original provider acceptance was not recorded; this limitation must be visible in operator guidance.

## Security and compatibility constraints

- The encryption key is server-only and distinct from provider credentials. Missing key configuration disables invite dispatch; it must not fall back to plaintext or Supabase SMTP.
- Only the service-role worker can read or update outbox rows. Browser roles must not gain access.
- Tenant ID and invite ID come from the verified server-side invitation record, never caller-supplied template metadata.
- Existing Auth invitation acceptance and password setup remain unchanged. No invitation is activated merely because email was queued.
- The UI must distinguish “queued” from “sent” and provide a safe retry/status path without creating duplicate memberships or invitation rows.
- Initial scope is employee invitations plus the existing platform-owner invitation/resend routes. Password recovery and other Auth emails remain on Auth SMTP unless separately designed.

## Acceptance criteria

- Successful invitation queueing returns a durable queued result; delivery is at-least-once with provider idempotency for retries inside the provider's retention window.
- A transient provider failure followed by success sends the same unexpired link with a stable idempotency key.
- An expired queued link is regenerated before sending, stored encrypted, and sent under a new payload generation.
- Permanent failure, revocation, expiry, and ambiguous delivery leave no plaintext token in database fields, logs, API output, or aggregate evidence.
- Tests cover successful delivery, transient retry, provider permanent failure, expiry renewal, revocation, encryption round trip, and recovery after the worker crashes between link creation and provider acknowledgement.
- No production migration or environment-variable change occurs.

## Open implementation detail

The current database contract has no encrypted-link or payload-generation columns. The builder should choose the smallest additive migration and a deterministic cleanup strategy; it must preserve existing outbox rows and avoid broadening grants.
