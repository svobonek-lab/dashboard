# JWT tenant boundary rollout notes

Status: merged review proposal only. It has not been applied to Supabase and does not authorize a production rollout.

## What this proposal changes

- Derives `app_metadata.tenant_id` and informational `app_metadata.tenant_role` from exactly one active `app_members` membership joined to an active `app_companies` row.
- Ignores `user_metadata`, clears stale claims, and returns no tenant for invalid, missing, inactive, or ambiguous membership.
- Validates the complete 19-name public `app_*` relation inventory and the specific ACL, policy, helper, RLS, and FORCE RLS contracts the migration relies on. Any mismatch aborts the transaction.
- Adds a restrictive authenticated boundary to the seven verified direct-access tenant tables if the complete set is absent. Existing complete boundaries are validated and left as-is. A partially present or incompatible set aborts.
- Leaves narrower owner, employee assignment, creator, hard-delete, public intake, service-only, platform, Storage, and SECURITY DEFINER function contracts unchanged.
- Requires the existing enabled `app_guard_lead_creator` and `app_leads_guard_mutation` triggers as migration preconditions because the metadata snapshot did not capture trigger state. Preflight verifies each trigger's function binding and exact BEFORE INSERT/UPDATE row event shape.

## Review and rollout gates

1. Review `docs/security/app-rls-table-matrix.md` and the full migration diff. The metadata export is incomplete (19 rendered tables vs. “20”, 27 rendered policy rows vs. “46”, and 35 named functions vs. “36”). The migration must fail closed when its verified subset or full table set differs.
2. Require the `jwt-tenant-pgtap` CI job to show an intentional pgTAP RED before the migration and all GREEN suites after it on a disposable PostgreSQL 17 database. The existing application verification job must also pass.
3. Before any real rollout, an authorized operator must capture the exact live hook definition and Auth hook configuration metadata-only, compare them with the candidate, and review the currently unverified function inventory. Resolve each migration preflight blocker first.
4. Only after that review may an operator prepare a separately approved production migration/change window and Auth configuration plan. This proposal does not authorize or perform that work.
5. After deployment, verify a fresh owner and employee login, access to their own tenant, denial for cross-tenant reads/writes, and claim removal after membership deactivation. Do not use customer data as test fixtures.

## Merge status

- Migration proposal PR #107 merged as `5d9bf37a68826cf484314f850a7b35c0e6e9c903`; its full GitHub Actions and Vercel checks passed in run `40182326278`.
- CI applies the SQL only to disposable PostgreSQL 17 test containers with synthetic rows. The repository has no automatic Supabase migration/deploy step; merging did not change production database state or Auth configuration.
- A follow-up metadata-only refresh was requested through issue #105 in Actions run `40182691255`. It failed before returning metadata because the configured OpenRouter free-model daily limit was exhausted (HTTP 429). The earlier, incomplete metadata snapshot remains the only production evidence recorded here.

## Credential separation

The repository secret `SUPABASE_ACCESS_TOKEN` is a Supabase Management API access token used by the project-scoped metadata workflow. A Supabase `service_role` API key is a different credential and must not replace it or be added to CI. Neither value belongs in SQL, source control, an issue, or a log. This proposal requires no service-role credential and all database verification uses synthetic local container data.

## Storage boundary

The earlier checked-in staging proposal adds a separate `storage.objects` policy for paths in the private `lead-files` bucket. This migration leaves Storage policies and bucket grants unchanged because the live Storage policy details were not captured in the metadata snapshot. Review that path policy separately before rollout. Already-issued signed URLs can remain valid until their expiry even after later RLS policy changes.

## Current blockers

- Production hook body and Auth Dashboard hook setting were not independently captured.
- Production creator and update-guard trigger state was not included in the metadata snapshot; verify both live trigger bindings and function bodies against source before any rollout.
- The policy/function metadata report omits rows/names. Preflight compares all 27 rendered policy definitions, including exact deparsed expressions, roles, command and permissive/restrictive mode. The 19 unrendered policy rows and the unrendered function name/body remain unverified and must be inventoried before rollout.
- Six named SECURITY DEFINER functions with non-empty `search_path` remain outside this proposal pending exact source and authorization tests.
- No production/staging DDL or writes have been performed. The migration is not marked safe to run until the blockers are resolved and a human approves deployment separately.
