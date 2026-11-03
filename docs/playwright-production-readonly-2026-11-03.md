# Read-only production Playwright audit — 2026-11-03

## Scope and safety

- Target: currently deployed public Production app at `https://dashboard-svobonek-6462s-projects.vercel.app`.
- Browser: Playwright, fresh unauthenticated context; desktop at 1440×1000 and mobile at 390×844 for the responsive subset.
- 31 routes were opened. All `POST`, `PUT`, `PATCH`, and `DELETE` requests were blocked; no form was submitted, no customer row was read, and no production write was attempted.
- No test credentials/session were available in this run. Owner, employee, and platform-admin authenticated workflows are therefore **not verified by this run**.
- Prior DNS check found `stavbaflow.cz` unresolved. No custom-origin production UI result is claimed.

## Route results

| Route(s) | Result | Observation |
| --- | --- | --- |
| `/`, `/landing`, `/prezentace`, `/login` | 200 | Landing-led login screen; heading “Zakázky, tým a další krok. Bez zbytečného chaosu.”, with password-reset and workspace buttons. |
| `/owner/login`, `/employee/login`, `/admin/login` | 200 → `/login` | All role-specific login paths normalize to the shared login page. |
| `/unauthorized` | 200 | Expected 403 screen and return button. |
| `/widget-iframe` | 200 | Honest unavailable-form screen when opened without a configured tenant key. |
| `/widget-iframe.html` | **404** | Vercel “This page doesn’t exist”; this also produced the sole console/network error in the route pass. |
| `/inquiry`, `/poptavka`, `/form` | 200 | “Formulář není dostupný”; public intake is not active in this production configuration. |
| `/portal`, `/portal/demo` | 200 | “Tato funkce zatím není aktivní”. |
| `/register-paid` | 200 | Standalone registration is unavailable, but page still shows test-registration/Stripe copy and links to the Vercel production hostname. |
| `/billing/return`, `/dashboard`, `/leads`, `/projects`, `/employees`, `/widget`, `/integrations`, `/settings`, `/admin`, `/admin/companies`, `/admin/support`, `/employee`, `/employee/photos` | 200 → `/login` | Unauthenticated protected routes resolve to the shared login page. This checks the unauthenticated guard only, not authorization after login. |
| `/employee/jobs` | 200, stays on `/employee/jobs` | Shows the login-led content while retaining a protected route URL; behavior differs from other protected routes. |
| `/not-a-real-route` | 200 → `/login` | Unknown route is redirected to login instead of a not-found page. |

There were no uncaught page exceptions. Network/console errors: one 404 for `/widget-iframe.html`. No mutation request escaped the browser guard.

## Responsive and visual review

Checked `/`, `/demo`, `/demo/leads`, `/inquiry`, `/register-paid`, and `/widget-iframe.html` at desktop and mobile widths. No horizontal overflow was detected (scroll width equaled viewport width in each checked page).

- Login is readable and fits a 390 px viewport. Its blue `VA` square looks like a placeholder rather than StavbaFlow branding; the actual brand name appears separately below it.
- The public demo adapts to one column on mobile, and sample cards remain readable. The page becomes a long vertical list; consider compacting the summary cards or adding an optional condensed layout if mobile users need to scan many records.
- The registration page has large unused vertical space on mobile and the unavailable state is visually detached from the preceding sales copy. More seriously, it still calls itself a test registration and tells visitors to check the plan on Stripe although the registration flow is unavailable.
- The inquiry unavailable state is centered but surrounded by a mostly empty canvas. It is clear that the function is unavailable, but offers no next step to contact the company.
- `/widget-iframe.html` displays Vercel’s English error page, unlike the Czech product UI.

## Prioritized changes

### P0 — fix before presenting the current production site to customers

1. Remove or rewrite the test-only Stripe/registration copy on `/register-paid`; show one accurate state and a working next step while signup is unavailable.
2. Remove hard-coded `*.vercel.app` destinations from demo and registration links. Current demo and `/register-paid` link to the Vercel production hostname. Configure only an origin on a domain the owner controls; do not buy or assume ownership of a new domain.
3. Fix the widget embed contract: either serve `/widget-iframe.html` or update the generated embed URL to `/widget-iframe`. Verify the exact production URL used by customers.
4. Keep public marketing and entry points aligned with actual availability: inquiry is disabled, portal is inactive, and standalone registration is unavailable.

### P1 — improve route and workflow correctness

1. Add a deliberate not-found route so a typo does not silently look like a login redirect.
2. Make `/employee/jobs` use the same unauthenticated redirect behavior as the other protected routes, or show an explicit route state.
3. Repeat browser acceptance with synthetic owner, employee, and admin sessions on a dedicated staging Preview. Include role boundaries, lead reads/status changes, invitation, import/export, storage, connector settings, and logout. This production audit did not log in or exercise these workflows.
4. Retest public intake, billing return, registration, and email/invitation links after their production origins and service configuration are deliberately confirmed.

### P2 — visual polish

1. Replace the `VA` placeholder with the approved StavbaFlow logo/mark and use it consistently on login, demo, registration, and error states.
2. Tighten the mobile registration composition and pair the unavailable state with an obvious, functioning next action.
3. Give disabled inquiry/portal states useful navigation back to login/demo or a real contact path; preserve the explicit unavailable wording.
4. Keep demo summaries readable on narrow screens while reducing the long scroll when the sample list grows.

## Release status and blockers

- **Nothing was deployed or changed in Production by this audit.** Production browser checks were read-only.
- The current working tree contains a large set of uncommitted implementation changes across billing, invitations/email outbox, public URL handling, login/landing pages, and staging workflow/configuration. They have not been reviewed as a single release candidate and must not be described as production-ready merely because the public site responds.
- Repository `AGENTS.md` requires a dedicated branch and PR review, and forbids direct merge/push to `main`. The user has also declined possible GitHub Actions charges; no push or CI-triggering PR was created in this pass.
- Production Supabase remains read-only under repository policy. No migrations, database writes, environment-variable changes, or deployment actions were performed.
- Previous production metadata review found no `PUBLIC_APP_URL` or `PUBLIC_LANDING_URL`, and the prior custom-domain check did not resolve `stavbaflow.cz`. A usable, owner-controlled production origin and deployment configuration are release prerequisites for eliminating the observed Vercel links.

## Reproduction

1. Open the Production base URL above in a clean browser context.
2. Visit the route groups in the route table and record final URL, HTTP status, heading, console/network errors, and page exceptions.
3. For responsive checks, set viewport to 1440×1000 and 390×844 on `/`, `/demo`, `/demo/leads`, `/inquiry`, `/register-paid`, and `/widget-iframe.html`.
4. Keep the request guard blocking `POST`, `PUT`, `PATCH`, and `DELETE`; do not sign in to Production or submit forms.

Screenshots and machine-readable route results from this run were kept outside the repository under the local temporary directory `stavbaflow-production-audit-2026-11-03`.

## Authenticated staging follow-up (2026-11-03)

- The open Preview tab was first inspected and refused: its published bundle targets production project `oncmtmrhmjlerbwkrecv`. No login was attempted there.
- Candidate staging Preview bundles were checked before using credentials. The stable URL `https://dashboard-git-codex-staging-e2e-79cdb9-svobonek-6462s-projects.vercel.app` targets `xwzweltjvreqhjpbjrxa` (StavbaCore Staging).
- GitHub Actions contained the required synthetic staging account secrets by name; their values were not read. Since the private repository had no online runner, the existing official GitHub Actions runner image was started as an ephemeral Docker container with no host mounts or Docker socket. The container was removed after one job and the repository now has no runner registered.
- Staging workflow run [41639187873](https://github.com/svobonek-lab/dashboard/actions/runs/41639187873) used `runner_mode=local-ephemeral` on `codex/staging-e2e-local-runner`. Its staging isolation preflight, dependency setup, Playwright browser install, and exact synthetic CSV rollback passed. No GitHub-hosted runner job ran; no Production project or deployment was touched.
- Playwright outcome: **7 passed, 4 failed**. Passing cases: employee assigned-lead scope; owner A/employee A PostgREST tenant isolation; owner A/employee A Storage denial against company B; employee A denial against the company B lead; public-intake idempotency; oversized-field rejection and honeypot drop; user-readable Supabase read failure.
- The staging diagnostic reports company A is visible and active, but its subscription status is `canceled`. Owner A sign-in reaches the subscription gate, which hides navigation and lead cards. This explains the four failures: owner menu expectation; owner critical flow could not find its synthetic lead; logout test could not find the logout control; and Sentry test stopped before checking SDK/event because it expected owner navigation first. Sentry delivery is therefore **still unverified**. These failures do not establish a general application crash; they establish that the current Owner A fixture is not entitled to the workspace.
- The workflow's CSV fixture rollback passed. The public-intake replay test deliberately leaves one uniquely marked synthetic lead in staging, as documented in `docs/staging-e2e.md`; Production was untouched.

### Staging retest needed

Use an active synthetic owner fixture, then rerun owner navigation, lead/status/CSV/logout, and Sentry acceptance. The previously documented active company B is a candidate, but this run did not authenticate company B. Do not directly edit `subscription_status`; restore access through the approved Stripe TEST flow or use another already-active synthetic fixture. Keep the staging and production origins separate during any follow-up.
