# Staging lead status mutation contract

## Goal and verified starting point

The owner and assigned employee need to change a lead's lifecycle status in the isolated StavbaCore Staging Preview. The authenticated browser can currently read `app_leads`, but has no INSERT, UPDATE, DELETE or status-column UPDATE grant. `lead_read` is the only permissive lead policy; `app_jwt_tenant_boundary` is restrictive. The browser's pilot writer fails before a request because `VITE_PILOT_WRITES` is disabled. Enabling broad table writes would exceed the verified grant boundary.

Staging `app_leads` has `company_id`, `assigned_to`, `status`, and `revision`. The status constraint accepts `new`, `contacted`, `scheduled`, `in_progress`, `won`, `lost`. `public.app_role(company_id)` checks the current Auth user against active membership and an active company. `app_private.jwt_tenant_id()` reads the signed tenant claim. An existing trigger rejects cloud lead mutations when a company is in BYODB mode.

## Proposed slice

Create one staging-only `SECURITY DEFINER` RPC, `public.app_change_lead_status(p_lead_id uuid, p_status text)`, with a fixed empty search path and fully qualified objects. Revoke execution from `public` and `anon`, grant only to `authenticated`. The function derives company ID from the JWT, checks `auth.uid()`, locks the lead by `(company_id, id)`, checks `public.app_role(company_id)`, and permits an owner or the active employee listed in `assigned_to`. It validates the requested status against the six database values. A repeated request for the current status is a no-op. A real transition updates only `status` and appends one `app_audit` event in the same transaction. It returns the changed lead ID and status without customer fields. Cross-company, unassigned, inactive-member, missing-claim, and anonymous calls fail without changing a row. The BYODB guard trigger remains authoritative and denies cloud writes for BYODB companies.

The RPC enforces the existing employee lifecycle transition matrix in `src/entities/lead/model/lifecycle.ts`. Only an owner may reopen a completed or lost lead. It also checks BYODB mode directly, so a disabled lead trigger cannot grant cloud writes. These rules were added after branch review found that a direct RPC caller could otherwise bypass the UI policy.

The browser's `updateLeadStatus` path calls this RPC only when a separate staging-only status flag is set **and** the configured Supabase URL is exactly `https://xwzweltjvreqhjpbjrxa.supabase.co`. That flag does not enable the broader `saveLead` path. The production ref `oncmtmrhmjlerbwkrecv` remains read-only even if the flag is mistakenly set. The Kanban applies optimistic UI state only after RPC success and visibly reports a rejected change.

## Verification and rollout

1. Write a disposable PostgreSQL test with two companies, owners, assigned and unassigned employees. Verify same-company owner and assigned-employee status changes, one audit event, repeated no-op, and denial of all cross-company and unassigned calls. Verify the BYODB trigger still blocks the RPC.
2. Check the exact staging schema, existing RPC name, grants and policies before applying. Prepare the migration in a dedicated branch and PR; it must not run automatically.
3. After separate staging approval, apply only to StavbaCore Staging and verify function owner, `search_path`, EXECUTE grants, unchanged table grants, RLS and Security Advisor. Build a branch-only staging Preview with the new status flag.
4. Run the authenticated Playwright owner status scenario and direct REST isolation tests with synthetic tenants A/B. Keep production untouched. Do not describe CSV, invitation, file Storage, BYODB source writes or Stripe checkout as completed by this slice.

## Alternatives considered

- A browser `UPDATE` grant and row policy would require a trustworthy column-level employee mutation guard and wider policy changes. It is more difficult to review against the current read-only baseline.
- A serverless service-role endpoint could enforce the same checks, but would duplicate authorization logic outside Postgres and add a privileged HTTP surface.
