# StavbaFlow platform administration and demo routing design

**Date:** 2026-10-05

**Status:** Approved design direction; implementation and staging application remain separately reviewable

**Scope:** Platform administrator identity, platform operations boundary, truthful administration UI, audited support access, and cross-deployment demo routing

## 1. Goal and context

StavbaFlow needs one platform operator who can manage customer-company onboarding and platform health without becoming an unrestricted member of every customer's workspace. The initial operator is the existing Supabase Auth user whose email is `svobonek@gmail.com`, but the runtime authorization decision must use that user's immutable Auth UUID rather than an email comparison.

The public sales deployment must also send every “demo” action to the real StavbaFlow demo workspace. A relative `/demo` route is insufficient when the landing page and the application are deployed as separate Vercel projects.

This design replaces client-side administrator elevation with a server-verified platform role, keeps tenant data under existing company-scoped RLS, removes unsupported statistics from the administration UI, and centralizes demo URL resolution.

## 2. Approved product and security rules

1. Platform administration and company membership are separate identities. `app_members` remains the source for `owner` and `employee` access inside a company. `app_platform_admins` becomes the source for platform operations.
2. A platform administrator does not automatically receive `SELECT`, `INSERT`, `UPDATE`, or `DELETE` access to customer leads, projects, tasks, costs, documents, messages, imports, or integration payloads.
3. Every platform API request must validate the caller's Supabase bearer session and then verify an active `app_platform_admins` row on the server.
4. The browser may learn only whether the current user has an active platform role. It may not enumerate platform administrators or receive service-role credentials.
5. Service-role credentials remain server-only and may be used only after platform authorization has succeeded. They must never be embedded in Vite variables or browser bundles.
6. Support access to a customer workspace is explicit, time-limited, read-only in the first release, and audited. It never mutates the user's durable company membership or identity.
7. The email address is used only by a staging provisioning operator to locate the correct Auth UUID. It is never a runtime authorization rule.
8. SQL remains a reviewed staging artifact. CI, Vercel builds, and application startup never apply it automatically.
9. Production Supabase remains read-only throughout this work. Assigning the initial administrator is a later, explicit staging operation followed by a separately reviewed production release.
10. Demo links must resolve to an approved HTTPS application URL. Local HTTP URLs are accepted only during local development.

## 3. Non-goals

- This change does not grant the platform operator unrestricted access to customer business records.
- It does not implement subscription billing, domain sales, synthetic MRR, or fabricated activity logs.
- It does not migrate legacy `users.role = 'super_admin'` data into production automatically.
- It does not apply staging SQL, create Auth users, rotate keys, merge pull requests, or deploy production.
- It does not introduce write-capable impersonation.
- It does not redesign owner or employee workflows beyond the identity-resolution changes required for correct routing.

## 4. Architecture and data model

### 4.1 Platform administrator registry

The staging contract adds `public.app_platform_admins`:

| Column | Type | Rule |
| --- | --- | --- |
| `user_id` | `uuid` | Primary key, references `auth.users(id)` with restricted deletion behavior |
| `active` | `boolean` | Required, defaults to `true` |
| `created_at` | `timestamptz` | Required, server default `now()` |
| `created_by` | `uuid` | Nullable Auth UUID for a later operator-created assignment |
| `revoked_at` | `timestamptz` | Required when access is revoked |
| `notes` | `text` | Optional operational note; must not contain secrets or copied customer data |

The table stores no duplicated email address. RLS is enabled. Browser roles receive no direct table privileges. Only the service role and narrowly defined security-definer helpers may read it.

### 4.2 Self-role lookup

An authenticated function `public.app_get_my_platform_role()` returns at most:

```text
role: "platform_admin" | null
active: boolean
```

The function uses `auth.uid()`, has a fixed empty `search_path`, refers to objects with schema-qualified names, and receives `EXECUTE` only for `authenticated`. It cannot accept a target user ID, list administrators, disclose notes, or reveal other identities.

If Supabase function behavior cannot meet these constraints during staging verification, the equivalent lookup is implemented as a server endpoint using the same bearer-session and registry checks. There will be only one authoritative lookup path in the finished implementation.

### 4.3 Tenant RLS remains unchanged in principle

Tenant tables continue to authorize through `app_members`, company IDs, assignments, and the existing app-specific helper functions. No policy receives an `OR app_is_platform_admin()` escape hatch. Legacy migrations that granted broad `super_admin` tenant access are historical artifacts and are not reused as the new contract.

## 5. Authentication and identity resolution

The application keeps one login screen. After Supabase Auth establishes a session, role resolution runs in this order:

1. Verify whether the session user has an active platform role through the narrow self-role lookup.
2. If active, build a client identity with `role = 'platform_admin'` and route to `/admin`.
3. Otherwise resolve the user's active `app_members` membership and route an owner or employee to the corresponding workspace.
4. If neither identity exists, show an honest access-not-configured state and sign-out option. Do not manufacture a local role.

The platform role check happens before company membership is required, so a platform operator does not need a dummy company. Session refresh repeats authorization. Deactivation takes effect on the next protected request and on the next role refresh.

The client-side route guard improves navigation and user experience but is not an authorization boundary. Every platform API enforces the same server-side check independently.

## 6. Server API boundary

Platform operations use a grouped dynamic handler such as `api/platform/[route].ts`, with a fixed allowlist of route names. This avoids consuming a separate Vercel function for every operation and prevents arbitrary dispatch.

Shared server modules under `api/_platform/` perform, in order:

1. Parse the `Authorization: Bearer` header.
2. Validate the session token with the staging/project Supabase Auth endpoint.
3. Extract the verified Auth UUID.
4. Query `app_platform_admins` with the server-only client and require `active = true`.
5. Validate the requested operation against an explicit allowlist and schema.
6. Execute the minimum required query.
7. Record the audit outcome without credentials or customer-row payloads.

Initial platform operations are read-oriented:

- list companies using minimal operational fields;
- show onboarding readiness;
- show connector and intake configuration health;
- create and revoke read-only support sessions;
- show platform audit events relevant to administrator actions.

The company directory response is limited to identifiers and operational metadata such as company name, creation time, onboarding state, active member count, integration status, and last health-check time. It excludes leads, contacts, addresses, quote values, project contents, files, and credentials.

Unknown routes return `404`; unsupported methods return `405`; invalid sessions return `401`; authenticated non-admins and inactive admins return `403`. Failures never fall back to demo data.

## 7. Administration UI truthfulness

The first usable administrator dashboard contains only data backed by the verified platform APIs:

- customer-company directory;
- onboarding and pilot readiness;
- public intake, invitation, email, and connector health;
- active read-only support sessions;
- audited administrator actions.

Existing Billing, Domains, Logs, and estimated MRR surfaces are removed from navigation or replaced with an explicit “not available in this release” state. They must not show fabricated plans, invoices, domains, activity, or revenue. The brand name shown in platform layouts is `StavbaFlow`.

The company switcher must not reveal administrator actions because an email string matches. It renders platform controls only from the resolved platform identity.

## 8. Read-only support sessions

A support session is a separate server-side record, not a change to `app_members`:

| Field | Purpose |
| --- | --- |
| `id` | Random session identifier |
| `platform_admin_id` | Verified administrator Auth UUID |
| `company_id` | Explicit customer scope |
| `reason` | Required support reason |
| `created_at` | Audit time |
| `expires_at` | Maximum 30 minutes after creation |
| `revoked_at` | Early termination |

The first release exposes only a minimal operational overview needed for onboarding support. It does not return individual customer records. Every creation, use, denial, expiration, and revocation writes an audit event. The UI displays a persistent support-mode banner and countdown. Expired or revoked sessions fail closed and require a fresh explicit session.

Any future access to customer-row content requires a new design review with customer consent, field-level minimization, and dedicated RLS/API tests.

## 9. Staging provisioning flow

A repository script provisions the initial administrator in isolated staging with these safeguards:

1. Require an explicitly selected staging project reference and reject the known production reference.
2. Accept the operator email as an input; default to a dry run.
3. Resolve exactly one existing Supabase Auth user by email on the server side.
4. Print only masked identity and the intended UUID-level change.
5. Require `--apply` for the write.
6. Upsert the Auth UUID into `app_platform_admins`; never use email in an RLS policy, JWT role, UI condition, or API authorization check.
7. Record the provisioning event and verify the self-role lookup after application.
8. Never create or reset an Auth password as a side effect.

The implementation will provide a reviewable command for `svobonek@gmail.com`; execution against staging remains a separate operator step. Production assignment requires its own change review and explicit approval after staging evidence is recorded.

## 10. Demo routing

A shared `resolveDemoUrl()` helper is the only source for public demo navigation.

Resolution order:

1. `VITE_DEMO_URL`, when present and valid;
2. normalized `VITE_APP_URL` plus `/demo`, when present and valid;
3. relative `/demo` only in local development or a deliberately unified deployment.

Validation rules:

- public deployments require `https:`;
- local development may use `http://localhost`, `http://127.0.0.1`, or the active local hostname;
- reject `javascript:`, `data:`, credentials in URLs, protocol-relative URLs, malformed values, and non-HTTP schemes;
- normalize duplicate slashes and preserve no caller-controlled query or fragment;
- if a configured public URL is invalid, show a disabled demo action with a clear configuration error instead of navigating to an unsafe or incorrect destination.

All three landing-page demo actions and any administrator “open demo” action use the helper. The real demo workspace footer changes from `STAVBACORE` to `StavbaFlow`. Environment examples document the two-deployment setup without real secrets or project credentials.

## 11. Audit events and data minimization

Platform audit events contain:

- actor Auth UUID;
- action type;
- target company ID when relevant;
- request/correlation ID;
- timestamp;
- success or denial outcome;
- a bounded reason code.

They do not contain bearer tokens, service-role keys, passwords, raw connector credentials, lead contents, uploaded database rows, email bodies, or complete request/response payloads.

Required event types include platform login-role resolution, denied platform access, company-directory view, support-session create/use/revoke/expire, and administrator activation/deactivation. Retention and export policy remain an operational release requirement and are documented before production activation.

## 12. Failure modes

- Missing registry/RPC contract: platform role resolution fails closed; tenant login may continue when valid membership exists.
- Missing service-role server secret: platform endpoints return a configuration error and never simulate success.
- Invalid or expired session: `401`, followed by normal login recovery.
- Authenticated non-admin or inactive admin: `403`, with an audit denial where the server can identify the actor.
- Unavailable platform audit write: sensitive platform operation fails rather than executing without evidence.
- Invalid demo URL: the action is disabled and the landing page remains usable.
- Platform API timeout: show unavailable/retry state; do not use cached synthetic values.
- Support session expires mid-view: clear the support context and return to the company directory.

## 13. Testing and acceptance criteria

### Contract and authorization tests

- owner and employee sessions cannot call platform APIs;
- an unknown, inactive, revoked, or unauthenticated identity is denied;
- an active platform administrator can obtain only their own platform-role result;
- platform status does not provide raw tenant-table access;
- company directory returns only the allowed operational fields;
- every platform endpoint independently checks the server-side registry;
- no runtime authorization path compares the user's email;
- service-role material is absent from client output and logs.

### Support-session tests

- session creation requires a reason and active administrator;
- scope is limited to one company;
- session expires within 30 minutes and cannot be refreshed silently;
- revocation is immediate;
- support mode is read-only;
- create, use, denial, expiry, and revoke events are audited.

### Login and routing tests

- a platform administrator without company membership reaches `/admin` after unified login;
- owner and employee routing remains unchanged;
- inactive administrator with a valid company membership resolves only as that tenant member;
- no identity produces a clear access-not-configured state.

### Demo tests

- a valid cross-deployment `VITE_DEMO_URL` is used by every demo action;
- `VITE_APP_URL` correctly produces `/demo` when the explicit demo URL is absent;
- unsafe, malformed, credential-bearing, and non-HTTPS public URLs are rejected;
- local development fallback works;
- the demo footer and platform layout use `StavbaFlow`.

### Full verification

The implementation must pass `npm ci`, the complete `npm test` suite, `npm run lint`, `npm run build`, secret scanning of the staged diff, staging metadata review, two-company tenant-isolation tests, and browser verification of login, administrator denial/allow behavior, landing navigation, and the actual demo workspace. A green build alone is not completion evidence.

## 14. Rollout and rollback

1. Merge the implementation only after the SQL artifact, code, and tests are reviewed.
2. Apply the contract to isolated staging manually and capture metadata-only evidence for table RLS, function ownership/search path, and grants.
3. Provision the staging administrator with dry run followed by explicit `--apply`.
4. Run authorization, two-company isolation, and browser acceptance tests in staging.
5. Configure the landing deployment with the verified dashboard demo URL and test the resulting Vercel Preview.
6. Keep the feature disabled in production until a separate production release is approved.

Rollback consists of disabling the platform administrator row, revoking support sessions, removing the platform UI feature flag/configuration, and returning demo actions to a known safe configured URL. Tenant memberships and tenant RLS are unaffected because platform access never alters them.

## 15. Expected implementation surfaces

The implementation is expected to touch:

- `supabase/staging/` for the review-only registry, helper, support-session, and audit contract;
- `api/platform/[route].ts` and `api/_platform/` for authenticated allowlisted operations;
- a staging provisioning script and its operator documentation;
- `context/OrganizationContext.tsx` or a smaller extracted identity resolver;
- `src/app/ProtectedRoute.tsx`, role types, and admin routing;
- `components/CompanySwitcher.tsx` to remove email-based elevation;
- `src/pages/admin/` and `src/layouts/SuperAdminLayout.tsx` for truthful platform surfaces and branding;
- `features/LandingPage.tsx`, `features/publicDemo/PublicDemoWorkspace.tsx`, and a shared public URL helper;
- `.env.example`, runbooks, and focused tests.

The exact file split may change during implementation planning, but the authorization boundaries and acceptance criteria in this design may not be weakened.

## 16. Release boundaries and remaining inputs

Before StavbaFlow can be marketed as fully ready for paying companies, the following remain separate release gates:

- review and merge of the existing connector PR stack;
- rotation of the staging service-role key and rerun of pilot evidence;
- verified staging application of this platform-admin contract;
- legal company name and IČO for the public sales identity;
- production metadata review and explicit production release approval;
- verified real contact delivery and any optional transactional email provider;
- connector-specific staging and Preview evidence before claiming live database connectivity.

None of these gates may be represented as complete because this design document or its code implementation exists.
