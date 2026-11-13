# Two Vercel surfaces

The repository now supports two explicit Vercel deployment surfaces without duplicating the application:

| Vercel project | `VITE_DEPLOYMENT_SURFACE` | Behavior |
|---|---|---|
| public sales project | `landing` | `/` and `/landing` show the public StavbaFlow sales page. `/login` redirects to `PUBLIC_APP_URL/login`. |
| customer workspace project | `app` | `/` opens the real login screen for owner, employee, and platform admin accounts. Authenticated users continue to their role dashboard. |

Set these non-secret environment variables per Vercel project and redeploy from the same commit:

- landing project: `VITE_DEPLOYMENT_SURFACE=landing`, `PUBLIC_APP_URL=https://<app-custom-domain>`, `PUBLIC_LANDING_URL=https://<landing-custom-domain>`
- app project: `VITE_DEPLOYMENT_SURFACE=app`, `PUBLIC_APP_URL=https://<app-custom-domain>`, `PUBLIC_LANDING_URL=https://<landing-custom-domain>`

## Current Vercel origins (verified 2026-11-13)

The owner has no custom domains yet and authorized using the existing Vercel HTTPS addresses. The Vercel CLI confirmed both aliases point to Ready production deployments. This is an origin inventory, not approval to change production environment variables:

| Surface | Project | Current stable alias |
|---|---|---|
| application | `dashboard` | `https://dashboard-tau-snowy-61.vercel.app` |
| sales | `jobflow-pro` | `https://jobflow-pro-brown.vercel.app` |

For a **manually requested Preview build** of this branch, configure both projects with the same exact non-secret values below. Do not copy environment files or credentials into Git. `VITE_APP_URL` is a historical name in old plans; the current browser routing reads `PUBLIC_APP_URL` instead.

| Project | `VITE_DEPLOYMENT_SURFACE` | `PUBLIC_APP_URL` | `PUBLIC_LANDING_URL` |
|---|---|---|---|
| `dashboard` | `app` | `https://dashboard-tau-snowy-61.vercel.app` | `https://jobflow-pro-brown.vercel.app` |
| `jobflow-pro` | `landing` | `https://dashboard-tau-snowy-61.vercel.app` | `https://jobflow-pro-brown.vercel.app` |

The branch has automatic Git deployment disabled in `vercel.json` so a push cannot initiate a Preview deployment. A reviewed operator can deploy Preview manually and record the immutable deployment URL and source SHA. Preview must show the sales CTA going to the application `/demo`, sales login going to the application `/login`, a visible return from demo to the sales alias, and no company signup form on the sales origin. A bad or missing app origin must leave both sales links closed. Before changing Production variables, review the Preview evidence and verify the exact Auth redirect allowlist for the application `/login`.

The requested display names `StavbaFlow` and `StavbaFlow-landing` are not assumed to be URLs. Renaming the two live Vercel projects can change their generated aliases and break existing links. Resolve the names and resulting exact HTTPS aliases in a separate reviewed step, then update this table before changing Production variables.

The default remains `unified` for existing previews and local development. The split changes routing only; authentication and tenant isolation remain controlled by Supabase and the existing guards. Do not use demo credentials or local mock authentication in the app deployment.

Set these origins explicitly to approved HTTPS addresses. A Vercel alias is supported for temporary hosting. Configure the matching exact Auth redirect URL and keep the chosen alias stable while invitations are outstanding.
