# StavbaCore work plan

## Current foundation
- Production metadata read verified in run 35997191752 (2026-09-24): supabase-ci_list_tables, 20 public tables, all reported RLS enabled.
- Local AGENTS.md and WORKPLAN.md were previously untracked. This foundation makes the rules available to cloud agents.
- CI verify: npm ci, npm run lint, npm run build; no production secrets, deploys, or database operations.
- No auto-merge or automatic migrations. All changes require a branch and reviewed PR.

## First autonomous task: P0 schema compatibility audit
Create branch audit/production-schema-compatibility from the reviewed foundation and open a draft PR. Deliver only docs/production-schema-compatibility.md and a WORKPLAN.md status update.
1. Read AGENTS.md and inspect Supabase table/RPC references in lib/, context/, api/, and migrations.
2. Compare source assumptions with verified production metadata (app_companies, app_members, app_leads). If needed, use only read-only metadata through supabase-ci; no customer row retrieval or RPC execution.
3. Document evidence with file/line references, confirmed mismatches, uncertainties, and proposed bounded follow-up PRs. Do not invent mappings or recommend applying historical migrations to production.
4. Inventory credential-like defaults by file/line only; never copy their values. Distinguish demo constants from confirmed live credentials. Flag owner-controlled rotation if exposure is suspected.
5. Run npm ci, npm run lint, npm run build. Report results and limitations. No code changes, schema changes, secrets, deployments, merges, or production writes.
Acceptance: an evidence-backed document and draft PR with a prioritized plan; no changes outside the two allowed documentation files.
Status: COMPLETE — PR #7 merged after npm ci, npm run lint, and npm run build passed on 2026-09-25.

## Follow-up backlog (requires separate scoped tasks)
- P0: Remove embedded credential-like defaults and prevent production from falling back to privileged mock authentication. Hashes shipped to clients do not solve exposed authentication.
  Status: PARTIAL — PR #8 merged production mock-auth hardening and removed seeded passwords. DEV-only quick-login credential constants were later found in components/LoginPage.tsx; their removal is in draft PR #10. Do not assume any value is active; rotate through the account owner if independently confirmed.
- P0: Reconcile production app_* schema with application references before modifying tenant access or deletion behavior.
- P0: Review tenant isolation and authorization using local/staging tests; RLS enabled alone is insufficient evidence.
- Status: PARTIAL — opt-in read-only identity adapter now resolves active app_members/app_companies and production runtime fails closed instead of falling back to local demo data. Do not enable the flag until policy/grant evidence is complete.
- P1: Remove Synology token fallback and validate configuration with targeted tests.
  Status: Draft PR #9 is open; built-in token fallbacks are removed, persisted legacy markers are rejected, endpoint changes clear prior tokens, and generated tokens use Web Crypto. Local validation passed: npm ci, npm test (8 passed), npm run lint, and npm run build.
- P1: Plan soft deletion only after checking real schema and allowed status values. No automatic migrations.
- P1: Validate environment configuration; explicitly distinguish synthetic demo mode and production.
- P2: Add focused tests, then consider context extraction and naming cleanup. Preserve existing localStorage data when renaming keys.

## Current bounded implementation
- PR next: production identity boundary. It adds `app_members` + `app_companies` read-only resolution, runtime fail-closed policy, and fixture tests for inactive memberships, cross-company identity mismatch, and production fallback behavior.
- Explicitly deferred: invites, quotes, costs, invoices, and lead writes. Their production RPC policies and grants remain unverified in the metadata audit.

## Corrections to earlier local draft
Do not ignore .github/. Do not rewrite old migrations or delete earlier RPC definitions simply because later migrations supersede them. @/ already resolves to the project root; a src/types barrel does not fix that alias. Cosmetic renames are not P0. Production writes through APIs remain prohibited. Automated production deployment is outside this work plan.
