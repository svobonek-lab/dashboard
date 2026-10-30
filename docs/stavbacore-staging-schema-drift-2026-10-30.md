# StavbaCore Staging schema drift — 2026-10-30

## Capture

The metadata-only workflow [41033508835](https://github.com/svobonek-lab/dashboard/actions/runs/41033508835) completed on 2026-10-30 at `2026-10-30T09:32:08Z`, after the approved import-worker and public-intake SQL. PostgreSQL catalog metadata, migration history, Storage metadata, grants, function signatures, and sanitized Auth-hook configuration were captured from StavbaCore Staging. It did not read application rows or modify staging or production.

The complete snapshot is [stavbacore-staging-20261030.json](../supabase/schema-snapshots/stavbacore-staging-20261030.json). It is the default input for `scripts/verify-schema-snapshot.mjs`.

The machine-readable comparison of the current snapshot with both SQL directories is [stavbacore-staging-schema-drift-2026-10-30.json](stavbacore-staging-schema-drift-2026-10-30.json).

## Current inventory

| Metadata | Staging |
|---|---:|
| Relations | 30 |
| Columns | 318 |
| RLS policies | 56 |
| Functions | 61 |
| Table grants | 441 |
| Column grants | 25 |
| Storage buckets | 1 private bucket (`crm-files`) |
| Custom access-token hook | Enabled and configured as `app_tenant_access_token_hook` |
| Migration history entries | 13 |

The repository still contains 13 legacy migration versions, and none of those versions matches the 13 versions recorded by this staging project. The two approved SQL applications changed the catalog since the earlier 08:52 capture. This history mismatch does not justify replaying the legacy migrations.

## Live contract gaps

- `supabase/staging/20260930_import_worker.sql` is applied. The new five-argument `app_import_leads` contract exists and the old four-argument signature is removed. The complete browser import journey still needs to be exercised through a Preview whose bundle targets this staging project.
- `app_public_intake_events` and the hardened `app_submit_public_lead` RPC now exist. Metadata confirms RLS and the service-only RPC grant; live abuse/retry requests and public-intake load acceptance remain pending. Synthetic A is enabled for the form. `privacy_url=https://example.test/privacy` is a test-only placeholder required by the database constraint, not a legal/company URL.
- `app_lead_notes` and `app_lead_files` are absent. Keep their schema proposal review-only as required by the acceptance prompt. The existing private bucket is `crm-files`; the corrected proposal deliberately adds a separate `lead-files` bucket to avoid changing the existing bucket's policies.
- The first manual run of `20261013_lead_notes_files_contract.sql` failed because it referenced `app_private.app_role(uuid)`, while this snapshot records `public.app_role(uuid)` and `public.app_can_lead(uuid,uuid)`. It also assumed `app_lead_events` already existed, which this snapshot does not show. The corrected review proposal now checks those helper signatures/security settings, creates a scoped `app_lead_events` table, and uses a separate private `lead-files` bucket so the existing `crm-files` policies are untouched. It passed twice against a disposable PostgreSQL 17 database with the tenant and Storage assertions. It has **not** been applied to staging.
- The migration history and live catalog remain different from the repository's legacy `supabase/migrations` set. The verifier reports this rather than silently treating source SQL as deployed.

The fresh comparison reports the following objects declared by source SQL but absent from the live catalog:

| Source SQL directory | Missing tables | Missing columns | Missing policies | Missing functions |
|---|---:|---:|---:|---:|
| `supabase/migrations` | 9 | 75 | 35 | 11 |
| `supabase/staging` | 12 | 110 | 21 | 39 |

The historical migration set models `organizations/users/leads`; it is not a safe batch to apply to the current `app_*` project. The staging set also contains unapplied proposal contracts. These counts describe source-versus-live drift, not a deployment recommendation. The JSON file lists every missing object by category.

## Next gates

1. Deploy the matching import and public-intake API code to a Preview whose static bundle preflight confirms the staging Supabase ref; rerun owner CSV and public-intake idempotency/isolation acceptance.
2. Independently review the notes/files migration and reconcile the `crm-files` bucket contract before any staging application.
3. Keep production strictly read-only.
