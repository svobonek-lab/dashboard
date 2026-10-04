# StavbaCore production schema contract matrix

**Status:** Read-only adapter groundwork implemented; production enablement still gated, 2026-09-30`r`n**Purpose:** Define the evidence required before replacing the legacy client repository with an adapter for the verified `app_*` production schema.

This document does not claim that similarly named tables or columns are compatible. The production inventory was obtained from the approved metadata-only audit and contains `app_companies`, `app_members`, `app_invites`, `app_leads`, `app_quotes`, `app_tasks`, `app_time_entries`, `app_costs`, `app_invoices`, and `app_job_budgets`. No customer rows, writes, migrations, or RPC calls were used.

The current adapter groundwork resolves a signed-in identity from active `app_members` and an active `app_companies` row, and routes opt-in lead/member reads through the verified names. It remains behind `VITE_APP_SCHEMA_READS=true`; the default is unchanged until policies, grants, and RPC boundaries are independently verified.

## Operation matrix

| Product operation | Current client assumption | Production candidate | Required evidence before implementation |
|---|---|---|---|
| Resolve signed-in company | `users.organization_id`, `organizations.id` in `context/OrganizationContext.tsx` | `app_members.company_id` joined to `app_companies.id` | Columns for auth user identity, company status, membership role, and whether one user may belong to multiple companies |
| Owner/employee role | `users.role`; `employees.auth_user_id` | `app_members.role`, composite `(company_id, user_id)` | Exact role enum, uniqueness constraints, disabled/invited state, and RLS predicates |
| Invite employee | `employees.email`, `invite_token` in `api/invite-employee.ts` | `app_invites`, then `app_members` | Invite token storage/expiry, accepted state, target company FK, and Auth user linkage |
| List company leads | `leads.organization_id` in `OrganizationContext.tsx` and `SupabaseRepository.ts` | `app_leads.company_id` | Lead columns, company FK, status enum, and select policy |
| Assign lead | `assigned_employee_id` / `assigned_employee_name` | Membership reference in `app_leads` or `app_tasks` | Exact assignment FK and whether employee may read/update only assigned rows |
| Lead → quote | `status = 'Quote'`, no verified quote repository | `app_quotes` | Lead FK, quote status transitions, amount/currency fields, and owner-only write policy |
| Quote → job | Legacy `projects` table | `app_tasks`, `app_job_budgets`, or another verified job entity | Canonical job identifier, conversion invariant, status mapping, and transaction boundary |
| Time tracking | Local `TimeLogsTab` state | `app_time_entries` | Employee FK, task/lead FK, duration/date, approval fields, and write policy |
| Costs and margin | Local `CostsTab` state | `app_costs`, `app_job_budgets` | Actual cost columns, VAT/currency semantics, and aggregation rules |
| Invoices | Local/export-only invoice state | `app_invoices` | Invoice lifecycle, quote/job FK, external accounting ID, and export idempotency |
| Customer inquiry | Legacy `organizations` lookup and `submit_public_lead` RPC | `app_companies`, `app_leads` or approved RPC | Public identifier, rate limits, allowed fields, and anonymous insert policy |

## Adapter acceptance criteria

The adapter PR must satisfy all of the following in local or staging fixtures before it can be considered for production review:

1. A user from company A cannot read, update, delete, or assign a record from company B.
2. An employee can read and update only tasks/leads assigned through the verified membership relation.
3. An owner can manage members and company data only for their own company.
4. A super admin can impersonate a company only through an explicit audited path; ordinary company routes must not silently broaden access.
5. Missing price, cost, employee, or timeline data remains missing. The adapter must never invent fallback financial values or contacts.
6. Lead, quote, job, time, cost, and invoice transitions have explicit status and foreign-key tests.
7. Every production query uses verified `app_*` names and verified columns; legacy names are confined to the local/demo adapter.

## Evidence still required

The current table inventory is not enough to implement the adapter. The next metadata-only inspection should request verbose definitions for `app_companies`, `app_members`, `app_invites`, `app_leads`, `app_quotes`, `app_tasks`, `app_time_entries`, `app_costs`, `app_invoices`, and `app_job_budgets`, plus read-only RPC signatures for the public inquiry and tenant provisioning flows. Do not read customer rows and do not execute any RPC.

## Synology connector staging proposal (2026-10-04)

The connector contract is defined in `supabase/staging/20261004_connector_contract.sql` and is not applied automatically. It adds six RLS-enabled, browser-read-only tables: enrollments, identities, mappings, request nonces/responses, canonical external records, and commands. Connector requests are authenticated in the server function, while every SQL RPC derives `company_id` from the registered connector identity.

All connector RPCs are `SECURITY DEFINER`, set `search_path = public, pg_temp`, revoke execution from `public`, `anon`, and `authenticated`, and grant only `service_role`. Enrollment codes are stored as SHA-256 hashes, expire, and are consumed under row lock. `app_ingest_connector_batch` requires an approved mapping version, persists idempotent request responses, and never accepts a company argument.

Required pre-apply evidence remains: actual staging column compatibility, execution of `supabase/tests/connector_authorization.sql` in a rolled-back synthetic transaction, catalog output for RLS/grants/function configuration, and a new Security Advisor review. Production is unchanged.
