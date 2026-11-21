# Staging Playwright smoke tests

Run the external acceptance scenarios only with the opt-in `staging-e2e`
workflow: use `workflow_dispatch`, or add the `e2e` label to a pull request
whose branch is in this repository. Fork PRs cannot receive staging secrets.
The workflow refuses to start unless the staging Supabase ref and web origin
differ from the configured production identities.

Configure these GitHub Actions **variables** with synthetic staging values:

- `STAGING_PREVIEW_URL`, `STAGING_SUPABASE_URL`, `STAGING_SUPABASE_PROJECT_REF`
- `PRODUCTION_BASE_URL`, `PRODUCTION_SUPABASE_PROJECT_REF`
- `STAGING_COMPANY_A_ID`, `STAGING_COMPANY_B_ID`
- `STAGING_OWNER_A_ID`, `STAGING_EMPLOYEE_A_ID`, `STAGING_OWNER_B_ID`, `STAGING_EMPLOYEE_B_ID`
- `STAGING_LEAD_A_ID`, `STAGING_LEAD_B_ID`
- `STAGING_PUBLIC_TENANT_KEY` (public tenant slug used by the form; not a credential)
- `STAGING_PUBLIC_INTAKE_ENABLED=true` only after the reviewed public-intake SQL is applied to staging and the synthetic company A intake is enabled; otherwise its replay test is reported as skipped.

Configure these GitHub Actions **secrets**:

- `STAGING_SUPABASE_PUBLISHABLE_KEY`
- `STAGING_OWNER_A_EMAIL`, `STAGING_OWNER_A_PASSWORD`
- `STAGING_EMPLOYEE_A_EMAIL`, `STAGING_EMPLOYEE_A_PASSWORD`
- `STAGING_OWNER_B_EMAIL`, `STAGING_OWNER_B_PASSWORD`

All four accounts and both companies must be synthetic fixtures in the isolated
staging project. Company A must have a lead assigned to employee A; company B
must have a lead assigned to employee B. Company B must also have synthetic
notes, invitation, and audit fixtures so the isolation assertion has positive
controls. The Storage scenario creates one uniquely named text object and
`app_lead_files` row as owner B, verifies owner A and employee A cannot read or
mutate it, then removes that exact row and object in a `finally` block. The
public tenant key must resolve to company A. The public-intake
rate-limit/idempotency SQL contract must already be present in staging before
its acceptance case can pass. Browser tests do not receive a service-role key.
The workflow's separate post-test cleanup step receives the staging key only to
call the service-only import rollback RPC for exact synthetic CSV marker rows in
company A. The cleanup refuses any other project, company, or row marker.

The public-intake replay test inserts one uniquely named synthetic lead and
leaves it in company A to preserve auditability. The cache-clear test seeds only
synthetic values in the logged-in browser's local storage and does not write to
the database. The owner critical-flow test verifies its synthetic CSV row and
restores the original lead status; a separate workflow step rolls back only
synthetic CSV imports bearing the reserved marker. The Sentry scenario sends one
synthetic exception after owner context loads and checks the event tags and
absence of email/name fields. No customer records are included in Playwright
assertions.

For a private repository that has exhausted its GitHub-hosted Actions allowance,
`workflow_dispatch` exposes local one-shot modes on the
`codex/staging-e2e-local-runner` branch: `local-ephemeral`, `sentry-only`,
`metadata-only`, `preview-configure`, `load-acceptance`, `load-recover`, and
`billing-setup`, and `billing-portal-inspect`. `billing-setup` prepares a single Stripe TEST Checkout only
for synthetic company A, creates or reuses its Test Clock customer through the
approved staging RPC, and uploads a one-day Checkout handoff artifact. It does
not submit a payment or touch production. The hosted Checkout payment still
requires confirmation immediately before submission. `billing-portal-inspect`
checks the active synthetic owner membership and company read, then opens the
Stripe TEST Billing Portal in read-only mode; it never clicks cancellation or
changes the subscription.
`sentry-only` runs only the Sentry browser scenario and does not receive the
service-role secret. These modes require the
dedicated `self-hosted,linux,x64,staging-e2e` labels. Register only a single-use
ephemeral runner for each job and remove its container after the run; never
attach the Docker socket or mount the host filesystem into the runner.

`preview-configure` is restricted to that exact branch and validates the
StavbaCore Staging and production refs before writing anything. It creates
branch-scoped Preview variables from the existing staging GitHub secrets. If
the branch has no connector encryption or intake hash key, it creates random
keys and stores them as sensitive Vercel variables without printing their
values. The connector key is specific to this branch, so any connector
credentials saved through this Preview must remain synthetic staging data and
cannot be decrypted by a different deployment using another key.

## Public form and lead processing on the exact candidate

The public form acceptance uses app commit `53c27ac71f4db2b53251f34719ec82cbb9a1b693`, the same app code as the reviewed lead-write candidate. Vercel Preview deployment `dpl_5Eokzp3wJBRQq14kxmw7USDovRZC` proved the commit, Preview target and client project ref `xwzweltjvreqhjpbjrxa` before browser writes. The browser checks the authenticated subject and tenant of the three synthetic staging accounts against the expected fixture IDs before submitting.

The fixture A route is `/inquiry/e2e-synthetic-company-a`. Company B has no active public form. The first staging attempt exposed a missing branding lookup required by the candidate. The [staging-only SQL](../supabase/staging/20261121_public_form_branding_staging.sql) restricts that lookup to the two fixtures and only returns public display fields when the form is enabled. A disposable PostgreSQL verification checks the return fields, unavailable fixtures and the lack of a direct anonymous company-table read. The current deployed application code is unchanged.

The workflow verifies the staging service credential before creating a Preview. The browser step receives only the staging publishable key and fixture login data. Email delivery is optional in the work plan and is outside this Preview's scope. Record the outbox response and database queue separately from provider delivery. Synthetic recipient addresses are not real inboxes.

[Run 44932184510](https://github.com/svobonek-lab/dashboard/actions/runs/44932184510) passed against the exact Preview. The same public-form submission and replay produced one lead and one intake event for company A and no leads for company B. The owner opened that lead, assigned employee A, and saw the assignment and subsequent employee status change after reload. The staging catalog confirmed both history events and their synthetic actors.

Missing input returned HTTP 400 with a generic validation code. An unknown tenant and the disabled company B returned the unavailable form and generic HTTP 503 API responses. After the form lead and four new requests, the next fresh request returned HTTP 429 with `Retry-After: 600`. Neither the acceptance nor error responses exposed another tenant's data.

The outbox endpoint returned `OUTBOX_WORKER_NOT_CONFIGURED` with zero processed and `queued=false`. The staging catalog showed zero new company A outbox rows during the accepted run. There was no email delivery evidence. The lead and four throttle fixtures were removed. The follow-up queries confirmed zero remaining leads, intake events or lead history for the tracked runs and restored company A to `canceled`.

Production acceptance requires approval of the first company and its test data.
