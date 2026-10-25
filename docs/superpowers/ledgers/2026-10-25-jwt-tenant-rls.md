# Execution ledger: JWT tenant RLS hardening

Base: origin/main 2e8e583ee70871b23b8bc79ba5ae456427c09144
Branch: codex/jwt-tenant-rls-hardening
Approved plan: docs/superpowers/plans/2026-10-25-jwt-tenant-rls.md

## Evidence
- Correct Supabase ref is oncmtmrhmjlerbwkrecv (StavbaFlow), configured with read_only=true.
- GitHub Actions run 40177557615 completed successfully after SUPABASE_ACCESS_TOKEN secret was updated.
- The MCP call trace executed catalog-only SQL through supabase-ci between 08:41:03Z and 08:42:08Z. No customer/application table rows were selected.
- The generated issue report's displayed timestamp (08:15:37Z) is stale (issue creation time); use the workflow trace window as provenance and do not repeat the stale timestamp as capture time.
- The generated summary inconsistently reports 19 vs. 20 public `app_*` relations; 19 names were rendered. It also claims 46 policies and 36 SECURITY DEFINER functions while only 27 policy rows and 35 function names were rendered. The source counts are incomplete; preflight compares the exact rendered 27-policy subset and full 19-relation set.

## Rulings
- Ruling: Treat the current production metadata as authoritative evidence for existing hook/policy objects; the approved plan's anticipated hook/policy absence is false — avoid duplicate or destructive policy replacement and constrain the proposal to verified gaps, because duplicating live objects risks changing existing access behavior.
- Ruling: Do not claim the full 20-table actor contract from names or RLS flags alone — classify direct-deny/service-only tables from verified grants, policies, and matching checked-in RPC contracts; leave any unsupported behavior as a blocker.

## Progress
- [x] Read goal objective and referenced StavFlow thread.
- [x] Confirm correct project ref and read-only scope in repository config.
- [x] Obtain current metadata through the approved project-scoped MCP.
- [x] Reconcile live snapshot with source/staging contracts; update design and final matrix.
- [x] Add synthetic pgTAP assertions and disposable CI for verified behavior.
- [x] Implement fail-closed proposal and tests/docs; current disposable CI is iterating on preflight and pgTAP findings.
- [x] Fresh whole-branch review; open draft PR #107 and attach artifact.

## Implementation notes
- The pgTAP test organization uses one shared matrix suite, one hook suite, and one deliberate pre-migration RED case rather than 19 boilerplate per-table files. The shared suite checks the full 19-table RLS/grant inventory and exercises all seven direct-access tenant tables.
- `npm ci` completed with 0 reported vulnerabilities; `npm test` passed 303/303; `npm run lint` and `npm run build` exited 0. The build reports the existing >500 KB chunk warning.
- Local Docker is installed but its Linux engine pipe is unavailable, so PostgreSQL/pgTAP has not run locally. The new disposable workflow must establish this before the draft PR is ready for review.
- PR #107 is draft and has no production or staging credentials in its verification job. The Supabase service-role API key is not used; the project-scoped metadata workflow expects the distinct Management API token.
