# Migration map

This is an inventory, not an instruction to deploy. All staging SQL files remain
the maintained acceptance contracts; no database was changed while writing this
map.

## Staging contract coverage

Coverage: full, partial, not covered, or proposal only. “CI contract” means the
named disposable PostgreSQL job runs the contract against a synthetic baseline;
numbered migration coverage is stated separately for each row.

| Staging contract | Objects and signatures covered | Numbered migration coverage | CI contract |
| --- | --- | --- | --- |
| `20260930_app_contract.sql` | `app_public_intake_events`; policies `app_companies_select_member`, `app_companies_update_owner`, `app_members_select_member`, `app_members_owner_write`, `app_invites_owner_read`, `app_invites_owner_write`, `app_leads_select_scoped`, `app_leads_insert_owner`, `app_leads_update_scoped`; RPCs `app_provision_company`, `app_create_invite`, `app_get_public_company(text)`, `app_submit_public_lead(...)`, `app_import_leads(...)` | **Not covered.** The historical chain creates `organizations/users/leads`, not the current `app_*` base tables. `20261026000000_public_intake_rate_limit.sql` is proposal-only and assumes `app_*` objects already exist. | Partial: `ai-dispatcher-contract` and `public-intake-security-contract` bootstrap a synthetic app contract; no complete baseline equivalence assertion yet. |
| `20261004_connector_contract.sql` | `app_connector_enrollments`, `app_connectors`, `app_connector_mappings`, `app_connector_requests`, `app_connector_records`, `app_connector_commands`; registration, heartbeat, ingest, command and owner RPC signatures | **Not covered.** No numbered migration currently creates these tables, functions, or their grants. | Partial: `connector-staging-acceptance` exercises deployed staging only when opt-in secrets are configured; CI does not apply this contract in its own PostgreSQL job. |
| `20261005_platform_admin_contract.sql` | `app_platform_admins`, `app_platform_support_sessions`, `app_platform_audit_events`; `app_get_my_platform_role()`, `app_create_platform_support_session(...)` | **Not covered.** Historical `super_admin` role helpers are not equivalent to this server-registry contract. | Partial: `platform-support-contract` executes this and the following support contracts on a disposable PostgreSQL baseline. |
| `20261006_ai_dispatcher_contract.sql` | `app_ai_inbox_events`, `app_email_outbox`, `app_dead_lead_notifications`; `app_submit_ai_inbox_lead(...)`, `app_submit_public_lead(...)`, `app_queue_stale_lead_alerts(...)` | **Not covered.** The legacy `submit_public_lead(...)` signature targets `organizations/leads` and is not equivalent. | Partial: `ai-dispatcher-contract` executes it and immediate-email contract with setup/verification SQL. |
| `20261009_platform_admin_support_contract.sql` | `app_platform_list_companies(uuid)`, create/get/revoke support-session RPC signatures | **Not covered.** No numbered migration implements the platform-admin support API. | Partial: `platform-support-contract` applies this in order after the admin contract. |
| `20261010_platform_admin_write_support_contract.sql` | create/get/workspace/mutate support-session RPC signatures, including `app_platform_support_workspace(uuid, uuid)` and `app_platform_support_mutate_lead(...)` | **Not covered.** No numbered migration implements these support operations. | Partial: `platform-support-contract` applies this in order and verifies company onboarding. |
| `20261013_lead_notes_files_contract.sql` | `app_lead_notes`, `app_lead_files`; policies `app_lead_notes_{select,insert,delete}_scoped`, `app_lead_files_{select,insert,delete}_scoped`, `app_lead_files_storage_{select,insert,delete}`; triggers `app_lead_notes_stamp_author`, `app_lead_files_stamp_author`, `app_lead_notes_record_event`, `app_lead_files_record_event`; attachment stamp, lead mutation guard and file-path helper signatures | **Not covered.** Legacy `leads` JSON fields do not provide equivalent append-only records, ownership checks, or Storage policies. | Partial: `lead-notes-files-contract` applies the contract to a synthetic baseline and runs its SQL acceptance. |
| `20261014_immediate_email_notifications_contract.sql` | lead notification columns, `app_email_outbox` extensions/index; `app_queue_immediate_lead_email()` and trigger; `app_set_email_notifications(uuid, boolean)` | **Not covered.** Historical outbox is not the current `app_*` outbox/trigger contract. | Partial: `ai-dispatcher-contract` runs the notification setup, contract, and verification scripts. |
| `20261015_stripe_billing_contract.sql` | company billing columns, `app_stripe_webhook_events`, `app_apply_stripe_subscription_event(...)`, platform company-list overload | **Not covered.** No numbered migration is a canonical migration of this billing contract. | Partial: `stripe-billing-contract` applies billing SQL and concurrency acceptance on disposable PostgreSQL. |
| `20261016_legal_consent_contract.sql` | `app_company_legal_acceptances`; owner consent, invite acceptance and company-onboarding RPC signatures | **Not covered.** There is no numbered migration for this append-only legal evidence contract. | **Not covered by a dedicated CI contract job** at this revision. |
| `20261027_outbox_run_evidence.sql` | `app_email_outbox_runs`; running marker and aggregate completion counts; service-role-only access | Full: `20261027000000_app_email_outbox_runs.sql` creates the operational table and grants only the service-role API role. It remains a source migration and has not been applied to a live database. | Full disposable PostgreSQL job `outbox-run-evidence-contract` applies the numbered migration and verifies its access boundary; helper tests cover safe run summaries. |

For the function argument lists and full SQL policy predicates (including the
connector, billing, admin and consent contracts), the staging SQL itself is the
canonical signature/predicate source. The inventory above records the declared
object names, overloads called out by the contract, and every explicitly named
policy/trigger; it intentionally does not copy their full bodies into a second
editable source of truth.

## Numbered migrations

The first ten files are the historical `organizations/users/leads` model and
run in lexical filename order in `legacy-migration-chain` on a clean PostgreSQL
17 instance with only synthetic Supabase Auth roles/schema/functions bootstrapped.
This verifies executability; it does not certify these legacy tables as the
current application contract.

| Numbered migration | Objects/signatures | Status |
| --- | --- | --- |
| `20260911000000_schema.sql` | `organizations`, `users`, `leads`, `employees`, `projects`; `auth_org_id()`, `auth_is_super_admin()`; legacy table RLS policies | Historical baseline; CI clean-chain |
| `20260911000001_switch_org.sql` | `organization_members`, `switch_organization(uuid)` and membership policies | Historical; CI clean-chain |
| `20260911000002_verified_signup.sql` | `handle_user_confirmation()` and `auth.users` trigger | Historical; CI clean-chain |
| `20260911000003_secure_widget.sql` | `submit_public_lead(...)` legacy signature | Historical; CI clean-chain |
| `20260911000004_fix_leads_rls.sql` | Legacy lead RLS policy changes | Historical; CI clean-chain |
| `20260912000000_real_company_creator.sql` | `company_settings`, extended organization/employee columns and policies | Historical; CI clean-chain |
| `20260916000000_atomic_tenant_provisioning.sql` | `provision_tenant_atomic(...)` | Historical; CI clean-chain |
| `20260917000000_security_hardening.sql` | Legacy employee security columns/indexes, helpers and policies | Historical; CI clean-chain |
| `20260919000000_audit_p0_hardening.sql` | legacy lead/user hardening, `app_email_outbox`, `demo_bookings`, public lead and provisioning grants | Historical; CI clean-chain |
| `20260920000001_get_public_org_branding.sql` | `get_public_org_branding(uuid)` | Historical; CI clean-chain |
| `20261025000000_secure_jwt_auth_hook.sql` | `app_private` JWT tenant helpers and `app_tenant_access_token_hook(jsonb)`, restrictive app-table policies and grant guards | **Proposal only.** Its staging preflight exposed schema drift: live staging has 20 `app_*` relations and `public.app_role(uuid)`; this proposal expects a different app table inventory and `app_private.app_role(uuid)`. Its isolated CI fixture validates only that fixture. Do not apply or enable the hook until a staging-specific verified migration is reviewed. |
| `20261026000000_public_intake_rate_limit.sql` | HMAC rate-limit state and hardened server-side public-intake RPC | **Proposal only.** CI applies it only after a disposable synthetic `app_*` baseline; the repo's historical migration chain does not create that baseline. |
| `20261027000000_app_email_outbox_runs.sql` | `app_email_outbox_runs`; service-role-only durable scheduler run summaries | Operational source migration; CI applies and verifies it in the disposable `outbox-run-evidence-contract`. Not applied to any live database. |
| `20261031185027_allow_canceled_stripe_subscription_rebind.sql` | Re-subscription through a newer active Checkout after the previous same-customer subscription was canceled; late old-subscription events are stale | Applied to StavbaCore Staging after explicit review; disposable PostgreSQL billing verification and concurrent webhook test pass. Not applied to production. |
| `20261101131053_three_tier_monthly_plans.sql` | Adds `pro` to platform plan assignment; replaces paid-registration RPC with a server-only `starter`/`growth`/`pro` allowlist and rejects new Founding Pilot subscriptions | **Proposal only.** Executed against disposable PostgreSQL-compatible PGlite fixtures; not applied to staging or production. Requires SQL review and isolated staging approval before application. |

## Non-destructive consolidation order

1. Keep the historical chain immutable and make its clean PostgreSQL 17 run a
   CI check. Do not retrofit it to create the current `app_*` schema implicitly.
2. Keep each staging contract and its acceptance SQL as source evidence. Do not
   delete or rewrite staging files as part of consolidation.
3. For each current `app_*` contract, create a separately numbered candidate
   migration only after its complete object/signature/policy inventory matches
   a fresh metadata-only staging snapshot. Add its own clean-database SQL
   acceptance before changing any external database.
4. Resolve legacy/current naming and function overloads explicitly, then add a
   repeatable CI job that bootstraps the verified `app_*` baseline and applies
   the candidate migrations in order. Keep proposal migrations gated until that
   job and staging review pass.
5. Only after review and separate explicit authorization may a candidate be
   applied to isolated staging. Production deployment remains a separate action.

## CI boundary

PostgreSQL jobs use ephemeral containers, synthetic fixtures, and no network
database credentials. `legacy-migration-chain` validates only the historical
numbered chain. Existing per-contract jobs validate selected staging SQL
contracts independently. The JWT and public-intake files remain proposals and
are not included in the historical chain. A green job cannot be read as approval
to deploy either proposal.
