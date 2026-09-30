# Production security advisor findings

Metadata-only security advisor snapshot for the configured Supabase production project, collected 2026-09-30. No rows, credentials, or write operations were accessed.

## Findings

The Supabase security advisor reports 22 `SECURITY DEFINER` functions executable by the `authenticated` role through the exposed public RPC surface. The affected functions are:

- `app_admin_mail_health()`
- `app_admin_provision_company(n text, s text, e text, person text, p text)`
- `app_admin_set_company(c uuid, p_active boolean, p_plan text, p_trial_ends_at timestamptz)`
- `app_admin_summary()`
- `app_can_lead(c uuid, l uuid)`
- `app_claim_invites()`
- `app_claim_outbox(c uuid)`
- `app_create_company(n text, s text, person text)`
- `app_file_allowed(path text)`
- `app_finish_outbox(c uuid, o uuid, ok boolean, provider text, error_text text)`
- `app_import_leads(c uuid, rows jsonb, file_name text)`
- `app_invite(c uuid, e text, n text)`
- `app_is_platform_admin()`
- `app_member_active(c uuid, u uuid, a boolean)`
- `app_revoke_portal(c uuid, l uuid)`
- `app_revoke_quote(c uuid, q uuid)`
- `app_role(c uuid)`
- `app_save_handover(c uuid, l uuid, data jsonb)`
- `app_save_lead(c uuid, data jsonb, l uuid, expected integer)`
- `app_save_quote(c uuid, l uuid, data jsonb, q uuid, expected integer)`
- `app_share_portal(c uuid, l uuid, h text)`
- `app_share_quote(c uuid, q uuid, h text)`

The advisor also reports `auth_leaked_password_protection`: compromised-password screening is disabled in Supabase Auth.

## Product impact

These are production security findings, not UI defects. They block claiming that onboarding, invitation, quote sharing, lead mutation, and platform administration are ready for unrestricted customer use. The app must not start calling these RPCs from the browser until each function has an intentional execution policy and tenant/role checks verified.

## Safe remediation plan

1. Classify each function as platform-admin, company-owner, employee, public-token, or service-only.
2. Revoke `EXECUTE` from `authenticated` for service-only and platform-admin functions, or move them behind a protected server boundary.
3. Keep `SECURITY DEFINER` only where required, with fixed `search_path`, explicit company and role checks, and tests for cross-company identifiers.
4. Enable leaked-password protection in Supabase Auth after confirming the password policy and recovery flow.
5. Re-run the security advisor and a metadata-only RLS/grant review before enabling `VITE_APP_SCHEMA_READS` or any production RPC path.

No remediation is applied by this PR. It intentionally creates an evidence trail and prevents speculative permission changes.
