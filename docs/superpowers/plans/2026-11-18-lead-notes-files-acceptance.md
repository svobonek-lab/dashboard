# Lead notes and files acceptance implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make lead notes and private files honest under partial failures and prove their isolation in an exact isolated staging Preview.

**Architecture:** Keep Supabase Postgres RLS and private Storage policies as the authorization boundary. The repository reports exact mutation results and preserves metadata when individual previews fail; UI mirrors delete eligibility. A synthetic Playwright flow verifies browser behavior and direct REST/Storage isolation. Production flags remain off pending approved read-only review and release decision.

**Tech Stack:** React 19, TypeScript, Supabase JS, Vite, Node test runner, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-18-lead-notes-files-acceptance.md`

## Global Constraints

- Work only on `codex/lead-notes-files-acceptance`; do not merge, auto-deploy, or change Production.
- Only synthetic staging accounts and rows may be used for live writes.
- Production Supabase metadata may be queried only through project-scoped read-only `supabase-ci` MCP.
- Disable automatic Vercel Git deployment for this branch before pushing.
- Never log credentials, signed URLs, or customer rows.

## Review Focus

- A signed URL request for one file fails: notes and other files remain visible, while the failed file has no clickable preview.
- A filtered RLS DELETE returns zero rows: repository reports denial and never removes Storage.
- A Storage removal fails after metadata deletion: UI reports partial failure and operator can identify the exact orphan path.
- An upload is interrupted after a signed URL was created: no metadata is inserted and exact-path cleanup is attempted.
- A stale 15-minute UI clock allows a delete click near expiry: RLS still decides; UI refreshes the error honestly.

---

### Task 1: Repository failure semantics

**Files:**
- Modify: `src/shared/api/data/SupabaseRepository.ts`, `src/shared/api/data/types.ts`
- Create: `src/shared/api/data/leadAttachmentOperations.ts`
- Test: `tests/lead-attachment-operations.test.ts`

**Interfaces:** `LeadStoredFile.previewUrl: string | null`; repository methods keep their existing signatures. Extract small pure or injected operations where needed to test signed URLs, zero-row deletes, upload cleanup and Storage delete without a live backend.

- [ ] Write focused tests for per-file preview failure, zero-row note/file DELETE, upload failure and cleanup, metadata insert failure and cleanup, post-insert preview failure, and Storage delete failure.
- [ ] Run focused tests and confirm expected failures.
- [ ] Implement repository behavior and run focused tests to green.
- [ ] Run `npm run lint` for type and FSD boundary checks.

### Task 2: UI authorization and partial display

**Files:**
- Create: `src/features/lead-files/model/deleteEligibility.ts`
- Modify: `src/features/lead-files/index.ts`, `src/features/manage-leads/ui/lead-tabs/DocumentsTab.tsx`, `src/pages/employee/photos/ui/Photos.tsx`
- Test: `tests/lead-attachment-delete-eligibility.test.ts`, `tests/lead-attachments-ui.test.ts`

**Interfaces:** `canDeleteLeadAttachment(role: string | undefined, userId: string | undefined, authorId: string, createdAt: string, now?: Date): boolean` mirrors the 15-minute RLS window. Both screens consume `useOrganization().dbUser` and nullable previews.

- [ ] Write tests for owner, author employee before/at/after 15 minutes, foreign employee, missing identity and invalid timestamp; add behavior assertions for isolated notes/files loading and unavailable previews.
- [ ] Run focused tests to see failures.
- [ ] Implement eligibility and UI changes, including honest errors on partial deletion and no success notice after failed reload.
- [ ] Run focused tests and `npm run lint` to green.

### Task 3: Staging acceptance and orphan procedure

**Files:**
- Modify: `vercel.json`, `.github/workflows/staging-e2e.yml` if needed for opt-in run
- Create: `tests/e2e/lead-attachments-staging.spec.ts`, `docs/lead-attachments-staging-acceptance.md`
- Test: `tests/staging-e2e-contract.test.ts` or focused acceptance guard test.

**Interfaces:** Playwright uses existing `stagingConfig`, `signIn`, `accessToken` and REST helpers; adds a controlled same-company unassigned employee fixture only in isolated staging. The acceptance document records exact synthetic IDs/statuses/cleanup, with no credentials or signed URLs.

- [ ] Add a failing guard test for branch auto-deploy disabled and acceptance coverage of owner/assigned/foreign/company B, PDF/JPEG, 15 MiB, MIME and failure paths.
- [ ] Run the guard test to confirm failure, implement the acceptance flow and run it to green locally where credentials are available.
- [ ] Run `npm test`, `npm run lint`, `npm run build` and review diff plus secret scan.
- [ ] Push branch and open a reviewable PR. Deliberately create an exact staging Preview, run browser/direct API acceptance, and record the results. No Production deployment.

### Task 4: Production release gate

**Files:** `docs/lead-attachments-staging-acceptance.md`, release proposal if approved metadata access exists.

- [ ] Inspect live Production policies, bucket and grants only via `supabase-ci` read-only MCP; otherwise record the unavailable gate.
- [ ] Require staging acceptance evidence and explicit release approval before proposing exact Production env changes for both flags.
- [ ] Leave `VITE_LEAD_NOTES_FILES_ENABLED` and `VITE_PRODUCTION_LEAD_NOTES_FILES_APPROVED` off in Production.
