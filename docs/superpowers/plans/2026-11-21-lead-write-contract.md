# Lead write contract implementation plan

> **For agentic workers:** Use the executing-plans workflow. Track checks with checkboxes.

**Goal:** Use the same narrow browser contract for staging and an explicitly approved Production build.

**Architecture:** Three scoped write operations plus the existing owner detail edit, and one scoped lead history read. Keep the current app data shape and use database confirmations for local state. Preserve existing direct RLS and BYODB protections.

**Tech stack:** React, TypeScript, Supabase PostgREST, PostgreSQL 17, Playwright.

**Spec:** [Lead write contract review](../../reviews/2026-11-21-lead-write-contract.md).

- [ ] Introduce candidate gate and RPC response tests. Run them on the approved baseline before implementing the client.
- [ ] Add the staging contract and a separately reviewed Production variant. Exercise the same test operations against both disposable catalog shapes. Verify that no browser-wide update grant is required.
- [ ] Route create, assignment, status, and the existing owner detail editor through the candidate RPCs. Load scoped history only from persisted data and keep failures out of UI state and cache.
- [ ] Review the candidate and record exact commit. Request separate review before staging SQL application, then run staging Playwright with owner A, employee A, and owner B. Record reload and denial evidence and clean up synthetic rows.
- [ ] Document staging versus Production differences and rollback. Keep Production SQL and activation pending separate approval.
