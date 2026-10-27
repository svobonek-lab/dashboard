# Sales readiness: prompts 1–10

Source: user-provided `pasted-text-1.txt`, sections 4–5. Deliver each prompt in its given order while building on the current `dashboard-fsd` repository.

1. Separate owner operations from the sales cockpit and demo. Remove sales from owner navigation, owner route allowlists and owner routing; render the public demo outside `OwnerLayout`; if useful, place sales cockpit behind platform-admin authorization.
2. Align public sales copy with available pilot routes, label unavailable features as preparing or remove the claims, label the ROI calculator illustrative, and record every claim changed in `docs/landing-claims.md`.
3. Protect public intake with per-company, per-IP-hash throttling (default five per ten minutes), bounded fields, a honeypot and preserved idempotency. Add SQL contract tests. Use the verified current `app_*` contract where it differs from legacy prompt names. Prepare only; never apply to a live database.
4. Document requested Vite environment variables; show missing legal identity warning only in development; verify legal links; add an operator-owned go-live checklist covering the release gates named in the source.
5. Make platform-admin company directory and header usable at 360–430 px and 1280 px; keep desktop table, use mobile cards, and keep the new-company dialog reachable and scrollable. Verify 375 px and 1280 px in a browser.
6. Map each staging SQL contract to migration coverage, propose a non-destructive consolidation order, and add CI verification of the numbered migration chain against clean PostgreSQL 17. Do not delete staging SQL or apply migrations to an external database.
7. Confirm whether `/api/analyze-website` is unused. If unused, archive it outside Vercel's API discovery, remove its development route, retain shared Gemini code still used by mail ingestion, and remove only dependencies proven unused across browser, API and connector.
8. Add five independent Playwright smoke scenarios for owner menu, idempotent public intake, employee assignment scope, cross-company REST isolation, and logout cache clearing. Run only via manual dispatch or PR label `e2e`; read credentials from GitHub Secrets and never embed them.
9. Verify/remove genuinely unused dependencies, clear all tenant caches on logout, and add an authenticated-RLS-only firm data CSV export for leads, employees and available history, excluding internal IDs, credentials, tokens and hashes.
10. Verify Sentry is DSN-gated and carries only internal company ID and role; document incident response for Supabase, email outbox and Stripe; persist outbox scheduler result only if no existing durable run record provides that evidence.

## Constraints

- No production or staging database writes, migrations, auth administration, or customer-row access during implementation.
- Use synthetic local fixtures. Never put real credentials in code, tests, logs, or docs.
- Keep app code inside the repository's FSD boundaries.
- Preserve tenant isolation, RLS, public-form idempotency, and explicit feature release gates.
- Run repository and connector test/lint/build commands after applicable changes; report external staging-only scenarios as blocked when credentials or fixtures are unavailable.
