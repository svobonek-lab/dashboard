# StavbaFlow design refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Give the existing StavbaFlow application one accessible, responsive visual system and improve the public mobile board without changing tenant or business behavior.

**Architecture:** Keep the existing FSD slices. Centralize the new surface, type, shape, spacing, and action tokens in the app stylesheet; update workspace shells and shared controls; apply targeted improvements to the public demo board and auth screens. A dedicated local Playwright config exercises only public synthetic routes and never submits forms.

**Tech Stack:** React 19, TypeScript, Tailwind CSS 4, Vite 8, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-06-stavbaflow-design-refresh.md`

## Global Constraints

- Keep existing owner, employee, admin, invitation, intake, and billing behavior unchanged.
- Use synthetic read-only browser routes; production and customer data remain untouched.
- Keep the existing FSD layer boundaries and existing dependencies.
- Use the system font stack; do not add a remote font request or new package.
- Main action `#2563EB` (preserve the existing StavbaFlow identity); canvas `#F2F3F0`; paper `#FFFFFF`; ink `#202923`; muted `#5F6B63`; divider `#D9DED8`; success `#256344`.
- Primary controls are at least 44 px high; page text is at least 14 px except labels; preserve visible focus and reduced-motion support.
- Do not deploy, merge, submit reset emails, or make database/environment writes.

## Review Focus

- **320 px viewport and long Czech labels:** the page must not overflow horizontally; every board stage stays reachable and the active stage is fully readable. Test each stage at 320 and 390 px.
- **Long currency values and project titles:** cards must wrap without hiding price, title, or stage count. Test representative synthetic values in the demo board.
- **Employee avatar requests:** rendering a lead must not send an employee name to an external avatar service. Assert board avatars are generated locally.
- **Keyboard-only board navigation:** the selected stage and its card count must be announced and focus must remain visible. Test Tab/arrow navigation and selected state.
- **Reduced motion:** transitions must be suppressed without hiding content. Test `prefers-reduced-motion: reduce` on demo and login routes.
- **Supabase unavailable, recovery rate-limited, or Auth misconfigured:** forms must not claim a reset message was sent unless the request succeeded and errors must give a next step without exposing provider details. Test rendering of each known state without submitting a request.

---

### Task 1: Shared design tokens and workspace shells

**Files:**
- Modify: `src/app/styles/index.css`
- Modify: `src/widgets/workspace-shell/ui/OwnerLayout.tsx`
- Modify: `src/widgets/workspace-shell/ui/EmployeeLayout.tsx`
- Modify: `src/widgets/workspace-shell/ui/SuperAdminLayout.tsx`
- Modify: `src/shared/ui/common.tsx`
- Modify: `package.json`
- Create: `playwright.design.config.ts`
- Test: `tests/design-system.spec.ts`

**Interfaces:**
- Consumes: existing FSD components, Tailwind utility classes, current navigation and guard behavior.
- Produces: the shared workspace tokens, shell classes, and local visual test configuration used by later tasks.

- [x] **Step 1: Add `test:design` and a local-only Playwright config**
- [x] **Step 2: Add local visual smoke tests for public shell and keyboard focus**
  - Assert at 1440, 1024, 768, 390, and 320 px that `/demo` and `/login` have no horizontal document overflow.
  - Assert primary buttons and links expose visible focus, and reduced-motion emulation has no running transition.
- [x] **Step 3: Run the focused Playwright tests and record the baseline failures**
- [x] **Step 4: Implement the token system and align all three shells and shared controls**
  - Keep owner, employee, and platform routes distinct; change only their common surface and control language.
- [x] **Step 5: Re-run the focused tests and capture desktop/mobile screenshots**
- [x] **Step 6: Run root typecheck/lint and production build**

### Task 2: Mobile lead board navigation

**Files:**
- Modify: `src/features/manage-leads/ui/LeadsKanban.tsx`
- Modify: `src/pages/public/demo/ui/PublicDemoWorkspace.tsx`
- Modify: `src/app/styles/index.css`
- Modify: `tests/design-system.spec.ts`

**Interfaces:**
- Consumes: current lead statuses, read-only prop, and existing desktop drag/status handlers.
- Produces: a mobile stage navigator with linked tab and tab-panel semantics and one fully visible selected column; desktop board and existing write rules remain intact.

- [x] **Step 1: Add a failing mobile test selecting each stage and checking its cards/count**
- [x] **Step 2: Run the new test to confirm the current board is clipped or unreachable**
- [x] **Step 3: Remove third-party avatar requests containing employee names; render initials locally**
- [x] **Step 4: Add small-screen stage selection and accessible selected/count state**
- [x] **Step 5: Test all six stages at 320 and 390 px, including long synthetic titles and price formatting**
- [x] **Step 6: Check the desktop board and demo read-only message are unchanged**

### Task 3: Authentication and password recovery presentation

**Files:**
- Modify: `src/pages/auth/login/ui/LoginPage.tsx`
- Modify: `src/app/styles/index.css`
- Modify: `tests/design-system.spec.ts`

**Interfaces:**
- Consumes: current Auth mode, reset result, recovery events, and login navigation.
- Produces: a responsive form matching the shared system and honest, actionable failure states; successful recovery stays on `/login` and still uses existing password completion logic.

- [x] **Step 1: Add Playwright assertions for login, recovery, invite password, success-message copy, and the visible error state**
- [x] **Step 2: Run the focused test to establish the current visual and messaging gaps**
- [x] **Step 3: Restyle forms and make existing recovery errors specific where the code can identify the condition**
  - Do not submit the form, request email, alter password, or expose an Auth/provider error body.
- [x] **Step 4: Test the routes at 390 and 1440 px with keyboard and reduced-motion emulation**

### Task 4: Owner, employee, and platform overview surfaces

**Files:**
- Modify: `src/widgets/owner-dashboard/ui/OwnerDashboard.tsx`
- Modify: `src/features/employee-workflow/ui/EmployeeDashboard.tsx`
- Modify: `src/pages/admin/dashboard/ui/Dashboard.tsx`
- Modify: `src/pages/public/demo/ui/PublicDemoWorkspace.tsx`
- Modify: `src/app/styles/index.css`
- Create: `tests/fixtures/employee-dashboard.html`
- Create: `tests/fixtures/employee-dashboard.tsx`
- Modify: `tests/design-system.spec.ts`

**Interfaces:**
- Consumes: current dashboard data models, role restrictions, empty states, and demo context.
- Produces: consistent title, summary, work list, status, and action hierarchy; the public owner demo remains synthetic and read-only.

- [x] **Step 1: Add demo dashboard layout and action-disabled assertions; add a local synthetic employee-screen visual fixture that bypasses Auth only in the test browser**
- [x] **Step 2: Verify the fixture cannot call or fake a successful database/API write**
- [x] **Step 3: Apply hierarchy and spacing to owner/employee/admin overviews using existing props**
- [x] **Step 4: Verify desktop/mobile screenshots and role-safe visible controls**

### Task 5: Remaining route audit and design report

**Files:**
- Modify only where needed: `src/pages/public/landing/ui/LandingPage.tsx`, `src/pages/owner/leads/ui/Leads.tsx`, `src/pages/owner/integrations/ui/Integrations.tsx`, `src/pages/owner/settings/ui/Settings.tsx`, `src/pages/employee/jobs/ui/Jobs.tsx`, `src/pages/employee/photos/ui/Photos.tsx`
- Create: `docs/design-audit-2026-11-06.md`
- Test: `tests/design-system.spec.ts`

**Interfaces:**
- Consumes: all routes defined in `src/shared/lib/router.tsx` and truthful pilot limitations.
- Produces: a route-by-route visual/functional smoke summary, reproducible findings, and remaining authenticated blockers. No feature claims or data semantics change.

- [x] **Step 1: Enumerate public, auth, owner, employee, and admin routes from the router**
- [x] **Step 2: Exercise safe public routes and synthetic demo routes in Playwright; mark authenticated-only routes blocked when no synthetic session is configured**
- [x] **Step 3: Fix only clear visual inconsistencies revealed by this pass**
- [x] **Step 4: Run `npm test`, `npm run lint`, `npm run build`, and the design Playwright suite serially**
- [x] **Step 5: Review screenshots at target breakpoints, verify no console errors, and record results and blockers**
