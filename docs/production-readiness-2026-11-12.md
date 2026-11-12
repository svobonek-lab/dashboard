# Production metadata readiness — 2026-11-12

## Decision

**Production is not proven to match the repository. No production write is approved.** This report uses only earlier approved, read-only `supabase-ci` findings saved in the repository. A fresh project-scoped, read-only `supabase-ci` MCP is not available in this session. Consequently the requested current inventory of all table names, function signatures and policy names is **incomplete**. The four accompanying migration plans are proposals for review, not executable deployment instructions.

No customer rows, Auth users, Storage objects, function bodies, credentials or production environment values were read for this report. No migration, RPC or application write was run.

## Evidence provenance

| Evidence | Capture | What it establishes |
| --- | --- | --- |
| [`production-schema-compatibility.md`](production-schema-compatibility.md) | 2026-09-24, `supabase-ci_list_tables`, `public` | Names of 20 `public` tables, all then reported with RLS enabled. It contains no policy names or function signatures. |
| [`production-schema-metadata.md`](production-schema-metadata.md) | 2026-09-30, approved read-only table metadata | Selected columns and keys for core tables, not a complete current catalog. |
| [`production-release-readiness-2026-11-08.md`](production-release-readiness-2026-11-08.md) | 2026-11-08 08:48:23 UTC, project-scoped `supabase-ci`, `read_only=true`, project ref `oncmtmrhmjlerbwkrecv` | 27 public `app_*` base tables, 27 public app policies and five `storage.objects` policies; selected object/signature comparisons below. The full name-level snapshot was not retained in that report. |
| `supabase/migrations/` at `origin/main` | 2026-11-12 repository inspection | Proposed SQL and versions only. A source file is not proof of production application. |

The November 8 migration history contained 13 versions, none matching the 17 repository version numbers. This is a **version-history mismatch**, not proof that all SQL effects are absent: objects may have arrived under different versions or manual changes. Do not replay the historical chain.

## Table names

The September 24 approved inventory named these 20 tables. **They are historical observations, not a current full inventory**:

`app_companies`, `app_members`, `app_invites`, `app_leads`, `app_notes`, `app_tasks`, `app_quotes`, `app_audit`, `app_rate_limits`, `app_requests`, `app_time_entries`, `app_costs`, `app_invoices`, `app_handovers`, `app_reminders`, `app_email_outbox`, `app_imports`, `app_integrations`, `app_demo_requests`, `app_job_budgets`.

The November 8 approved comparison additionally identifies `app_public_intake_events`, `app_lead_events`, `app_lead_notes` and `app_lead_files` by name. It says `app_email_outbox_runs` was **absent** at capture time. It does not record the full 27-table name list, so these observations must not be combined into a fabricated 27-row inventory. All table names and RLS flags require a fresh catalog result.

## Function signatures

| Function | November 8 finding | Remaining evidence |
| --- | --- | --- |
| `public.app_submit_public_lead` | Eight arguments exposed; source proposal uses nine including `p_client_ip_hash`. | Exact live argument types, body and grants must be captured before any reconciliation. |
| `public.app_import_leads` | Four arguments exposed; current API sends five including `p_actor_id`. | Exact live types and grants missing; import commit stays staging-gated. |
| `public.app_prepare_paid_registration` | Six arguments exposed; proposed monthly plan version uses seven. | The six-argument source signature is `(uuid,uuid,text,text,text,timestamptz)`, but the full live signature and body need fresh confirmation. |
| `public.app_apply_stripe_subscription_event` | Exposed signature was compatible with the eight-argument source. | Body was not inspected; canceled-subscription rebind behavior is unknown. |
| `public.app_tenant_access_token_hook(jsonb)` and `app_private.jwt_tenant_id()` | Present with restricted tested execute grants. | Hook body, actual Auth hook selection and inherited grants were not checked. |
| `app_private.enforce_employee_seat_limit()` | Absent from inspected metadata. | Recheck before planning the seat change. |

## Policy names

The November 8 report recorded **27 public app policies** and **five `storage.objects` policies**, but did not retain their complete names. It identified restrictive tenant-boundary policies on `app_companies`, `app_invites`, `app_lead_events`, `app_lead_files`, `app_lead_notes`, `app_leads` and `app_members`. Exact policy names, commands, roles, permissive/restrictive flags and expressions remain **unverified** in this report. Staging policy names in `docs/migration-map.md` must not be copied into the production column.

RLS enabled is not proof of tenant isolation. [Supabase's RLS guide](https://supabase.com/docs/guides/database/postgres/row-level-security) treats grants and policies as separate checks.

## Repository comparison and release blockers

| Area | Historical production observation | Repository proposal | Decision |
| --- | --- | --- | --- |
| Tariffs | No `app_companies_plan_check`; six-argument paid-registration RPC. | `20261101131053` replaces the RPC with seven arguments; `20261101140813` requires a specific existing company constraint before replacing it. | Original company-constraint SQL would fail its preflight; reconcile from fresh DDL, preserve existing plans. |
| Seats | Proposed private function, two partial indexes and two triggers absent. | `20261101144114` adds those objects and replaces invite acceptance. | Verify live invite function, grants and lock order before staging test. |
| Outbox | `app_email_outbox` present; `app_email_outbox_runs` absent. | `20261027000000` creates a service-only run table. | Verify outbox shape and worker compatibility separately; table alone does not enable email. |
| Rebind | Eight-argument event RPC signature compatible; body unknown. | `20261031185027` replaces the function. | No behavioral match claim until the live body and grants are captured. |

## Metadata-only capture required before approval

Run the following **SELECTs only through the project-scoped read-only `supabase-ci` MCP** against the confirmed production project. Record capture time and project ref; retain the actual result in the reviewed report. Do not run them through another connector, direct credentials, the application or a browser SQL editor.

```sql
-- Public table names and RLS flags; catalog metadata only.
select n.nspname as schema_name, c.relname as table_name,
       c.relrowsecurity as rls_enabled, c.relforcerowsecurity as force_rls
from pg_catalog.pg_class c
join pg_catalog.pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind in ('r', 'p')
order by 1, 2;

-- Function signatures and security attributes; no body text.
select n.nspname as schema_name, p.proname as function_name,
       pg_catalog.pg_get_function_identity_arguments(p.oid) as identity_arguments,
       pg_catalog.pg_get_function_result(p.oid) as result_type,
       p.prosecdef as security_definer, p.proacl as execute_acl
from pg_catalog.pg_proc p
join pg_catalog.pg_namespace n on n.oid = p.pronamespace
where n.nspname in ('public', 'app_private') and p.proname like 'app_%'
order by 1, 2, 3;

-- Policy names and access metadata; no table rows.
select n.nspname as schema_name, c.relname as table_name,
       p.polname as policy_name, p.polcmd as command,
       p.polpermissive as permissive, p.polroles as role_oids,
       pg_catalog.pg_get_expr(p.polqual, p.polrelid) as using_expression,
       pg_catalog.pg_get_expr(p.polwithcheck, p.polrelid) as check_expression
from pg_catalog.pg_policy p
join pg_catalog.pg_class c on c.oid = p.polrelid
join pg_catalog.pg_namespace n on n.oid = c.relnamespace
where n.nspname in ('public', 'storage')
order by 1, 2, 3;
```

Also capture `list_migrations` through the same approved MCP. Compare full signatures, policy predicates, constraints, indexes, triggers and grants before any SQL proposal is finalized. The original migration files must remain unchanged. Each proposed production write needs its own exact SQL diff, disposable and isolated-staging evidence, rollback and **separate written human approval**. This report grants none.

## Plans

- [Tariffs](production-migration-plans/2026-11-12-tariffs.md)
- [Employee seat limits](production-migration-plans/2026-11-12-seat-limits.md)
- [Outbox run evidence](production-migration-plans/2026-11-12-outbox.md)
- [Canceled-subscription rebind](production-migration-plans/2026-11-12-rebind.md)
