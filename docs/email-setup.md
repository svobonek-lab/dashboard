# Transactional email setup

The outbox worker currently uses the Resend Email API. Configure a verified sender domain in the provider, then add the exact DNS records shown for that domain in the provider dashboard. DNS targets and selectors vary by domain and account, so this guide intentionally contains placeholders only.

## Application configuration

Set these server-side variables in the deployment environment where the worker runs:

- `EMAIL_PROVIDER_API_KEY`: the Resend API key. Keep it server-side; do not use a `VITE_` prefix.
- `EMAIL_FROM`: a sender in the verified domain, such as `StavbaFlow <notifications@your-domain.example>`.
- `CRON_SECRET`: a random secret used to authorize `/api/outbox-scheduler`.
- `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`: the worker's database connection. Never expose the service-role key to browser code.

The worker refuses to run before database access if either provider variable is missing. Queued rows remain queued and the API does not claim they were delivered.

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
3. Trigger one synthetic outbox notification and confirm the provider accepts it and the outbox row becomes `delivered`. Test Auth invitations separately through Supabase Auth SMTP.
4. Confirm an invalid sender or a temporary provider failure leaves a safe error code and a scheduled retry; a permanent provider rejection becomes `failed`.
5. Confirm an accepted send uses the same `outbox/<row-id>` idempotency key on retry.

The worker makes at most five provider attempts. Retryable failures use exponential delays of 1, 2, 4, and 8 minutes. A worker claim that remains `processing` for 15 minutes becomes eligible for recovery; the claim update is conditional so concurrent invocations do not both send the same row. Resend retains idempotency keys for 24 hours. To avoid an unsafe resend after that window, a `processing` row older than 20 hours is marked `failed` with `OUTBOX_DELIVERY_STATE_UNKNOWN` and needs operator review; do not requeue it blindly because the provider may already have accepted it.

The current Vercel Cron schedule runs once each day to remain compatible with the Hobby plan. A retry becomes eligible at its backoff time, but automatic delivery may wait for the next scheduled invocation (up to roughly a day). More frequent automatic retries require a hosting plan that supports more frequent Cron or another approved worker host. Do not promise minute-level delivery while this schedule is in use.

## Invitation email scope

Employee invitations currently use Supabase Auth `inviteUserByEmail` and the project's Auth SMTP directly. They do not enter `app_email_outbox` and are not retried by this worker. Keep Auth SMTP configured for invitations. Moving one-time Auth links into this queue needs a separate design for link generation, expiry, retries, and the protected outbox payload before changing that flow.
