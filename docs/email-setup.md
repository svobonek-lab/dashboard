# Transactional email setup

The outbox worker currently uses the Resend Email API. Configure a verified sender domain in the provider, then add the exact DNS records shown for that domain in the provider dashboard. DNS targets and selectors vary by domain and account, so this guide intentionally contains placeholders only.

## Application configuration

Set these server-side variables in the deployment environment where the worker runs:

- `EMAIL_PROVIDER_API_KEY`: the Resend API key. Keep it server-side; do not use a `VITE_` prefix.
- `EMAIL_FROM`: a sender in the verified domain, such as `StavbaFlow <notifications@your-domain.example>`.
- `EMAIL_LINK_ENCRYPTION_KEY`: server-only base64 for exactly 32 random bytes; required to create or decrypt one-time invitation links. Keep it separate from provider keys and connector encryption keys.
- `AUTH_EMAIL_LINK_TTL_SECONDS`: integer from 300 through 3600, no greater than the Supabase Auth email OTP expiry configured in the project.
- `CRON_SECRET`: a random secret used to authorize `/api/outbox-scheduler`.
- `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`: the worker's database connection. Never expose the service-role key to browser code.

The worker refuses to run before database access if either provider variable is missing. Queued rows remain queued and the API does not claim they were delivered.

## Database prerequisites

The worker also requires `public.app_email_outbox_runs`; it fails closed with `OUTBOX_RUN_EVIDENCE_UNAVAILABLE` if that service-only run-evidence table is absent. The isolated StavbaCore Staging snapshot has an older outbox shape (`html`, `provider_id`, `sent_at`, and legacy statuses). The worker compatibility proposal at `supabase/staging/20261103_outbox_worker_legacy_compat.sql` adds its newer payload and delivery fields, keeps the existing columns and status values, and backfills their current data. Review that proposal against a fresh metadata snapshot before applying it. The separate `supabase/migrations/20261027000000_app_email_outbox_runs.sql` is also required. Neither file has been applied to Production; Staging application requires separate approval.

Do not copy staging schema or migration history into Production. The Production schema, grants, RLS policies, and migration history must be verified through the approved read-only metadata process before any Production release.

The code now reads `EMAIL_PROVIDER_API_KEY`. An existing deployment configured only with the older `RESEND_API_KEY` name will report the provider as unconfigured until an operator adds the new name through the deployment's secret manager. This change does not read or alter secret values.

## DNS records

Create the domain in Resend and copy the records shown there into the authoritative DNS zone for `your-domain.example`. Do not publish the placeholder text below as real DNS data.

| Purpose | DNS name | Type | Value |
| --- | --- | --- | --- |
| SPF | `<provider-specified-host>.your-domain.example` (often the root or a return-path subdomain) | TXT | `v=spf1 include:<provider-specified-spf-domain> ~all` |
| DKIM | `<provider-selector>._domainkey.your-domain.example` | TXT or CNAME, as specified by Resend | `<provider-generated-dkim-value-or-target>` |
| DMARC | `_dmarc.your-domain.example` | TXT | `v=DMARC1; p=none; rua=mailto:<reports-address@your-domain.example>` |

SPF and DKIM names, types, and targets must match the provider's current domain-verification screen. If the domain already has an SPF record, merge the provider's `include:` into that record; do not create a second SPF TXT record. Confirm that the final SPF record stays within the DNS lookup limit documented by your DNS provider.

Start DMARC with `p=none` while reviewing aggregate reports and confirming that SPF or DKIM aligns with the visible From domain. After monitoring and resolving legitimate sender failures, a domain administrator can choose to progress the policy to `quarantine` and then `reject`. Keep the reporting address controlled by the domain owner.

## Verification and retries

1. Verify the sender domain in Resend and wait for DNS propagation.
2. Configure the server-side variables in a non-production deployment first.
3. Trigger one synthetic outbox notification and confirm the provider accepts it and the outbox row becomes `delivered`. Invitation API success means the invitation was queued; only the worker can later report provider delivery.
4. Confirm an invalid sender or a temporary provider failure leaves a safe error code and a scheduled retry; a permanent provider rejection becomes `failed`.
5. Confirm an accepted send uses the same `outbox/<row-id>` idempotency key on retry.

The worker makes at most five provider attempts. Retryable failures use exponential delays of 1, 2, 4, and 8 minutes. A worker claim that remains `processing` for 15 minutes becomes eligible for recovery; the claim update is conditional so concurrent invocations do not both send the same row. Resend retains idempotency keys for 24 hours. To avoid an unsafe resend after that window, a `processing` row older than 20 hours is marked `failed` with `OUTBOX_DELIVERY_STATE_UNKNOWN` and needs operator review; do not requeue it blindly because the provider may already have accepted it.

The repository's Vercel Cron schedule runs once each day to remain compatible with the Hobby plan. The proposed `supabase/staging/20261103_outbox_minute_scheduler.sql` replaces that effective interval for the staging worker with Supabase Cron and `pg_net`, using endpoint and bearer secret values stored in Vault. Its rollback is `supabase/staging/20261103_outbox_minute_scheduler_rollback.sql`. Both are review artifacts only: do not apply them until the staging migration and Vault setup receive separate approval. Production scheduling is unchanged. Until the minute schedule is applied and verified in Staging, automatic delivery may wait until the next daily Vercel invocation.

## Invitation email scope

Employee and platform-owner invitations are queued in `app_email_outbox` and delivered by the server worker using Supabase Auth `generateLink` plus the configured email provider. `generateLink` creates a link but does not send it; the worker encrypts the link before persisting it, sends it through the provider, then clears ciphertext after confirmed delivery. If `EMAIL_LINK_ENCRYPTION_KEY` is missing or invalid, invite delivery stays fail-closed and queued/retryable. Do not fall back to Auth SMTP or store plaintext links. The staging proposal adds the ciphertext and generation columns and removes browser-role table access; it has not been applied. Existing Auth users whose metadata does not match the exact pending invite require operator review; the worker will not infer tenant or invite scope from mismatched metadata.

The TTL setting is an upper bound used for safe link renewal. Supabase's generated-link response does not return an expiry timestamp, so the worker relies on the configured Auth email OTP expiry being at least as long as `AUTH_EMAIL_LINK_TTL_SECONDS`. If it is not, links may expire sooner and retries will need a fresh generation. Resend uses `outbox/<row-id>/generation/<n>` idempotency keys; once the provider's retention window is exceeded, an ambiguous delivery requires operator review rather than blind retry.
