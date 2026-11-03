# Two Vercel surfaces

The repository now supports two explicit Vercel deployment surfaces without duplicating the application:

| Vercel project | `VITE_DEPLOYMENT_SURFACE` | Behavior |
|---|---|---|
| public sales project | `landing` | `/` and `/landing` show the public StavbaFlow sales page. `/login` redirects to `PUBLIC_APP_URL/login`. |
| customer workspace project | `app` | `/` opens the real login screen for owner, employee, and platform admin accounts. Authenticated users continue to their role dashboard. |

Set these non-secret environment variables per Vercel project and redeploy from the same commit:

- landing project: `VITE_DEPLOYMENT_SURFACE=landing`, `PUBLIC_APP_URL=https://<app-custom-domain>`, `PUBLIC_LANDING_URL=https://<landing-custom-domain>`
- app project: `VITE_DEPLOYMENT_SURFACE=app`, `PUBLIC_APP_URL=https://<app-custom-domain>`, `PUBLIC_LANDING_URL=https://<landing-custom-domain>`

The default remains `unified` for existing previews and local development. The split changes routing only; authentication and tenant isolation remain controlled by Supabase and the existing guards. Do not use demo credentials or local mock authentication in the app deployment.

Set these origins only after the custom domains are approved. Vercel deployment URLs remain internal Preview access addresses; the application rejects them as user-facing destinations. This task does not change Vercel project environment variables or trigger a production deployment.
