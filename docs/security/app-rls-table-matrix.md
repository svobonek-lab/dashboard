# Current Production RLS Table Matrix

Status: evidence-based draft; production rollout is not authorized by this document.

## Snapshot provenance

- Project: StavbaFlow, Supabase ref oncmtmrhmjlerbwkrecv, pinned in opencode.jsonc with read_only=true and database/debugging/docs features.
- Collection: project-scoped supabase-ci MCP through GitHub Actions. Run 40177557615 queried columns, RLS flags, policies, grants, foreign keys, and function metadata at 2026-10-25 08:41–08:42 UTC. Run 40178044476 returned database time 08:50:08.775666 UTC and role privileges. Run 40178172542 returned catalog table/ACL rows at 08:51:44 UTC.
- Generated summaries claim 20 app tables, but render 19 names. The catalog output has 19 unique public app_* base-table rows. This matrix records those exact 19. Migration preflight must compare the complete live app_* relation set against them and abort on any extra or missing relation.
- The first summary’s 08:15 timestamp was copied from issue creation and is not snapshot time. No customer/application rows were selected. One generated table summary included row-count estimates; they are not used here.
- Snapshot reports 27 foreign keys and 46 policies. Nine tables have rendered policy details. All 19 catalog-listed tables have RLS enabled; three platform tables also FORCE RLS.

Permission shorthand: A=anon, U=authenticated, S=service_role. Privilege order is SELECT/INSERT/UPDATE/DELETE; Y=granted, N=absent. service_role bypasses RLS, so its path is not tenant isolation.

## Table matrix

| Table | Tenant/scope and FK evidence | RLS / direct grants (A/U/S) | Current policy contract | Decision and shared test coverage |
|---|---|---|---|---|
| app_ai_inbox_events | company_id→app_companies.id; lead_id→app_leads.id | RLS; NNNN/NNNN/YYYY | No policy reported; server dispatcher | Service-only; deny anon/auth; shared direct-grant checks in `supabase/tests/jwt_tenant_rls.pgtap.sql` |
| app_companies | Root id | RLS; NNNN/YNYN/YYYY | Member SELECT, owner UPDATE, restrictive JWT boundary on id + live role | Tenant root; preserve narrow rules; `supabase/tests/jwt_tenant_rls.pgtap.sql` |
| app_company_legal_acceptances | company_id→app_companies.id; invite_id→app_invites.id | RLS; NNNN/NNNN/YYNN | No policy; service SELECT/INSERT only | Append-only service evidence; shared direct-grant checks in `supabase/tests/jwt_tenant_rls.pgtap.sql` |
| app_dead_lead_notifications | company_id→app_companies.id; lead_id→app_leads.id | RLS; NNNN/NNNN/YYYY | No policy reported | Internal worker; shared direct-grant checks in `supabase/tests/jwt_tenant_rls.pgtap.sql` |
| app_email_outbox | nullable company_id→app_companies.id; lead_id→app_leads.id | RLS; NNNN/NNNN/YYYY | No policy reported | Scheduler/dispatcher service path; shared direct-grant checks in `supabase/tests/jwt_tenant_rls.pgtap.sql` |
| app_imports | company_id→app_companies.id | RLS; NNNN/NNNN/YYYY | Explicit deny for anon/authenticated | Service worker/import RPC only; `supabase/tests/jwt_tenant_rls.pgtap.sql` |
| app_invites | company_id→app_companies.id | RLS; NNNN/YYYY/YYYY | Owner SELECT/ALL + restrictive JWT boundary | Tenant child; preserve hard delete; `supabase/tests/jwt_tenant_rls.pgtap.sql` |
| app_lead_events | company_id→app_companies.id; lead_id→app_leads.id | RLS; NNNN/YNNN/YYYY | Restrictive boundary; owner/assigned employee SELECT | Append-only; client SELECT only, writes via trigger; `supabase/tests/jwt_tenant_rls.pgtap.sql` |
| app_lead_files | company_id→app_companies.id; (company_id,lead_id)→app_leads | RLS; NNNN/YYNY/YYYY | Restrictive boundary; owner/assigned read/insert; owner or recent author delete | Preserve 15-minute delete and Storage boundary; `supabase/tests/jwt_tenant_rls.pgtap.sql` |
| app_lead_notes | company_id→app_companies.id; (company_id,lead_id)→app_leads | RLS; NNNN/YYNY/YYYY | Restrictive boundary; owner/assigned read/insert; owner or recent author delete | Preserve 15-minute delete; `supabase/tests/jwt_tenant_rls.pgtap.sql` |
| app_leads | company_id→app_companies.id; created_by→auth.users.id | RLS; NNNN/YYYY/YYYY | Restrictive boundary; owner/assigned read/update, owner insert; owner or creator-assigned delete | Preserve creator immutability, assignment, hard delete; `supabase/tests/jwt_tenant_rls.pgtap.sql` |
| app_members | company_id→app_companies.id; PK (company_id,user_id) | RLS; NNNN/YYYY/YYYY | Member SELECT, owner ALL, restrictive JWT boundary | Tenant membership source; `supabase/tests/jwt_tenant_rls.pgtap.sql` |
| app_paid_registration_intents | company_id unique; owner_user_id identifies Auth user | RLS; NNNN/NNNN/YYYY | No policy reported | Service-only paid onboarding; shared direct-grant checks in `supabase/tests/jwt_tenant_rls.pgtap.sql` |
| app_platform_admins | Global platform identity; user_id→auth.users.id | RLS + FORCE; NNNN/NNNN/YYYY | No policy | Platform-only, no tenant access; shared direct-grant checks in `supabase/tests/jwt_tenant_rls.pgtap.sql` |
| app_platform_audit_events | nullable company_id→app_companies.id; support_session_id→app_platform_support_sessions.id; actor_user_id→auth.users.id | RLS + FORCE; NNNN/NNNN/YYYY | No policy | Platform audit; shared direct-grant checks in `supabase/tests/jwt_tenant_rls.pgtap.sql` |
| app_platform_support_sessions | company_id→app_companies.id; platform_admin_id→app_platform_admins.user_id | RLS + FORCE; NNNN/NNNN/YYYY | No policy | Platform support is not tenant bypass; shared direct-grant checks in `supabase/tests/jwt_tenant_rls.pgtap.sql` |
| app_public_intake_events | company_id→app_companies.id; lead_id→app_leads.id | RLS; NNNN/NNNN/YYYY | Explicit deny for anon/authenticated | Public writes via narrow RPC; `supabase/tests/jwt_tenant_rls.pgtap.sql` |
| app_stripe_webhook_events | company_id→app_companies.id | RLS; NNNN/NNNN/NNNN | No policy; no app-role table grants | Separate security-definer webhook path; do not grant direct access; `supabase/tests/jwt_tenant_rls.pgtap.sql` |
| app_workspace_defaults | company_id PK→app_companies.id | RLS; NNNN/NNNN/YYYY | No policy reported | Provisioning/server-only; shared direct-grant checks in `supabase/tests/jwt_tenant_rls.pgtap.sql` |

The matrix intentionally excludes app_notes, app_projects, app_tasks, app_quotes, app_job_budgets, and legacy unprefixed tables: none appears in the 19-row current app_* catalog output. They are not equated with app_lead_notes or app_lead_events.

## Policy details observed

The snapshot reports 46 policies. Rendered details identify policies on nine tables:

- app_companies: app_companies_select_member, app_companies_update_owner, app_jwt_tenant_boundary.
- app_invites: app_invites_owner_read, app_invites_owner_write, app_jwt_tenant_boundary.
- app_leads: app_leads_select_scoped, app_leads_insert_owner, app_leads_update_scoped, app_leads_delete_creator, app_leads_delete_creator_boundary, app_jwt_tenant_boundary.
- app_members: app_members_select_member, app_members_owner_write, app_jwt_tenant_boundary.
- app_lead_notes and app_lead_files: restrictive JWT boundary; scoped SELECT/INSERT; owner or recent author DELETE.
- app_lead_events: restrictive JWT boundary; owner/assigned SELECT.
- app_imports and app_public_intake_events: explicit USING(false)/WITH CHECK(false) for anon and authenticated.

All rendered tenant policies target authenticated. Mutation policies have explicit checks where applicable. The app_* column inventory does not include deleted_at; current hard-delete semantics remain unchanged.

## Function and grant findings

- public.app_tenant_access_token_hook(jsonb): SECURITY DEFINER, owner postgres, empty search_path, EXECUTE for supabase_auth_admin plus owner/admin roles. Function body and Auth Dashboard hook configuration were not independently captured; staging SQL is source evidence only.
- app_private.app_role(uuid) and app_private.app_can_lead(uuid,uuid): SECURITY DEFINER, owner postgres, search_path public, pg_temp, executable by authenticated and service_role; both are used by live RLS policies.
- Checked-in staging SQL defines `app_private.guard_lead_creator()` / `app_guard_lead_creator` and `app_private.guard_lead_mutation()` / `app_leads_guard_mutation` on `app_leads`. The metadata snapshot did not capture triggers, so the migration preflight requires each exact enabled BEFORE INSERT/UPDATE row trigger, its function binding, no WHEN clause, and no UPDATE OF column list; production equivalence remains a human rollout check.
- Other reported non-empty paths: app_private.record_lead_event() (owner-only), public.app_get_public_company(text) (anon), public.app_provision_company(text,text,uuid,text,text) (service_role), public.app_rollback_import(uuid,text) (service_role).
- The generated report claims 36 SECURITY DEFINER functions but renders 35 names (6 app_private and 29 public). It is not exhaustive. Do not claim full function-by-function disposition; treat the six named non-empty paths as follow-up review targets.
- Public schema USAGE=true and CREATE=false for anon, authenticated, service_role, and supabase_auth_admin. anon has no listed app-table privileges. Authenticated grants are limited to the seven tenant-facing tables above. service_role has grants on all listed tables except app_stripe_webhook_events. supabase_auth_admin has none.

## Migration release gate

The proposal may run only on a disposable PostgreSQL fixture. Preflight must fail if the live RLS-enabled public app_* relation set differs from the 19 names above, or if required helper signatures, tenant keys, or policy/grant contracts differ. No staging/production application, Auth-hook setting change, or customer-session refresh is part of this PR.

The shared pgTAP suite checks the complete table/grant inventory in `supabase/tests/jwt_tenant_rls.pgtap.sql` and tenant isolation across the seven direct-access tables. Auth-hook claim/grant cases are in `supabase/tests/jwt_tenant_auth_hook.pgtap.sql`; the expected pre-migration failure is isolated in `supabase/tests/jwt_tenant_boundary_red.pgtap.sql`. This is a shared suite rather than 19 separately maintained files.
