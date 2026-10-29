# Staging lead status RPC implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task by task. Steps use checkboxes for tracking.

**Goal:** Let an owner or assigned employee persist a lead status change in isolated StavbaCore Staging without broad browser table write grants.

**Architecture:** A `SECURITY DEFINER` PostgreSQL RPC derives the tenant from the signed JWT and checks active membership and assignment before updating one lead and writing one audit event. A separate frontend flag allows only this RPC on the exact staging Supabase URL; existing general lead writes remain gated.

**Tech Stack:** PostgreSQL 17, Supabase PostgREST/Auth, TypeScript, React, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-28-staging-lead-status-rpc.md` (approved by the owner on 2026-10-28).

## Global constraints

- Production Supabase `oncmtmrhmjlerbwkrecv` is read-only. Do not apply SQL or write data there.
- Do not grant direct `app_leads` INSERT/UPDATE/DELETE to `authenticated` or disable RLS.
- Do not enable the staging Preview flag until the exact RPC migration is separately approved and verified on StavbaCore Staging `xwzweltjvreqhjpbjrxa`.
- Keep BYODB source-of-truth trigger active; it must block cloud lead writes in BYODB mode.
- Use synthetic A/B fixtures only; do not print credentials or commit test artifacts.

## Review focus

- A valid lead ID from company B must be indistinguishable from a missing lead to company A.
- An employee with a valid JWT but inactive membership or a lead assigned to another employee must be denied.
- Repeating the same status must not create a second audit event.
- A malformed status must not modify the lead or audit history.
- A BYODB company must remain unable to update the cloud projection through the RPC.

---

### Task 1: Database contract and executable isolation test

**Files:** Create `supabase/staging/20261028_staging_lead_status_rpc.sql`, `supabase/tests/staging_lead_status_setup.sql`, and `supabase/tests/staging_lead_status_verify.sql`.

**Interface:** `public.app_change_lead_status(p_lead_id uuid, p_status text)` returns `(lead_id uuid, status text)`; `authenticated` may execute, `anon` and `public` may not.

- [ ] Write disposable test fixtures and assertions for owner A, assigned employee A, unassigned employee A, owner B, missing/mismatched JWT, invalid status, repeated no-op, audit, and BYODB refusal.
- [ ] Run against PostgreSQL 17 without the migration and confirm the expected missing-RPC failure.
- [ ] Write the migration with exact schema preflight, fixed `search_path`, JWT tenant derivation, active-role check, locked lead, one status change and audit event, and narrow EXECUTE grant.
- [ ] Run test after migration, rerun migration for idempotency, and verify table grants remain read-only.

### Task 2: Browser integration and explicit staging flag

**Files:** Modify `src/shared/api/pilotWritePolicy.ts` and `src/shared/api/data/SupabaseRepository.ts`; add focused tests under `tests/`.

**Interface:** `canWriteStagingLeadStatus(env)` returns true only for the exact staging URL with `VITE_STAGING_LEAD_STATUS_WRITES=true`. `updateLeadStatus` calls the RPC and verifies its single-row response; general `saveLead` remains gated.

- [ ] Write failing tests for production refusal, disabled flag, RPC success, malformed/empty response, and RPC rejection without optimistic success.
- [ ] Implement the narrow status path without changing general writes or BYODB behavior.
- [ ] Run targeted tests, then `npm test`, `npm run lint`, and `npm run build`.

### Task 3: Reviewable branch and staged rollout gate

**Files:** Update the staging acceptance record and PR description.

- [ ] Review the exact staged diff and scan for secrets; commit on `codex/staging-lead-status-rpc` and open a draft PR against its dependency branch.
- [ ] Request separate approval for applying only the reviewed RPC SQL to StavbaCore Staging. Do not apply or enable Preview before that approval.
- [ ] After approval, verify SQL Editor result, RPC owner/search path/grants/table ACLs/RLS, and run synthetic A/B REST and Playwright status checks.
- [ ] Keep the full prompts 1–8 objective open until public intake, files, load, Sentry, and Stripe TEST evidence is complete.
