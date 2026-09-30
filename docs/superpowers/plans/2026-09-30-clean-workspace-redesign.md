# StavbaCore clean workspace redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Deliver a coherent owner, employee, landing, and demo visual system that makes StavbaCore immediately legible to a small construction company.

**Architecture:** Add a small shared visual token layer and focused shell primitives, then reshape existing page composition without changing auth, data contracts, routes, or Supabase behavior. Keep owner and employee layouts separate so visual simplification cannot weaken authorization.

**Tech Stack:** React 19, TypeScript, Vite, Tailwind CSS v4, lucide-react, existing router and role guards.

**Spec:** `docs/superpowers/specs/2026-09-30-clean-workspace-design.md`

## Global Constraints

- Do not modify Supabase schema, policies, grants, migrations, or production data.
- Preserve `getDefaultRouteForRole`, `ProtectedRoute`, `RoleGuard`, tenant-scoped reads, and fail-closed production behavior.
- Use sentence case Czech copy and no customer data in demo fixtures.
- Keep the public demo explicitly labeled as illustrative.
- Maintain responsive behavior at 390px and desktop widths.
- Run `npm test`, `npm run lint`, `npm run build`, and `git diff --check` before the PR.

## Review Focus

- Employee route must not expose owner navigation or metrics; add a render-level assertion to the employee layout test.
- Owner empty company data must show a useful next action instead of demo data; add a readiness fixture test.
- Landing CTA must route to the configured app URL without losing query parameters; retain deployment-surface tests.
- Narrow viewport must keep primary action reachable; add a pure layout token test for the mobile breakpoint.
- Reduced-motion preference must disable entrance transitions; add a class/token test for the motion utility.

### Task 1: Shared workspace visual tokens

**Files:**
- Create: `src/styles/workspace.css`
- Modify: `src/main.tsx` or the existing global style entry
- Test: `tests/workspace-visual-system.test.ts`

**Interfaces:**
- Produces CSS variables and utility classes `.workspace-shell`, `.workspace-rail`, `.workspace-panel`, `.workspace-primary-action`, `.workspace-empty-state`.
- Consumes existing Tailwind classes and does not alter domain types.

- [ ] Add a test that asserts the token source contains the required light base, primary blue, focus ring, and reduced-motion rule.
- [ ] Import the stylesheet from the existing global entry without adding a dependency.
- [ ] Implement the token layer with 8px spacing rhythm, 12px panel radius, 1px neutral borders, visible `:focus-visible`, and `@media (prefers-reduced-motion: reduce)` disabling transitions.
- [ ] Run the focused test and then the full test suite.
- [ ] Commit as `feat: add clean workspace visual tokens`.

### Task 2: Owner workspace shell and dashboard hierarchy

**Files:**
- Modify: `src/layouts/OwnerLayout.tsx`
- Modify: `src/pages/owner/Dashboard.tsx`
- Modify: `features/SalesWorkspace.tsx`
- Test: `tests/workspace-readiness.test.ts`, `tests/sales-workspace.test.ts`

**Interfaces:**
- Preserve `OwnerLayout` props and child routing.
- Preserve `SalesWorkspace` data and action callbacks.

- [ ] Add a compact rail with company identity, owner navigation, and one primary action while retaining all existing route links and access guards.
- [ ] Replace repeated decorative cards with a page header, attention queue, pipeline summary, and team workload sections using the shared tokens.
- [ ] Make the first action label explicit (`Nová poptávka` or `Přidat zakázku`) and keep existing handlers unchanged.
- [ ] Render owner empty states from readiness data and never seed non-demo organizations.
- [ ] Verify existing sales and readiness tests, then commit `feat: reshape owner workspace for daily decisions`.

### Task 3: Employee field workspace

**Files:**
- Modify: `src/layouts/EmployeeLayout.tsx`
- Modify: `src/pages/employee/Dashboard.tsx`
- Modify: `src/pages/employee/Jobs.tsx`
- Test: `tests/employee-scope.test.ts`, `tests/workspace-readiness.test.ts`

**Interfaces:**
- Keep employee lead filtering through `getEmployeeLeads` and existing route guards.
- Keep callbacks for lead updates and selection unchanged.

- [ ] Make `Moje dnešní práce` the visual entry point with next visit, assigned jobs, and checklist action.
- [ ] Remove owner-only navigation labels and financial summary from the employee layout while leaving inaccessible routes guarded.
- [ ] Add a clear empty state for no assigned jobs and a visible focus state for job actions.
- [ ] Add a test fixture proving the employee view is derived only from assigned leads.
- [ ] Run tests and commit `feat: focus employee workspace on assigned jobs`.

### Task 4: Landing and public demo conversion surface

**Files:**
- Modify: `features/LandingPage.tsx`
- Modify: `features/publicDemo/PublicDemoWorkspace.tsx`
- Modify: `features/InteractiveStoryDemo.tsx`
- Test: `tests/public-demo.test.ts`, `tests/deployment-surface.test.ts`

**Interfaces:**
- Preserve `buildAppLoginUrl`, deployment surface routing, and public demo state transitions.
- Preserve synthetic demo lead data and disclosure copy.

- [ ] Rewrite the hero around the concrete promise and add the four-step lead-to-job flow.
- [ ] Use one primary CTA and one secondary CTA; keep app URL query parameters intact.
- [ ] Show a quiet, realistic dashboard preview with explicit `Ukázková data` labeling.
- [ ] Ensure public demo actions remain synthetic and never call production Supabase.
- [ ] Run public demo and routing tests and commit `feat: make landing explain the construction workflow`.

### Task 5: Integrated review and preview

**Files:**
- Modify: `README.md` only if the screenshots or routes need a current description.
- Test: full existing test suite plus `npm run lint` and `npm run build`.

- [ ] Review the owner, employee, and landing flows at desktop and 390px widths in the Vercel preview.
- [ ] Check keyboard focus and reduced-motion behavior.
- [ ] Run `npm test`, `npm run lint`, `npm run build`, and `git diff --check`.
- [ ] Commit any review fixes in the same branch and open a draft PR without merging or deploying production.
