# Frontend Feature-Sliced Design Migration

**Status:** Proposed design for review
**Date:** 2026-10-24

## Intent

Move the browser frontend from the current mixture of root-level components, features, context, hooks, types, and libraries into a Feature-Sliced Design structure. The current layout makes related behavior hard to find and allows imports to bypass module boundaries. The migration should make the domain and user scenarios visible in the file tree, give each slice a stable public API, and have CI reject invalid dependencies.

The supplied dashboard-main (12) archive matches the current GitHub main source after normalizing line endings. Implementation will use the current main commit in an isolated branch so that the archive’s code is represented without importing archive metadata or local credentials.

## Goals

- Put all browser application code under src/app, src/pages, src/widgets, src/features, src/entities, and src/shared.
- Move Lead, Employee, and Company models and data access into entity slices, each with ui, model, api, and index.ts.
- Move user actions and business scenarios such as lead management, CSV import, onboarding, invitations, and paid registration into feature slices.
- Put complex reusable screen blocks such as the sidebar and workspace readiness panel into widget slices.
- Keep page slices focused on route-level composition.
- Give every feature and entity slice a public index.ts, and use public entry points for cross-slice imports.
- Configure ESLint to enforce the layer order app → pages → widgets → features → entities → shared and reject cross-slice internal imports.
- Keep current routes, authorization rules, data behavior, visual behavior, and API contracts unchanged.

## Non-goals

- Change the database schema, Supabase policies, billing, authentication semantics, or production data.
- Redesign screens or introduce new product behavior.
- Move server handlers, connector runtime, SQL migrations, scripts, or their tests into the frontend architecture.
- Enable automatic database changes, deployment, merge, or auto-merge.

## Repository findings

The current frontend spans src plus root-level components, features, hooks, context, types, lib, and shared. There are 109 TypeScript/TSX files in the main frontend directories. The tsconfig and Vite alias currently resolve @ to the repository root, and there is no ESLint configuration or ESLint dependency. The root-level context provider owns authentication, organization state, and several data operations; the current src/app folder also contains domain rules alongside routing and app setup. A purely mechanical move would therefore preserve invalid layer dependencies, so the migration must relocate those rules and expose their intended contracts.

## Proposed structure

- app: entry point, global providers, router, route guards, and global styles. Keep the Vite entry file thin and compose lower-layer public APIs here.
- pages: route-specific screens grouped by route or audience. Each page slice exports its screen through index.ts and composes widgets and features.
- widgets: reusable, substantial UI blocks such as navigation, weather, dashboard readiness, and lead overview composition.
- features: user scenarios such as manage-leads, import-leads-csv, invite-employee, complete-onboarding, and paid-registration. Each slice owns its interaction UI and scenario model.
- entities: lead, employee, and company slices own domain types, model rules, and repository operations. A session/workspace slice may hold the shared authenticated-workspace state currently in OrganizationContext, with its contract exposed through its public API.
- shared: generic UI primitives, Supabase/client infrastructure, common helpers, and framework-independent contracts.

Each of the Lead, Employee, and Company entity slices contains ui, model, api, and index.ts. Feature slices use ui, model, api, and lib segments as needed. Internal imports inside a slice may use relative paths. Imports between slices must use the source slice public index.ts.

The current domain helpers in src/app (for example lead lifecycle, employee scope, permissions, imports, and production schema mapping) will move to the owning entity, feature, or shared slice. The app layer will retain app-wide routing and composition. Existing root-level frontend modules will be moved into the appropriate src layer and their consumers updated. Backend-only code stays outside src; any shared contracts it consumes must remain runtime-neutral and be imported type-only where possible.

The @ alias will resolve only to src. Vite and TypeScript configuration will agree on that target. Root server handlers will use explicit relative imports for shared types or contracts as needed. ESLint boundary checks will cover frontend source modules and enforce both layer direction and public slice entry points without applying frontend rules to server-only code.

## Constraints and migration approach

- Work from current origin/main on a dedicated feature branch; preserve unrelated uncommitted changes in the existing checkout.
- Use the current package lockfile and Node 24. Extend the existing lint command so it retains TypeScript checking and also runs ESLint.
- Preserve existing tests and CI jobs; no production credentials are needed for frontend checks.
- Keep this as a structural refactor. If a discovered dependency requires a behavior change or database contract change, stop and bring that scope back for review.
- Do not access or write to production Supabase during this work.

## Acceptance criteria

1. The frontend is organized under the six requested FSD layers, and old root-level frontend directories no longer contain duplicate implementation modules.
2. Lead, Employee, and Company domain contracts and data access live in their entity slices.
3. Business interactions live in feature slices; every feature and entity slice has a public index.ts.
4. Cross-layer imports follow the one-way order, cross-slice imports use public APIs, and ESLint reports violations in CI.
5. Routing and app composition consume public APIs rather than deep imports into pages, widgets, features, or entities.
6. Existing application behavior remains unchanged.
7. npm ci, npm test, npm run lint, and npm run build pass; the architectural rule is also shown to reject representative forbidden imports.
8. The result is delivered on a feature branch with a reviewable PR and no database or production changes.
