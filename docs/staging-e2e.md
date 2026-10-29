# Staging Playwright smoke tests

Run the seven external acceptance scenarios only with the opt-in `staging-e2e`
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
- `STAGING_LEAD_B_FILE_PATH` after the reviewed notes/files schema and private Storage bucket are available
- `STAGING_PUBLIC_TENANT_KEY` (public tenant slug used by the form; not a credential)

Configure these GitHub Actions **secrets**:

- `STAGING_SUPABASE_PUBLISHABLE_KEY`
- `STAGING_OWNER_A_EMAIL`, `STAGING_OWNER_A_PASSWORD`
- `STAGING_EMPLOYEE_A_EMAIL`, `STAGING_EMPLOYEE_A_PASSWORD`
- `STAGING_OWNER_B_EMAIL`, `STAGING_OWNER_B_PASSWORD`

All four accounts and both companies must be synthetic fixtures in the isolated
staging project. Company A must have a lead assigned to employee A; company B
must have a lead assigned to employee B. Company B must also have synthetic
notes, invitation, and audit fixtures so the isolation assertion has positive
controls. The public tenant key must resolve to company A. The public-intake
rate-limit/idempotency SQL contract must already be present in staging before
its acceptance case can pass. Tests never use a
service-role key and never target the configured production app or Supabase ref.

The public-intake replay test inserts one uniquely named synthetic lead and
leaves it in company A to preserve auditability. The cache-clear test seeds only
synthetic values in the logged-in browser's local storage and does not write to
the database. The owner critical-flow test removes only the exact synthetic CSV
row it creates and restores the original lead status. No customer records are
included in Playwright assertions.
