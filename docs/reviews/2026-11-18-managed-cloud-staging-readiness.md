# Managed Cloud staging readiness — metadata only

**Observed 2026-11-18; reviewed staging SQL applied, no deployment.** This note records prerequisites for the two new synthetic company acceptance runs.

## Current staging contract

- Isolated Supabase project: `xwzweltjvreqhjpbjrxa` (StavbaCore Staging). Production project was not queried.
- Before the reviewed migration, `app_platform_create_company_onboarding(uuid,text,text,text,text,text,timestamptz,timestamptz)` accepted only `pilot`; the plan constraint allowed `pilot`, `starter`, and historical `business`. The old Stripe subscription RPC allowed activation before paid Checkout.
- The two proposals passed the disposable PostgreSQL 17 contract in [PR #192 SQL CI](https://github.com/svobonek-lab/dashboard/actions/runs/44305795825/job/134807044507). After separate owner approval, they were applied to Staging as `managed_cloud_admin_onboarding_20261117` and `managed_cloud_first_activation_20261117`. The migration list confirms both names. Production was not queried or changed.
- Read-only follow-up confirms `starter`, `growth`, and `pro` in the plan constraint, the paid activation RPC, `reported_subscription_status`, and the first-activation table. That table has RLS enabled and zero rows; only `service_role` can execute `app_activate_paid_checkout`, while `anon` and `authenticated` cannot. This metadata check does not replace the end-to-end acceptance run.

## Auth and Preview

- The Staging Supabase Dashboard showed Site URL `https://dashboard-git-codex-staging-e2e-79cdb9-svobonek-6462s-projects.vercel.app/login` and exactly one redirect allowlist entry with the same URL. There was no wildcard. This is the existing staging alias, not a verified Preview for `codex/managed-cloud-onboarding`.
- The read-only GitHub metadata snapshot [run 44304689312](https://github.com/svobonek-lab/dashboard/actions/runs/44304689312) failed before Auth metadata capture: `SUPABASE_ACCESS_TOKEN` received HTTP 401 on the Management API database read-only endpoint. Renewing that token and rerunning the snapshot is required for machine-readable Auth/DB evidence. The browser observation above is limited to the Auth URL settings page.
- `vercel env ls` showed `EMAIL_LINK_ENCRYPTION_KEY` and public origins only on another invitation Preview branch, and TEST Stripe prices on previous billing branches. Name presence on those branches does not configure the new branch. No values were copied to Git.
- The owner identified two Gmail inboxes that could receive two new plus-address aliases. Their addresses are omitted here and must be supplied privately to the staging operator. Confirm actual delivery before treating aliases as controlled identities.

## Required order after review

1. Prepare a manually deployed, isolated Preview of this commit with `PUBLIC_APP_URL`, `PUBLIC_LANDING_URL`, Stripe TEST secret and approved recurring TEST Price IDs, provider configuration, `EMAIL_LINK_ENCRYPTION_KEY`, and exact staging Supabase project keys. Add only its exact `/login` URL to Staging Auth redirects, with an explicit review of the change.
2. Use two distinct controlled aliases for **new** synthetic owner identities. For each, create through platform admin UI, confirm queue and provider delivery, accept the invite, observe `not_configured` denial, complete Stripe TEST Checkout, verify signed event and atomic activation, then test owner and employee access.
3. Exercise duplicate email, expired invite, wrong-company acceptance, inactive entitlement and provider failure; record the synthetic audit/outbox/event IDs, status transitions and compensation. Do not record one-time links, passwords, API keys or real customer rows.

Until those steps pass, the code and Production proposal remain review artifacts. The PR should remain Draft and no production env, DB, Stripe or Auth change is authorized by this note.
