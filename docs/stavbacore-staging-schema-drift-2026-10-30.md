# StavbaCore Staging schema drift — 2026-10-30

## Capture

The metadata-only workflow [41029020963](https://github.com/svobonek-lab/dashboard/actions/runs/41029020963) completed on 2026-10-30. PostgreSQL catalog metadata, migration history, Storage metadata, grants, function signatures, and sanitized Auth-hook configuration were captured from StavbaCore Staging. It did not read application rows or modify staging or production.

The complete snapshot is [stavbacore-staging-20261030.json](../supabase/schema-snapshots/stavbacore-staging-20261030.json). It is the default input for `scripts/verify-schema-snapshot.mjs`.

## Current inventory

| Metadata | Staging |
|---|---:|
| Relations | 29 |
| Columns | 302 |
| RLS policies | 54 |
| Functions | 57 |
| Table grants | 435 |
| Column grants | 25 |
| Storage buckets | 1 private bucket (`crm-files`) |
| Custom access-token hook | Enabled and configured as `app_tenant_access_token_hook` |
| Migration history entries | 13 |

The catalog, grants, policies, functions, Storage metadata, Auth-hook configuration, and migration versions match the 2026-10-29 metadata capture exactly. The repository still contains 13 legacy migration versions, and none of those versions matches the 13 versions recorded by this staging project. This history mismatch does not justify replaying the legacy migrations.

## Live contract gaps

- The live import schema is legacy shaped. `app_imports.imported` is `NOT NULL` without a default, while `app_imports.actor` is `NOT NULL` with a default. `app_leads` has neither `import_fingerprint` nor `source_record_id`. The live `app_import_leads` RPC has the legacy four-argument signature. The previous worker omitted `imported`, which explains its HTTP 502 on commit. The current `supabase/staging/20260930_import_worker.sql` proposal explicitly supplies the import count and authenticated actor, bridges the existing table without losing history, and replaces the old RPC. It has passed the legacy-shape disposable PostgreSQL contract twice; it has not been applied to staging.
- `app_public_intake_events` and `app_submit_public_lead` are absent. Public-intake abuse tests have disposable PostgreSQL evidence only; live submission and public-intake load acceptance remain pending.
- `app_lead_notes` and `app_lead_files` are absent. Keep their schema proposal review-only as required by the acceptance prompt. The existing private bucket is `crm-files`; the application contract and proposal must be reconciled with that name before attempting a file round trip.
- The migration history and live catalog remain different from the repository's legacy `supabase/migrations` set. The verifier reports this rather than silently treating source SQL as deployed.

The exact comparison file dated 2026-10-29 remains useful for the catalog that was captured then. Its counts for proposal objects reflect the SQL files as they stood at that time; the import-worker proposal has since been updated and its object diff must be regenerated after review. Do not use the old proposal-gap count as a current count.

## Next gates

1. Review the import-worker SQL in PR #142 and separately approve applying that exact file to StavbaCore Staging.
2. Deploy the matching API code to the staging Preview and rerun the full owner CSV flow plus rollback/idempotency checks.
3. Independently review and approve the public-intake SQL and notes/files schema before applying either.
4. Keep production strictly read-only.
