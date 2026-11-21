# Lead write contract review

Candidate base: `43cf8a1ce7c84a655fd74d71eb8e7ab57f6693ee` on `origin/main`. Work is isolated on `codex/lead-write-contract`.

## Observed state

Production was inspected at 16:43 UTC on 2026-11-21 through the project-scoped `supabase-ci` MCP. The transaction was read-only and selected only catalog metadata. Staging was inspected separately on project `xwzweltjvreqhjpbjrxa`.

| Area | Staging | Production |
| --- | --- | --- |
| Lead writes | Browser role has neither INSERT nor UPDATE, including UPDATE on `assigned_to`. Lead RLS has a read policy and a restrictive JWT tenant policy. | Browser role already has table-wide INSERT and UPDATE. Restrictive JWT tenant RLS and mutation triggers narrow the effective writes. There is no live status RPC. |
| Status | `app_change_lead_status(uuid,text)` exists and the deployed definition writes status history to `app_audit`. Its role check is nullable and needs to deny explicitly unless an allowed role and assignment match. | The lead event trigger records changes in `app_lead_events` and the mutation trigger validates employee transitions. |
| History | `app_lead_events` is readable for scoped leads. Its live operation constraint permits only note and file events. | `app_lead_events` is readable through tenant and lead policies. It records INSERT and UPDATE with actor, status, assignee and value fields. |
| Browser | The app schema write checks allow the staging hostname only. The general save path sends a table mutation and can return `42501`. | The app schema read path is active, but the same checks block the cloud write routes and omit history. |

## Proposed approach

Use a shared app schema contract with explicit create, assignment and status operations. Separate the cloud lead write gate from unrelated pilot features. Keep staging and Production activation independent and require the exact approved project origin for each. Production remains disabled by default.

- Create accepts the existing manual lead form fields from an active owner. The database supplies tenant, actor and server-managed fields. Assignment and status are separate operations for existing leads. Keep existing owner detail edits working only through a distinct allowlist when needed by the current callers.
- Assignment accepts a lead ID and the ID of an active employee in the same company. Only an active owner may change it. Status accepts a lead ID and an allowed status. An active owner or the assigned employee may change it, subject to the employee transition rules. Explicitly reject missing roles and unassigned leads for employees. Preserve the existing BYODB guard and reject cross-tenant requests without revealing whether the target exists.
- Prefer narrow named RPCs to granting new UPDATE permissions to the browser role. Check tenant and active role inside each write, use an exact tenant and lead row predicate, and revoke public and anonymous execution. Preserve RLS on direct access. Test whether a dedicated role subject to RLS is practical on both baselines before selecting the final function ownership. Leave existing staging browser table write grants closed. Any removal of the pre-existing Production blanket grant belongs in the reviewed Production proposal after checking existing callers.
- Expose one read contract for lead history scoped to the same lead visibility as the lead itself. Use the existing event trigger in Production and account for the staging event constraint and legacy status history. Record one event per real change in the same transaction. An unchanged assignment or status creates no extra event. The client applies a change only after it validates the returned row or acknowledgement.

A column grant alone would also require new staging UPDATE policies and a mutation guard because a column grant cannot distinguish an owner assigning from an employee changing status. Keeping those decisions in named operations limits the browser interface and makes denial and history behavior testable.

The app schema browser writer is `SupabaseRepository.saveLead`. Its staging status path has a separate helper for `app_change_lead_status`. The company export is read-only and stays outside this change. The legacy `scripts/staging-pilot-e2e.mjs` still expects direct browser INSERT and UPDATE, so it cannot certify the observed staging baseline. Keep service-side fixture setup separate from the new browser test and use the candidate API for successful browser writes.

## Verification and rollback

Run the SQL against disposable Postgres baselines before asking for a staging migration review. Verify create, assignment, legal transitions, history, no-op behavior, cross-company denial, unassigned employee denial for leads with and without an assignee, inactive membership and BYODB denial without a browser-wide UPDATE grant. Then run Playwright against the exact candidate SHA with the three synthetic roles, verifying reload, history and the absence of local success after failed persistence. Record deployment provenance and fixture cleanup.

Keep the Production flag absent until separate approval. For rollback, turn off the affected environment gate and restore the previous build. A separately reviewed staging rollback restores the previous function definitions and revokes candidate RPC grants while retaining lead rows and recorded history.

The unmodified candidate base passed all 658 application tests, lint, and build. The existing staging status fixture and verifier passed on local disposable PostgreSQL 17. These checks establish the baseline. Run the new SQL and three-role Playwright acceptance on the implemented candidate.

## Candidate for staging review

The staged SQL uses a dedicated `NOLOGIN NOBYPASSRLS` role for the four write functions. It grants column-level writes to that private role, with separate tenant and lead policies for the role. Browser roles receive only EXECUTE on the four operations. The stage-specific history changes add columns and event types while preserving the note and file event types. The former status RPC keeps its result shape and delegates through the new checks.

The Production SQL proposal must use the same app API and preserve the existing lead event trigger, which already records mutations. Use an active-company role lookup compatible with the Production private helpers and avoid a second event write. Review the existing blanket browser UPDATE and replace it with the candidate interface only after verifying remaining consumers. Keep the staging SQL separate from this proposal. Neither Production flag is part of the staging release.

Staging Preview requires only `VITE_APP_LEAD_WRITES=true` on the exact staging origin. Dispatch the candidate branch's staging workflow with mode `lead-write-contract-acceptance` and the exact reviewed Preview URL. The job checks the Git commit, branch, project and staging origin before exercising the three synthetic roles. The browser run logs the synthetic company ID, lead ID and title for exact cleanup. After the run, the staging operator verifies all three match and removes only that fixture, then confirms that its lead and event rows are absent. Do not give the browser a DELETE grant for this cleanup.

For a staging rollback, remove the branch Preview flag and switch back to the previous Preview. If the candidate RPCs must be disabled at the database, revoke authenticated EXECUTE on create, assign and edit. Disable the new status RPC and its legacy wrapper together if status itself must be disabled. Preserve the history columns and event rows because they now contain committed records. Do not restore the previous nullable status authorization check.
