# Two-tenant staging seed

`npx tsx scripts/seed-two-tenants.ts` validates the target and performs no reads or writes beyond target validation. Add `--apply` to create or refresh two synthetic companies, four Auth users, active `app_members` rows, and one synthetic lead assigned to each company's employee. Each lead has a deterministic synthetic identity so rerunning the seed refreshes the same fixture. For non-vacuous isolation controls, it also creates one idempotent synthetic `app_notes` row, invitation row, and audit row for each company. The script accepts only `STAGING_SUPABASE_URL` whose project ref exactly matches `STAGING_SUPABASE_PROJECT_REF`, and refuses the configured production ref.

The 2026-10-28 read-only staging audit confirms the live `app_members` contract is `company_id`, `user_id`, `name`, `email`, `role`, and `active`, with `active` defaulting to true. The JWT restrictive policy binds membership to `app_private.jwt_tenant_id()`. The latest documented check found no seed evidence; recheck the staging project before assuming fixtures exist.

## Owner login failure contract

`NO_ACTIVE_MEMBERSHIP` is the label used by the staging acceptance helper; the application surfaces the underlying state from `src/app/providers/OrganizationProvider.tsx` when `resolveOrAcceptAppIdentity()` returns no identity. `src/app/appSchemaIdentity.ts` first selects `app_members` rows with `user_id = auth.users.id` and `active = true`; if none are visible, it retries with the normalized Auth email and `active = true`. The row must use role `owner` or `employee`, and its `company_id` must resolve to an `app_companies` row whose `active` value is not false. Successful Supabase Auth by itself does not create this membership. The seed creates the required company and active owner/employee rows using those exact fields.

## GitHub repository variables

Set project/deployment identity and non-secret fixture IDs as **Actions variables**:

- `STAGING_SUPABASE_URL`
- `STAGING_SUPABASE_PROJECT_REF`
- `PRODUCTION_SUPABASE_PROJECT_REF`
- `STAGING_PREVIEW_URL`
- `PRODUCTION_BASE_URL`
- `STAGING_COMPANY_A_ID`, `STAGING_COMPANY_B_ID`
- `STAGING_OWNER_A_ID`, `STAGING_EMPLOYEE_A_ID`, `STAGING_OWNER_B_ID`, `STAGING_EMPLOYEE_B_ID`
- `STAGING_LEAD_A_ID`, `STAGING_LEAD_B_ID`
- `STAGING_LEAD_B_FILE_PATH` (only after the review-only notes/files SQL is applied to staging and `STAGING_LEAD_FILES_ENABLED=true` was used for the seed)

The seed prints company, user, and lead IDs only after `--apply` succeeds. Copy those non-secret IDs to the matching variables. Never treat the returned IDs as proof of isolation; run the staging E2E suite.

## GitHub Actions secrets

Set the service-role key, account passwords, and account emails as **Actions secrets** (emails are synthetic and non-routable, but remain in the secret store for consistent handling):

- `STAGING_SUPABASE_SERVICE_ROLE_KEY`
- `STAGING_OWNER_A_EMAIL`, `STAGING_OWNER_A_PASSWORD`
- `STAGING_EMPLOYEE_A_EMAIL`, `STAGING_EMPLOYEE_A_PASSWORD`
- `STAGING_OWNER_B_EMAIL`, `STAGING_OWNER_B_PASSWORD`
- `STAGING_EMPLOYEE_B_EMAIL`, `STAGING_EMPLOYEE_B_PASSWORD`
- `STAGING_PUBLIC_TENANT_KEY` (staging public-intake credential; keep it secret)

Do not paste secrets into issues or source files. The seed never prints passwords or the service-role key. GitHub inventory checked 2026-10-28 shows the service-role key, employee B email, and employee B password are missing; the seed cannot be applied until those are configured.

The deterministic Auth emails are `owner-a@stavbaflow.example.test`, `employee-a@stavbaflow.example.test`, `owner-b@stavbaflow.example.test`, and `employee-b@stavbaflow.example.test`. Lead fixtures use synthetic names and `.example.test` emails and are assigned to employees in the matching company.

A seed run is not proof that owner login or tenant isolation passed. File fixture creation is fail-closed and opt-in: keep it disabled until the review-only notes/files migration is applied and its Storage bucket/policies are verified. Run staging acceptance only after the values above are configured and the target is confirmed as StavbaCore Staging.
