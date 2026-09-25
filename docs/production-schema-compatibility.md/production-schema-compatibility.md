# Production schema compatibility audit

**Status:** Draft audit; metadata snapshot verified 2026-09-24.  
**Scope:** Read-only comparison of application assumptions with production table metadata returned by the authorized supabase-ci tool. No customer rows or RPCs were accessed or executed.

## Evidence

- Production inventory: GitHub Issue #1 comment [#5813783607](https://github.com/svobonek-lab/dashboard/issues/1#issuecomment-5813783607), based on successful run [35997191752](https://github.com/svobonek-lab/dashboard/actions/runs/35997191752), tool supabase-ci_list_tables, schema public.
- The tool reported 20 public tables, all with RLS enabled: app_companies, app_members, app_invites, app_leads, app_notes, app_tasks, app_quotes, app_audit, app_rate_limits, app_requests, app_time_entries, app_costs, app_invoices, app_handovers, app_reminders, app_email_outbox, app_imports, app_integrations, app_demo_requests, app_job_budgets.
- The same metadata describes app_members with composite key (company_id, user_id) and owner/employee roles; lead assignment references membership. Tenant foreign keys use company_id.
- This inventory is a snapshot, not a complete policy or column audit. RLS being enabled does not establish that policies enforce tenant isolation.

## Findings

### P0 — Core client table names do not match the reported production inventory

context/OrganizationContext.tsx reads and writes users, organizations, employees, leads, projects, organization_members and company_settings (for example lines 353, 374, 441, 1127, 1428, 1793, 2108, 2285–2315). lib/data/SupabaseRepository.ts also uses the legacy organization/lead/employee/project names (lines 23, 96, 224, 267). None appears in the 20-table production inventory. Production equivalents must not be guessed from naming similarity. Authenticated reads, onboarding and CRM writes can fail against the reported schema; error fallbacks may also conceal failures outside production.

**Next:** map each repository operation and required columns to verified app_* metadata, then implement a separate adapter PR with local/staging tests. Do not alter production schema as part of this audit.

### P0 — Tenant key and membership model differ

The client models organization_id throughout context/OrganizationContext.tsx (for example lines 45, 53, 1129, 1430, 1795); production metadata identifies company_id and a composite membership key. No verified mapping between these identifiers, user switching, or assignment IDs is available. A name-only translation could weaken tenant filtering or produce invalid joins.

**Next:** design tenant resolution around authenticated membership, then test cross-company read/write denial in staging before enabling a production path.

### P0 — Employee onboarding is not aligned with membership

The client queries employees and expects employee-specific fields (organization_id, email, active, invitation status; lines 374, 613–634, 1428–1430, 1591–1602). Production metadata exposes app_members, keyed by company and auth user, rather than a reported employees table. The inventory does not establish invitation, profile, or deactivation columns/flows.

**Next:** inspect only approved metadata for app_members and app_invites; specify invite, activation, role, and deactivation behavior before implementing it. Do not call Auth admin APIs or send invitations during this work.

### P0 — Leads and conversion-to-project need a verified mapping

Lead operations target leads.organization_id and legacy lead columns (context/OrganizationContext.tsx:1127–1129, 1289–1306). Projects target projects.organization_id (:1793–1795, 1824–1836). Production reports app_leads and child tables such as app_quotes, app_tasks, and app_job_budgets, but not projects. Metadata indicates company-scoped lead assignment; it does not prove an equivalent project conversion workflow or matching statuses/columns.

**Next:** trace the intended lead → quote → accepted job flow against verified table/column/FK metadata; define explicit conversion and status mapping in a separate PR with staging tests.

### P1 — Runtime RPC availability is unknown

The frontend invokes switch_organization (context/OrganizationContext.tsx:835), submit_public_lead (around line 1350), and provision_tenant_atomic (around line 2265). Table inventory does not establish whether these functions exist, their signatures, grants, or security behavior. Historical SQL migrations are proposals/source history, not proof of production deployment.

**Next:** request read-only RPC metadata only if needed for adapter design. Never execute these RPCs or apply historical migrations in production.

## Credential-like defaults

lib/supabase.ts:210–252 contains hard-coded local mock user records with password-like defaults, inside LocalSupabaseMock.getUsers(). This is evidence of shipped demo/mock values, not evidence that they are valid production credentials. Values are intentionally omitted. Follow the P0 backlog item to prevent privileged mock authentication or fallback in production; verify demo-only behavior and rotate any real credential only through its owner-controlled system if independently confirmed.

## Limits and next work

This audit did not inspect customer rows, production RLS policies, live RPC metadata, production columns beyond the returned summary, or test the application against production. It makes no claim that tenant isolation is correct. Historical migrations were not treated as deployed state.

1. **P0:** Complete a metadata-only table/column/FK/RPC mapping for company, member, lead, quote, and job flows.
2. **P0:** Build a schema adapter and regression tests in an isolated branch; prove cross-tenant denial in local/staging fixtures.
3. **P0:** Close the production mock-auth/default-credential path in a separate scoped PR.
4. **P1:** Validate onboarding and role lifecycle, then lead-to-job conversion end to end in staging.

No production writes, schema changes, migrations, deployments, customer-row reads, or permission changes were performed for this audit.
