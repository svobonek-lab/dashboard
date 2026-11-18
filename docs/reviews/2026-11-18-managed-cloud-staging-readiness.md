# Managed Cloud staging readiness — metadata only

**Observed 2026-11-18; no staging write or deployment.** This note records prerequisites for the two new synthetic company acceptance runs. It is not an approval to apply SQL.

## Current staging contract

- Isolated Supabase project: `xwzweltjvreqhjpbjrxa` (StavbaCore Staging). Production project was not queried.
- Live `app_platform_create_company_onboarding(uuid,text,text,text,text,text,timestamptz,timestamptz)` is service-only, currently accepts only `pilot`, writes a private company, owner invite, two legal acceptance records, pending Auth invitation outbox item and platform audit event in one transaction.
- `app_companies.subscription_status` defaults to `not_configured`. The live plan constraint still allows `pilot`, `starter`, and historical `business`; it does not yet allow `growth` or `pro`.
- Live Stripe subscription RPC accepts subscription updates before paid Checkout. The proposed first-activation migration closes that gap while preserving existing tenant renewal logic.
- The proposed SQL files were applied and checked in **disposable PostgreSQL 17 only** by [PR #192 SQL CI](https://github.com/svobonek-lab/dashboard/actions/runs/44305073547/job/134804565341). They have not been applied to Staging.

## Auth and Preview

- The Staging Supabase Dashboard showed Site URL `https://dashboard-git-codex-staging-e2e-79cdb9-svobonek-6462s-projects.vercel.app/login` and exactly one redirect allowlist entry with the same URL. There was no wildcard. This is the existing staging alias, not a verified Preview for `codex/managed-cloud-onboarding`.
- The read-only GitHub metadata snapshot [run 44304689312](https://github.com/svobonek-lab/dashboard/actions/runs/44304689312) failed before Auth metadata capture: `SUPABASE_ACCESS_TOKEN` received HTTP 401 on the Management API database read-only endpoint. Renewing that token and rerunning the snapshot is required for machine-readable Auth/DB evidence. The browser observation above is limited to the Auth URL settings page.
- `vercel env ls` showed `EMAIL_LINK_ENCRYPTION_KEY` and public origins only on another invitation Preview branch, and TEST Stripe prices on previous billing branches. Name presence on those branches does not configure the new branch. No values were copied to Git.
- The owner identified two Gmail inboxes that could receive two new plus-address aliases. Their addresses are omitted here and must be supplied privately to the staging operator. Confirm actual delivery before treating aliases as controlled identities.

## Required order after review

1. Review the SQL diff and the exact staging baseline; authorize/apply the two staging proposals through the approved process. Verify function definitions and service-only grants on Staging.
2. Prepare a manually deployed, isolated Preview of this commit with `PUBLIC_APP_URL`, `PUBLIC_LANDING_URL`, Stripe TEST secret and approved recurring TEST Price IDs, provider configuration, `EMAIL_LINK_ENCRYPTION_KEY`, and exact staging Supabase project keys. Add only its exact `/login` URL to Staging Auth redirects, with an explicit review of the change.
3. Use two distinct controlled aliases for **new** synthetic owner identities. For each, create through platform admin UI, confirm queue and provider delivery, accept the invite, observe `not_configured` denial, complete Stripe TEST Checkout, verify signed event and atomic activation, then test owner and employee access.
4. Exercise duplicate email, expired invite, wrong-company acceptance, inactive entitlement and provider failure; record the synthetic audit/outbox/event IDs, status transitions and compensation. Do not record one-time links, passwords, API keys or real customer rows.

Until those steps pass, the code and Production proposal remain review artifacts. The PR should remain Draft and no production env, DB, Stripe or Auth change is authorized by this note.
