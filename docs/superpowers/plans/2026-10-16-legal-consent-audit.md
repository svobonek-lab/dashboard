# Legal Consent Audit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Require and durably audit TOS and DPA consent for a new organization owner during registration and owner-invite activation.

**Architecture:** A small shared legal-consent value represents both checked agreements and their browser capture time. UI forms own the checked state and cannot submit until both values are true. Server APIs validate the payload, while the proposed staging SQL contract persists server-received consent as immutable organization audit records; employees never make the organization-level DPA affirmation.

**Tech Stack:** React 19, TypeScript, Tailwind, Supabase Auth and Postgres staging contracts, Node test runner.

**Spec:** User-provided active goal, 2026-10-16.

## Global Constraints

- Work only in a feature branch; do not merge or change production Supabase.
- Both legal controls are required for owners, are unchecked by default, and disable submission until checked.
- Never rely on editable client metadata for authorization or legal-audit authority.
- Client capture time is sent in payload; database acceptance time is generated server-side.
- Employee invitation activation must not claim it can bind the organization to DPA.

## Review Focus

- Owner attempts submission with either checkbox unchecked: browser and server reject it.
- Malformed, stale, or future client timestamps do not become audit evidence.
- Employee invite activation never invokes organization-level DPA acceptance.
- The platform API cannot create an owner invitation without explicit owner legal acceptance.
- Database audit rows are tenant-scoped and immutable to ordinary authenticated clients.

---

### Task 1: Consent model and server validation

**Files:**
- Create: `src/app/legalConsent.ts`
- Create: `tests/legal-consent.test.ts`
- Modify: `api/_platform/routes/companies.ts`
- Modify: `src/app/platformClient.ts`
- Test: `tests/platform-company-onboarding.test.ts`

- [ ] Write failing tests for required checked fields, valid ISO timestamp, and platform onboarding rejection when legal consent is absent.
- [ ] Implement a shared parser/validator and require a valid consent payload at the platform API boundary.
- [ ] Pass the normalized data through the platform client without adding it to user-editable authorization metadata.

### Task 2: Owner registration and invite-activation UI

**Files:**
- Create: `components/LegalConsentFields.tsx`
- Modify: `components/LoginPage.tsx`
- Modify: `context/OrganizationContext.tsx`
- Test: `tests/legal-consent.test.ts`

- [ ] Write a failing integration-honesty test that requires owner signup and owner invite activation to use the reusable legal UI and send its capture time.
- [ ] Implement accessible Tailwind controls, unchecked by default, and disable owner submission until both are checked.
- [ ] Pass the capture time to the context methods. Keep employee invite activation free of organization-binding DPA controls.

### Task 3: Staging persistence contract

**Files:**
- Create: `supabase/staging/20261016_legal_consent_contract.sql`
- Create: `supabase/tests/legal_consent_verify.sql`
- Modify: `supabase/staging/20261012_platform_company_onboarding.sql`
- Test: `tests/legal-consent.test.ts`

- [ ] Write a contract test that asserts organization-scoped immutable audit records and rejects cross-company reads/writes.
- [ ] Add the staging-only schema/RPC proposal: server timestamp, actor, organization, agreement version, and client capture time.
- [ ] Update owner-onboarding RPC signature to require consent and append audit events; do not apply it automatically.

### Task 4: Verification and review

**Files:**
- Test: `tests/legal-consent.test.ts`, full `npm test`

- [ ] Run targeted tests, full suite, lint, build, and secret scan.
- [ ] Review the diff to confirm no secrets, no production DB operation, and no employee DPA authority.