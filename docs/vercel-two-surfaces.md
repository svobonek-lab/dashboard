# Two Vercel surfaces

The repository now supports two explicit Vercel deployment surfaces without duplicating the application:

| Vercel project | `VITE_DEPLOYMENT_SURFACE` | Behavior |
|---|---|---|
| public sales project | `landing` | `/` and `/landing` show the public StavbaCore sales page. `/login` redirects to `VITE_APP_URL/login`. |
| customer workspace project | `app` | `/` opens the real login screen for owner, employee, and platform admin accounts. Authenticated users continue to their role dashboard. |

Set these non-secret environment variables per Vercel project and redeploy from the same commit:

- landing project: `VITE_DEPLOYMENT_SURFACE=landing`, `VITE_APP_URL=https://<app-domain>`
- app project: `VITE_DEPLOYMENT_SURFACE=app`

The default remains `unified` for existing previews and local development. The split changes routing only; authentication and tenant isolation remain controlled by Supabase and the existing guards. Do not use demo credentials or local mock authentication in the app deployment.

Current project mapping observed through the Vercel CLI:

- `dashboard` → `https://dashboard-tau-snowy-61.vercel.app`
- `jobflow-pro` → `https://jobflow-pro-brown.vercel.app`

Confirm the final custom domains before setting `VITE_APP_URL`; this PR intentionally does not change Vercel project environment variables or trigger a production deployment.
