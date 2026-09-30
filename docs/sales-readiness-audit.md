# StavbaFlow sales-readiness audit

**Audit date:** 2026-09-30  
**Scope:** customer-facing dashboard for construction companies, tenant isolation, role-based access, lead intake, existing-database connectivity, onboarding, and operational readiness.  
**Evidence boundary:** source code and production schema metadata only. No customer rows, secrets, or production writes were accessed.

## Executive verdict

StavbaFlow is a credible product shell and the role-specific login experience is becoming clear, but it is **not yet safe to sell as a live multi-tenant dashboard**. The main risk is not visual polish. The live data path still mixes a legacy schema (`organizations`, `users`, `employees`, `leads`) with the production `app_*` schema, while the production app-schema read flag is disabled by default. Several write policies and RPCs required for onboarding and lead intake are missing or unverified. The existing SQL connection test is a simulation and must not be presented to a prospect as a real database connection.

The product can be sold only after a staging-backed pilot proves the complete flow: a company is provisioned, an owner signs in, an employee is invited, the employee sees only assigned jobs, a form submission becomes a lead, the owner can progress it into a job, and a second company cannot read or mutate any of it.

## Evidence snapshot

Production metadata inspected through the approved read-only Supabase workflow showed 20 public `app_*` tables, all with RLS enabled. Relevant tables include `app_companies`, `app_members`, `app_invites`, `app_leads`, `app_tasks`, `app_quotes`, `app_job_budgets`, `app_audit`, `app_rate_limits`, `app_requests`, `app_integrations`, and `app_demo_requests`.

The production model uses:

- `app_members` with composite key `(company_id, user_id)` and roles `owner`/`employee`.
- `app_leads` with company ownership, assignment, status lifecycle, and child relations.
- `app_quotes` and `app_job_budgets` restricted more tightly than the current UI assumes.
- `app_role(company_id)` and `app_can_lead(company_id, lead_id)` security-definer helpers.

The same metadata did **not** verify `app_company_settings`, `provision_tenant_atomic`, `switch_organization`, `submit_public_lead`, invite activation, or a complete app-schema write policy set. This is a go-live blocker, not an optional enhancement.

## P0 blockers: resolve before selling a live workspace

### 1. Schema identity is split

The production schema is `app_*`, but runtime code still contains a second legacy model. `lib/data/SupabaseRepository.ts` gates the app path behind `VITE_APP_SCHEMA_READS` (`lib/data/SupabaseRepository.ts:6`), while the example keeps it false (`.env.example:20`). The same repository still references legacy `leads`, `employees`, and `organizations` (`lib/data/SupabaseRepository.ts:119,229,287,336,370,385`). `OrganizationContext` also queries legacy `users`, `employees`, `organizations`, `leads`, and `projects` throughout its auth, switching, branding, deletion, and provisioning paths (`context/OrganizationContext.tsx:391-513,661-682,884-901,2030-2101,2326-2435`).

**Impact:** a user can authenticate successfully but receive no company identity, no jobs, or a misleading empty state. A fallback can also attempt a write against a table that does not exist in production.

**Required fix:** make one app-schema adapter the only production path; remove legacy branches from production builds; keep any mock data behind an explicit development-only policy. Turn on the app path only after policy/grant evidence and staging tests are recorded.

### 2. Onboarding cannot be trusted

`OrganizationContext` calls `provision_tenant_atomic` and `switch_organization` (`context/OrganizationContext.tsx:884-901,2326-2349`), but the production metadata audit did not find those functions. The fallback assumes `users`, `organizations`, and `employees`, which are not part of the verified production schema.

**Impact:** a new customer cannot be provisioned reliably, and the first-run experience can stop after account creation.

**Required fix:** implement and review a staging-only provisioning function against `app_companies`, `app_members`, and a verified settings table. Make the operation idempotent, transactional, auditable, and safe to retry. Add a read-only readiness check that reports which required objects are missing before the user starts onboarding.

### 3. Lead writes are not proven safe

The repository upserts `app_leads` (`lib/data/SupabaseRepository.ts:167-201`), and the context updates/deletes app leads (`lib/data/SupabaseRepository.ts:250-263`). Production inspection confirmed read access but did not confirm the required `INSERT` and `UPDATE` policies. Supabase updates need both a row-selection condition and a `WITH CHECK` condition; an insert without a company-bound check is a tenant-isolation failure.

**Impact:** the dashboard may look functional while every create/update fails with `42501`, or a future policy could allow cross-company writes.

**Required fix:** add owner and assigned-employee policies using `app_role`/`app_can_lead`, bind `company_id` from the authenticated membership rather than a browser-supplied tenant id, and add negative cross-tenant tests.

### 4. Employee invitation and password reset use the wrong model

`api/invite-employee.ts` queries legacy `users` and `employees` (`api/invite-employee.ts:59,102-159`) and returns an invite token/link in the response (`api/invite-employee.ts:189-195`). `api/reset-employee-password.ts` makes the same legacy assumptions (`api/reset-employee-password.ts:51-115`).

**Impact:** invitations are broken against production and raw credentials/tokens can leak into logs, browser history, or support screenshots.

**Required fix:** authorize with `app_members`/`app_role`; store only a hash or use Supabase Auth invite flows; never return a raw token after creation; enforce owner-only access, rate limits, expiry, one-time use, audit events, and safe error messages.

### 5. Public form and widget are not connected to verified production objects

`InquiryFormPage` resolves branding from `organizations` (`features/InquiryFormPage.tsx:38`). `WidgetIframePage` calls `get_public_org_branding` and `submit_public_lead` (`features/WidgetIframePage.tsx:70-82,164-199`). Production metadata did not verify those objects. The widget also has a local fallback path (`features/WidgetIframePage.tsx:219-199` in the current implementation) that must never run in a configured production deployment.

**Impact:** a prospect can submit a form and see success while no durable lead exists, or a tenant can load another tenant's branding.

**Required fix:** create a public, rate-limited intake endpoint/RPC that accepts a non-secret tenant key, resolves the company server-side, validates and normalizes fields, records consent/source/provenance, writes to `app_leads` through a reviewed policy, and emits an outbox/notification event. Test a real submission end to end.

### 6. The “SQL connection” is a simulation

`api/test-sql.ts` accepts connection-shaped fields but returns hard-coded table and sample-row data (`api/test-sql.ts:13-67,104-196`). The `passwordEncrypted` value is accepted but not used. `lib/integrations/sqlConnector.ts` describes a simulated handshake.

**Impact:** this is a sales and trust risk. A firm may believe its current database is connected when no connection was made.

**Required fix:** either remove the feature from the sales build or implement a server-side, read-only connector with explicit customer consent, encrypted secret storage, network allow-listing, query timeouts, schema/table mapping, tenant isolation, redacted previews, audit trails, and deletion/rotation. The UI must label dry-run, sample, and live states distinctly.

### 7. Role boundaries are incomplete beyond the login screen

The app has role-specific entry points, but production authorization must be enforced server-side. Verified RLS currently allows employees to select assigned leads; quotes and budgets are owner-restricted, and tasks use assignment checks. The product needs a single documented matrix for owner, employee, and platform admin.

**Required fix:** test every route, query, mutation, export, file, invite, and integration against that matrix. The browser role is only presentation; RLS/API authorization is the control.

### 8. Production fail-closed behavior needs proof

The runtime policy intentionally disables local mock auth/data in production (`src/app/runtimePolicy.ts:15` and `lib/supabase.ts`). That is the correct direction, but each missing configuration and every failed write must produce an actionable error, never silently fall back to local data. `OrganizationContext` contains local fallback calls around lead and status operations (`context/OrganizationContext.tsx:1303-1476`), which require a production-path test.

## P1: required for a credible paid pilot

1. Add a verified `app_company_settings` model for branding, intake configuration, timezone, locale, and notification preferences.
2. Replace the feature flag with a single repository adapter and delete legacy production code paths.
3. Build an onboarding checklist: company details, owner, invite, branding, form endpoint, first lead, first job, and readiness health.
4. Implement a real lead-to-job lifecycle: intake → qualification → quote → accepted job → assigned tasks → budget/time/cost tracking.
5. Add idempotent imports with dry-run mapping, field-level previews using synthetic data, provenance, checkpoints, retries, and rollback/undo semantics.
6. Implement web-form embedding with a tenant public key, spam/rate protection, consent capture, notification/outbox delivery, and an integration health page.
7. Add audit events for sign-in, invite, role change, lead creation/status changes, imports, exports, and integration changes.
8. Add tenant-scoped export/delete workflows, retention policy, backups, restore drills, GDPR data-subject handling, and incident/support contacts.
9. Add usage limits and billing state before promising plans; failed payment must not delete or expose customer data.
10. Remove unverified marketing claims such as guaranteed response times unless an actual operational process and SLA exists.

## Sales acceptance gates

The product is ready for a paid pilot only when all of these pass in a staging environment that mirrors production:

| Gate | Evidence required |
| --- | --- |
| Provisioning | New company and owner created once; retry is idempotent; settings exist. |
| Authentication | Owner, employee, and platform-admin entry points enforce their role; session expiry and logout work. |
| Invitation | Owner invites an employee; token is one-time, expires, and is not returned raw. |
| Isolation | Employee sees only assigned leads/tasks; owner sees company data; second company sees none of the first. |
| Intake | Real embedded form creates one durable lead with source and consent; duplicate retries do not duplicate the lead. |
| Workflow | Lead progresses to quote/job/task with correct permissions and audit events. |
| Existing database | Read-only connector performs a real dry-run against a test database, maps fields, and imports idempotently. |
| Failure mode | Missing env/RPC/policy produces a clear blocked state; no demo data appears in production. |
| Operations | Rate limits, error monitoring, backup/restore evidence, retention, and support runbook exist. |
| Commercial | Pricing, limits, data-processing terms, onboarding time, and support scope are documented. |

## Recommended delivery sequence

### PR A — schema adapter and contract tests

Remove legacy production branches, add typed app-schema mappings, and add mocked contract tests for identity, leads, members, and settings. No production writes.

### PR B — staging database contract

Add reviewed migrations/RPCs/policies for provisioning, settings, invites, lead writes, and public intake. Apply only to staging, then capture policy/grant evidence and negative isolation tests.

### PR C — integrations and intake

Build the real form endpoint and a read-only database connector with mapping/import jobs. Include rate limiting, provenance, consent, retries, and observability.

### PR D — pilot hardening

Complete owner/employee UX, audit/export/retention, billing guards, support docs, end-to-end QA, and a recorded demo using synthetic data. Only then promote a pilot deployment.

## Go / no-go decision

**Current decision: NO-GO for selling a live connected dashboard.** A sales demo can show the role-aware shell and explain the roadmap, but it must be labelled as a preview until the P0 gates above are verified. The fastest safe route to a first customer is a narrow pilot with one staging tenant, a real test database connector, and a manually reviewed import rather than promising automatic production synchronization immediately.

