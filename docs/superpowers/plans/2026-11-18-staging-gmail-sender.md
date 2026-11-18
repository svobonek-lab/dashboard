# Staging Gmail Sender Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver two synthetic Managed Cloud owner and two employee invitations from a controlled Gmail account in one Vercel Preview branch.

**Architecture:** Add a staging-only SMTP adapter behind the existing `EmailProvider` interface. Resolve provider configuration in one server-side module shared by the scheduler and status endpoint. Treat SMTP ambiguity as a terminal outbox failure to avoid automatic duplicate mail.

**Tech Stack:** Node 24, TypeScript, Nodemailer, Node test runner.

**Spec:** `docs/superpowers/specs/2026-11-18-staging-gmail-sender-design.md`

## Global Constraints

- Only `VERCEL_ENV=preview` and `VERCEL_GIT_COMMIT_REF=codex/managed-cloud-onboarding` may select Gmail.
- Require an exact four-recipient allowlist; leave unrelated queued mail untouched and reject any other recipient before opening SMTP.
- Do not log or store SMTP credentials, email content or recipient addresses in run evidence.
- No Production env, database, Auth or Stripe changes.
- Keep Resend behavior unchanged for deployments without explicit staging SMTP selection.

## Review Focus

- Missing Vercel system variables must disable SMTP.
- Inherited Resend values must not override explicit staging SMTP selection.
- SMTP acceptance followed by outbox write failure must not auto resend.
- Address alias casing and whitespace must not bypass the allowlist.
- Unrelated queued mail must not be claimed or failed by staging Gmail.
- SMTP errors must not expose secrets or recipients in persisted error codes.

---

### Task 1: Provider selection

**Files:** Create `api/_email-provider-config.ts`; modify `api/outbox-scheduler.ts`, `api/email-notification-status.ts`; test `tests/email-provider-config.test.ts`.

**Interfaces:** `resolveEmailProviderConfig(env: NodeJS.ProcessEnv)` returns Resend or Gmail configuration, or null; Gmail configuration is returned only for the exact Preview branch and complete values.

- [ ] Write tests for Resend fallback, exact Preview and branch gate, missing values and no inherited-secret fallback.
- [ ] Run the targeted test and observe an expected failure.
- [ ] Implement selection and use it in both handlers.
- [ ] Run the targeted test and observe success.

### Task 2: Gmail SMTP adapter

**Files:** Create `api/_gmail-smtp-provider.ts`; modify `package.json`, `package-lock.json`, `api/outbox-scheduler.ts`; test `tests/gmail-smtp-provider.test.ts`.

**Interfaces:** `createGmailSmtpProvider(config, transport?)` implements `EmailProvider`; tests inject a transport without network access.

- [ ] Write tests for allowlist, accepted message ID, definite rejection, uncertain error and safe failure codes.
- [ ] Run the targeted test and observe an expected failure.
- [ ] Install Nodemailer and implement the minimal adapter.
- [ ] Run the targeted test and observe success.

### Task 3: Staging configuration and verification

**Files:** Modify `.env.example`, `docs/email-setup.md`, `docs/reviews/2026-11-18-managed-cloud-staging-readiness.md`.

- [ ] Document exact branch-scoped Preview variable names and operator steps; no secret values.
- [ ] Run `npm test`, `npm run lint`, `npm run build`, and `git diff --check`.
- [ ] Review staged diff and scan for secrets.
- [ ] Commit and push to Draft PR #192 for review; do not deploy.
