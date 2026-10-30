# Two-tenant staging seed

`npx tsx scripts/seed-two-tenants.ts` validates the target and performs no reads or writes beyond target validation. Add `--apply` to create or refresh two synthetic companies, four Auth users, active `app_members` rows, and one synthetic lead assigned to each company's employee. Each lead has a deterministic synthetic identity so rerunning the seed refreshes the same fixture. For non-vacuous isolation controls, it also creates one idempotent synthetic `app_notes` row, invitation row, and audit row for each company. The script accepts only `STAGING_SUPABASE_URL` whose project ref exactly matches `STAGING_SUPABASE_PROJECT_REF`, and refuses the configured production ref.

The 2026-10-28 read-only staging audit confirms the live `app_members` contract is `company_id`, `user_id`, `name`, `email`, `role`, and `active`, with `active` defaulting to true. The JWT restrictive policy binds membership to `app_private.jwt_tenant_id()`. The latest documented check found no seed evidence; recheck the staging project before assuming fixtures exist.

The checked-in snapshot's columns for `app_companies`, `app_members`, `app_leads`, `app_notes`, `app_invites`, and `app_audit` match the seed payloads; the later live catalog recheck found the same columns for these relations. A focused live read-only query on 2026-10-28 confirmed `app_audit.id` is a `bigint GENERATED ALWAYS AS IDENTITY` column backed by `app_audit_id_seq`, so the seed correctly omits that ID even though `column_default` is null in `information_schema.columns`.

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

`STAGING_PUBLIC_TENANT_KEY` is the synthetic tenant slug used in a public form URL, so it belongs in Actions **variables**, not secrets. It is not an authentication credential.

Do not paste secrets into issues or source files. The seed never prints passwords or the service-role key.

## Previous GitHub Actions configuration audit (2026-10-28; superseded below)

The read-only name inventory confirms `STAGING_SUPABASE_URL`, both project refs, the publishable key, the staging Preview URL, and the A/owner-B account credentials are configured. The following required entries are missing:

The configured `STAGING_PREVIEW_URL` currently points to an older `codex/real-company` deployment. A 2026-10-28 live check found the obsolete “Ověřený firemní pilot” login copy there. Its compiled JavaScript targets production Supabase. The newer PR #133 Preview has the corrected copy, but its compiled JavaScript also targets the production Supabase project `oncmtmrhmjlerbwkrecv`. Neither deployment is safe evidence for current staging E2E. The staging preflight now inspects the actual deployed JavaScript and rejects a production or unidentified Supabase target before credentials are used. The Playwright staging config and connector E2E entry points invoke that preflight before authentication. A current Preview built with the StavbaCore Staging URL must be deployed before acceptance tests.

- Actions secrets: `STAGING_SUPABASE_SERVICE_ROLE_KEY`, `STAGING_EMPLOYEE_B_EMAIL`, `STAGING_EMPLOYEE_B_PASSWORD`, `STAGING_PUBLIC_TENANT_KEY`.
- Actions variables: `PRODUCTION_BASE_URL`, `STAGING_COMPANY_A_ID`, `STAGING_COMPANY_B_ID`, `STAGING_OWNER_A_ID`, `STAGING_EMPLOYEE_A_ID`, `STAGING_OWNER_B_ID`, `STAGING_EMPLOYEE_B_ID`, `STAGING_LEAD_A_ID`, and `STAGING_LEAD_B_ID`.
- After the notes/files staging migration and verified private bucket are in place: `STAGING_LEAD_B_FILE_PATH`, plus set `STAGING_LEAD_FILES_ENABLED=true` only in the seed invocation that creates the synthetic file fixture.

The 2026-10-28 read-only Supabase dashboard check found one existing synthetic account, `stavbaflow-owner-test-20261026@example.test` (`dcde4641-9edc-4112-a3c4-bccbd9d4efd0`). It has a confirmed email and one active `owner` membership in active company `87fb05ae-5153-40a1-8b2c-9c97f3bd327a`. This is positive evidence for the owner-membership contract, but it is not the deterministic A/B fixture and does not prove dashboard login or tenant isolation. The four deterministic accounts required for those tests were absent at the time of the exact-email read-only check.

GitHub Actions runs for PR #133 (`40689392033`, `40689729088`) were rejected before runner allocation: every failed job has `runner_id: 0` and no steps. GitHub's account-level annotation says recent account payments failed or the spending limit must be increased. These runs provide no CI test result. Local checks remain available evidence until GitHub Actions can start jobs again. Never put service keys, account passwords, or the public intake key in Actions variables.

The deterministic Auth emails are `owner-a@stavbaflow.example.test`, `employee-a@stavbaflow.example.test`, `owner-b@stavbaflow.example.test`, and `employee-b@stavbaflow.example.test`. Lead fixtures use synthetic names and `.example.test` emails and are assigned to employees in the matching company.

A seed run is not proof that owner login or tenant isolation passed. File fixture creation is fail-closed and opt-in: keep it disabled until the review-only notes/files migration is applied and its Storage bucket/policies are verified.

## Current acceptance evidence (2026-10-29)

- The GitHub Actions name-only inventory now contains the staging service-role secret and all four synthetic A/B account email/password secrets. Variables contain both company IDs, all four user IDs, both lead IDs, the staging Supabase URL/ref and `STAGING_PREVIEW_URL`. Secret values were not read or printed.
- The Supabase Auth dashboard lists the four deterministic synthetic A/B users. A metadata/fixture-only SELECT on the isolated staging database confirmed four active memberships in two active companies, with owner and employee roles as expected and one lead assigned to each employee.
- Owner A is currently signed into the verified StavbaCore staging Preview and sees only the A workspace and its A lead. This is a browser/UI check, not a replacement for owner A and employee A REST isolation tests.
- `STAGING_PUBLIC_TENANT_KEY` is present as a GitHub Actions variable because it is the public form slug. The current local change fixes the staging Playwright workflow to read it from the variable context; the workflow must be merged or run from this branch to take effect. `PRODUCTION_BASE_URL` is configured as the verified production alias `https://dashboard-svobonek-6462s-projects.vercel.app`.
- The staging E2E workflow dispatch on 2026-10-29 (run 40889398922) failed before allocating a runner and had zero steps. GitHub account billing/spending limit remains the runner blocker; the run contains no test result.
- The Vercel Preview branch `codex/staging-preview-safety` has staging Supabase URL/publishable/service-role settings and a branch-scoped sensitive `INTAKE_HASH_SECRET`. Vercel rejects the old `PUBLIC_INTAKE_HASH_SECRET` name because `PUBLIC_` denotes browser exposure; the API and local configuration now use only the server-side name. A new Preview deployment must include the corrected API code before the secret can be exercised. The live schema also lacks `app_public_intake_events` and the hardened `app_submit_public_lead` RPC, so valid intake does not write. OPTIONS and honeypot requests return 204 and 202 respectively. No intake lead was written during this check.
- `app_lead_files` and `lead-files` Storage remain intentionally absent because their migration is review-only. Do not claim the file/Storage isolation subtest is proven, and do not enable fixture upload.

Run `npm run test:e2e:staging` only after the missing production URL variable is configured, the public tenant slug is passed as a variable, the current staging RPC/schema is reviewed and applied, the Preview's required server settings exist, and a GitHub runner can start. Keep the file/Storage test blocked until its separately reviewed migration and bucket are available.
