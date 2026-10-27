# Two-tenant staging seed

`npx tsx scripts/seed-two-tenants.ts` validates the target and prints no account data. Add `--apply` to create or refresh two synthetic companies, their Auth users and active `app_members` rows. The script only accepts `STAGING_SUPABASE_URL` whose project ref exactly matches `STAGING_SUPABASE_PROJECT_REF`, and refuses the configured production ref.

Set these GitHub repository variables for staging E2E:

- `STAGING_SUPABASE_URL`
- `STAGING_SUPABASE_PROJECT_REF`
- `PRODUCTION_SUPABASE_PROJECT_REF`
- `STAGING_COMPANY_A_ID`, `STAGING_COMPANY_B_ID`
- `STAGING_OWNER_A_ID`, `STAGING_EMPLOYEE_A_ID`, `STAGING_OWNER_B_ID`, `STAGING_EMPLOYEE_B_ID`
- `STAGING_OWNER_A_EMAIL`, `STAGING_EMPLOYEE_A_EMAIL`, `STAGING_OWNER_B_EMAIL`, `STAGING_EMPLOYEE_B_EMAIL`

Set `STAGING_SUPABASE_SERVICE_ROLE_KEY` and the four `STAGING_*_PASSWORD` values as GitHub Actions secrets, never as variables. Do not paste them into issues or source files. The seed output prints IDs and synthetic emails only; copy those values to the matching GitHub variables. It never prints passwords or the service key.

The seed creates these deterministic Auth emails: `owner-a@stavbaflow.example.test`, `employee-a@stavbaflow.example.test`, `owner-b@stavbaflow.example.test`, and `employee-b@stavbaflow.example.test`.

This is not evidence that the staging login or tenant isolation E2E has passed. Run the staging acceptance after the variables and secrets are configured.
