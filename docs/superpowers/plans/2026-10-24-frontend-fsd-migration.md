# Frontend Feature-Sliced Design Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Move the existing StavbaFlow browser frontend into Feature-Sliced Design layers with entity and feature public APIs, and enforce the layer rules in ESLint and CI.

**Architecture:** Keep browser code under src/app, src/pages, src/widgets, src/features, src/entities, and src/shared. Move the current domain contracts and operations into their owning entity or feature slices, while keeping backend and connector-only code outside the frontend layer rules. Preserve the existing product and behavior; this is a structural migration.

**Tech Stack:** React 19, TypeScript 5.8, Vite 6, Node 24, ESLint 10.13.0, @typescript-eslint/parser 8.72.0, eslint-plugin-boundaries 7.3.0, eslint-import-resolver-typescript 4.4.5.

**Spec:** docs/superpowers/specs/2026-10-24-frontend-fsd-migration-design.md

## Global Constraints

- Use the current package lockfile and Node 24.
- Preserve existing tests and CI jobs; no production credentials are needed for frontend checks.
- Keep this as a structural refactor. If a discovered dependency requires a behavior change or database contract change, stop and bring that scope back for review.
- Do not access or write to production Supabase during this work.
- Enforce the layer order app → pages → widgets → features → entities → shared.
- Preserve existing routes, authorization rules, data behavior, visual behavior, and API contracts.
- Never commit or push to main, merge, or enable auto-merge.

## Review Focus

1. Lead, Employee, and Company public types and CRUD operations can drift during relocation. Pin existing lifecycle, employee-scope, production-schema, and attachment behavior with the existing lead-lifecycle, employee-scope, production-schema, and lead-attachments tests in Task 1.
2. A feature or page can accidentally import a private file from another slice. Task 5 adds an ESLint fixture test that accepts a public index import and rejects a deep import.
3. A lower layer can acquire an import from a higher layer. Task 5 tests an entity-to-feature violation and a shared-to-entity violation.
4. Root API handlers may accidentally gain browser-only imports while shared types move. Task 4 runs API and registration tests plus TypeScript checking and the build after alias changes.
5. Public demo routing and global styles can break when the entry point and page modules move. Task 4 runs the demo isolation, deployment-surface, and public-demo tests plus the production build.

---

### Task 1: Move domain models and CRUD contracts into entity slices

**Files:**
- Create: tests/fsd-entity-slices.test.ts
- Create: src/entities/lead/{ui,model,api,index.ts}
- Create: src/entities/employee/{ui,model,api,index.ts}
- Create: src/entities/company/{ui,model,api,index.ts}
- Create: src/entities/session/model/index.ts and src/entities/session/index.ts for the current authenticated-workspace contract.
- Create: src/shared/api/supabase.ts and src/shared/api/crm-repository.ts for runtime-neutral Supabase and repository infrastructure.
- Move: types/index.ts domain contracts into lead/model, employee/model, and company/model; move lib/data implementations and contracts into shared API infrastructure with entity API facades.
- Modify: context/OrganizationContext.tsx, context/OrganizationContextBase.ts, src/app/employeeScope.ts, src/app/leadLifecycle.ts, src/app/leadSource.ts, src/app/leadAttachments.ts, and their consumers.
- Modify: root API imports of entity contracts to explicit type-only imports from entity public APIs.
- Preserve outside FSD: lib/gemini.ts, lib/integrations/pilotImport.ts, and shared/connectorProtocol.ts because server handlers or the connector runtime consume them.

**Interfaces:**
- Consumes: Current Lead, Employee, CompanyBranding, ICRMRepository, SupabaseRepository, SynologyLocalRepository, OrganizationContext, and existing domain helpers.
- Produces: lead index.ts exports Lead, LeadStatus, Priority, getLeads(orgId), saveLead(orgId, lead), updateLeadStatus(orgId, leadId, status), deleteLead(orgId, leadId), note/file APIs, and LeadStatusBadge({ status }). Employee index.ts exports Employee, getEmployees(orgId), saveEmployee(orgId, employee), and EmployeeIdentity({ employee }). Company index.ts exports CompanyBranding, getBranding(orgId), saveBranding(orgId, branding), and CompanyIdentity({ name, logoUrl, primaryColor }). The session index exports OrganizationProvider, useOrganization, and current user/organization types.

- [x] Step 1: Add fsd-entity-slices.test.ts asserting that lead, employee, and company each have ui, model, api, and index.ts. Include a failure message naming the missing slice path.
- [x] Step 2: Run npx tsx --test tests/fsd-entity-slices.test.ts and confirm it fails because the entity slices do not exist.
- [x] Step 3: Move Lead/Employee/Company contracts into their model segments; add entity API facades over the existing repository adapter and keep Supabase calls unchanged.
- [x] Step 4: Extract only existing Lead status, Employee identity, and Company identity markup into entity ui components; pass typed props and preserve the current markup and behavior.
- [x] Step 5: Move the authenticated-workspace context contract and provider into the session entity slice; update consumers to use public entity APIs.
- [x] Step 6: Run npx tsx --test tests/fsd-entity-slices.test.ts, npm test, npm run lint, and npm run build. Confirm the structure test passes and existing domain tests remain green.
- [x] Step 7: Commit as refactor: add FSD entity public APIs.

### Task 2: Move user scenarios into feature slices

**Files:**
- Create: tests/fsd-feature-slices.test.ts
- Create: src/features/manage-leads/{ui,model,index.ts}
- Create: src/features/import-leads/{ui,model,lib,index.ts}
- Create: src/features/manage-employees/{ui,model,index.ts}
- Create: src/features/employee-workflow/{ui,model,index.ts}
- Create: src/features/employee-invitations/{ui,model,api,index.ts}
- Create: src/features/onboarding-checklist/{ui,model,index.ts}
- Create: src/features/public-demo/{model,index.ts}
- Create: src/features/submit-inquiry/{ui,model,index.ts}
- Create: src/features/lead-files/{ui,model,api,index.ts}
- Create: src/features/manage-integrations/{ui,model,api,index.ts}
- Move: features/LeadDetail.tsx, features/LeadsKanban.tsx, features/EmployeeDashboard.tsx, features/lead-tabs/*, components/integrations/CSVImportModal.tsx, components/integrations/SmartFieldMappingModal.tsx, components/integrations/TablePreviewModal.tsx, components/integrations/WebhookDetailsModal.tsx, components/integrations/ConnectorMapping.tsx, components/integrations/ConnectorSetup.tsx, components/integrations/ConnectorStatus.tsx, components/OnboardingWizardModal.tsx, components/VoiceNotesModal.tsx, components/ExportZipModal.tsx, lib/integrations/fileParser.ts, lib/integrations/fieldMapping.ts, and lib/integrations/sqlConnector.ts, lib/integrations/sheetsConnector.ts, hooks/useVoiceNotes.ts, types/integrations.ts, types/synology.ts, and features/publicDemo/demoState.ts, and components/EnterpriseInquiryForm.tsx.
- Modify: feature consumers to import through feature index.ts files.

**Interfaces:**
- Consumes: Entity public APIs from Task 1.
- Produces: One index.ts per feature slice, exporting only user-facing scenario UI and model/API functions consumed by pages, widgets, or app composition.

- [x] Step 1: Add fsd-feature-slices.test.ts asserting that each named scenario slice listed above has an index.ts.
- [x] Step 2: Run npx tsx --test tests/fsd-feature-slices.test.ts and confirm it fails because these feature slices do not exist yet.
- [x] Step 3: Move lead management and lead-tab interactions into manage-leads; move CSV parsing UI into import-leads; move employee management and onboarding into their named feature slices.
- [x] Step 4: Move invitation, lead-file, and integration actions into their feature slices. Keep server-side CSV import processing in its existing backend module.
- [x] Step 5: Update consumers to use the feature public APIs; keep intra-slice imports relative.
- [x] Step 6: Run npx tsx --test tests/fsd-feature-slices.test.ts, npm test, npm run lint, and npm run build. Confirm all named feature entry points exist and import, invitation, attachment, and integration tests pass.
- [x] Step 7: Commit as refactor: move browser scenarios into FSD features.

### Task 3: Organize widgets and route pages

**Files:**
- Create: tests/fsd-page-widget-slices.test.ts
- Create: src/widgets/sidebar/{ui,index.ts}
- Create: src/widgets/company-switcher/{ui,index.ts}
- Create: src/widgets/owner-dashboard/{ui,index.ts}
- Create: src/widgets/workspace-readiness/{ui,index.ts}
- Create: src/widgets/weather/{ui,index.ts}
- Create: src/widgets/notifications/{ui,index.ts}
- Create: src/widgets/command-palette/{ui,index.ts}
- Create: src/widgets/ai-assistant/{ui,index.ts}
- Create: src/widgets/calendar/{ui,index.ts}
- Create: src/widgets/workspace-shell/{ui,index.ts}
- Create: src/pages/admin/{companies,dashboard,panel,support-session}/{ui,index.ts}
- Create: src/pages/employee/{dashboard,jobs,photos,schedule}/{ui,index.ts}
- Create: src/pages/owner/{analytics,billing-return,calendar,communication,dashboard,employees,install,integrations,leads,pilot-unavailable,projects,settings,widget}/{ui,index.ts}
- Create: src/pages/auth/{login,paid-registration}/{ui,index.ts}
- Create: src/pages/public/{demo,landing,inquiry,embed,iframe,sales}/{ui,index.ts}
- Move: existing src/pages route components into their matching page slice ui folders; move AdminPanel to admin/panel; AnalyticsPage, CommunicationCenterPage, and InstallStudio to their owner page slices; move LandingPage, InquiryFormPage, EmbedWidgetPage, WidgetIframePage, SalesWorkspace, and PublicDemoWorkspace into the public page slices above; move LoginPage to auth/login.
- Move: Sidebar, CompanySwitcher, OwnerDashboard, WorkspaceReadinessPanel, WeatherWidget, NotificationCenter, CommandPalette, FloatingAIAssistant, EmbedLeadWidget, CalendarView, and ownerDashboard/dashboardMetrics into the matching widget slices; move src/layouts into workspace-shell; keep scenario actions in the feature slices from Task 2.
- Move: components/ErrorBoundary.tsx into app/providers and components/PhotoLightbox.tsx into shared/ui.
- Modify: route and page consumers to import only from page/widget index.ts files.

**Interfaces:**
- Consumes: Feature and entity public APIs from Tasks 1 and 2.
- Produces: Route page and widget entry points through page/widget index.ts files; route-specific screens remain composed by the app layer.

- [ ] Step 1: Add fsd-page-widget-slices.test.ts asserting the required page and widget layer directories exist and each listed slice has an index.ts.
- [ ] Step 2: Run npx tsx --test tests/fsd-page-widget-slices.test.ts and confirm it fails before the page/widget slices are created.
- [ ] Step 3: Move current route components into the page slices without changing URLs, access guards, or page behavior; keep the owner calendar route as a page slice that composes the calendar widget.
- [ ] Step 4: Move complex reusable UI into widgets and preserve feature ownership of user actions.
- [ ] Step 5: Update route composition and page/widget cross-slice imports to consume only public index.ts files.
- [ ] Step 6: Run npx tsx --test tests/fsd-page-widget-slices.test.ts, npm test, npm run lint, and npm run build. Confirm page/widget APIs exist and demo/deployment behavior remains green.
- [ ] Step 7: Commit as refactor: organize FSD pages and widgets.

### Task 4: Consolidate app and shared code under the FSD boundary

**Files:**
- Create: tests/fsd-layer-layout.test.ts
- Create: src/app/index.ts
- Modify: src/main.tsx into a thin entry importing the app public API; move src/App.tsx into src/app/App.tsx; move src/index.css into src/app/styles; move src/components/ui/common.tsx and src/lib/sentry.ts into src/shared; move src/vite-env.d.ts into app.
- Move: browser-only lib/demoData.ts, lib/autoAssignment.ts, lib/branding.ts, lib/brandingEngine.ts, and remaining browser utilities into src/shared or the owning entity/feature slices. Move lib/supabase.ts and lib/data in Task 1; move browser import/connector utilities in Task 2.
- Move: remaining src/app helpers to their owners: router, guards, app composition, and runtime/deployment initialization remain in app; lead/employee rules move to entities; billing, paid-registration, consent, invitation, CSV, platform, connector, and sales scenarios move to features; generic browser utilities move to shared.
- Modify: tsconfig.json and vite.config.ts so @ resolves only to src; update tests, Node API type-only imports, and remaining frontend aliases.
- Remove: legacy browser-only implementations from root components, features, hooks, context, types, and lib. Keep backend/connector-only code and cross-runtime contracts outside src.

**Interfaces:**
- Consumes: Entity, feature, page, and widget public APIs from Tasks 1 through 3.
- Produces: src/app as the application composition layer; src/shared as the browser-side generic UI/infrastructure layer; @ aliases resolve to src only.

- [ ] Step 1: Add fsd-layer-layout.test.ts asserting all six layers exist and there are no duplicate browser implementations in the legacy root directories.
- [ ] Step 2: Run npx tsx --test tests/fsd-layer-layout.test.ts and confirm it fails before app/shared consolidation and alias cleanup.
- [ ] Step 3: Keep entry initialization, routing, global providers, route guards, and global styles in app; move domain helpers to their owning feature/entity/shared slices.
- [ ] Step 4: Move generic browser UI and infrastructure into shared; keep lib/gemini.ts, lib/integrations/pilotImport.ts, and shared/connectorProtocol.ts outside src because backend or connector code uses them.
- [ ] Step 5: Change TypeScript and Vite @ aliases to src only, update all imports, and remove legacy browser copies.
- [ ] Step 6: Run npx tsx --test tests/fsd-layer-layout.test.ts, npm test, npm run lint, and npm run build. Confirm server handler tests pass and the browser build succeeds.
- [ ] Step 7: Commit as refactor: complete FSD app and shared layers.

### Task 5: Enforce layer and public API boundaries

**Files:**
- Create: tests/fsd-boundaries.test.ts
- Create: eslint.config.js
- Modify: package.json, package-lock.json, AGENTS.md.
- Preserve: .github/workflows/verify.yml, which already runs npm run lint on pull requests and main pushes.

**Interfaces:**
- Consumes: Complete six-layer structure and public index.ts files from Tasks 1 through 4.
- Produces: npm run lint executes tsc --noEmit and ESLint; ESLint uses eslint-plugin-boundaries to enforce the layer graph and permits cross-slice imports only through index.ts.

- [ ] Step 1: Add fsd-boundaries.test.ts using the ESLint API to check a valid feature-to-entity public import, reject an entity-to-feature import, reject a feature deep import into an entity, reject a feature-to-feature deep import, and reject a shared-to-entity import.
- [ ] Step 2: Run npx tsx --test tests/fsd-boundaries.test.ts and confirm it fails because the ESLint setup and boundary rules do not exist.
- [ ] Step 3: Add eslint 10.13.0, @typescript-eslint/parser 8.72.0, eslint-plugin-boundaries 7.3.0, and eslint-import-resolver-typescript 4.4.5 as development dependencies.
- [ ] Step 4: Configure eslint.config.js for TypeScript under src, the six FSD element types, public-entry file categories for index.ts, one-way layer policies, same-layer cross-slice public API imports, and unknown local dependencies.
- [ ] Step 5: Change npm run lint to execute tsc --noEmit followed by eslint on src; update AGENTS.md with the layer order, public API rule, and backend/connector exclusions.
- [ ] Step 6: Run npx tsx --test tests/fsd-boundaries.test.ts and confirm valid imports pass and all four forbidden import classes fail.
- [ ] Step 7: Run npm ci, npm test, npm run lint, npm run build, git diff --check, and a staged secret scan. Confirm the existing verify workflow invokes ESLint through npm run lint.
- [ ] Step 8: Commit as chore: enforce FSD import boundaries.
- [ ] Step 9: Push only codex/fsd-frontend-migration and open a draft PR; do not merge or enable auto-merge.
