# Gemini quota handling and legal-consent verification (2026-10-24)

The existing owner registration and owner invite activation use two required TOS/DPA controls, disable submission until both are accepted, and pass acceptedAt to their API/RPC. The staging legal-consent proposal stores server clock_timestamp() as authoritative audit time in app_company_legal_acceptances. Employee invitations do not purport to sign a DPA for their organization.

Gemini generation uses `gemini-3.8-flash` for incoming-lead classification. `withGeminiBackoff` makes four attempts total, delays 2000/4000/8000 ms only after HTTP 429, and returns a safe Czech error on exhaustion or any other error. The unused website-analysis endpoint and client wrapper have since been retired; the shared Gemini SDK stays because incoming-lead classification still uses it.

Model reference: https://ai.google.dev/gemini-api/docs/models/gemini-3.8-flash
No specific free quota is promised; provider quotas and pricing are account-dependent.

Verification: 282 full-suite tests passed before adding the SDK fixed-model test; all four focused Gemini tests then passed. TypeScript reports the pre-existing missing connector adapter dependencies (mssql, mysql2, pg). No database migration, live AI request, production write or deployment was performed. The user's reported success of two Stripe SQL runs is not independently verified: local browser control is disabled in Work settings.
Follow-up verification: AI overload now reaches the incoming API as HTTP 503 with the exact safe Czech message; no lead is persisted on classification failure. 284 full-suite tests pass. Installing the committed connector dependencies with npm ci --prefix connector resolves the local TypeScript baseline: tsc --noEmit now passes. Vite build passes. Earlier PR revision also passed all GitHub checks and both Vercel deployments; checks must run again for this follow-up.

2026-10-27 compatibility review: Google’s Gemini 3.8 Flash migration guide says to remove deprecated sampling parameters including `temperature`. The request now keeps JSON response mode but omits `temperature`; a regression test inspects the SDK request body and fails if `generationConfig.temperature` is sent. Official migration reference: https://ai.google.dev/gemini-api/docs/latest-model. Local verification on this branch: focused Gemini tests 5/5, full root suite 411/411, `npm run lint` and `npm run build` pass. This was verified with a mocked SDK transport; no live Gemini request was made. GitHub CI and Vercel Preview need a fresh run for the pushed commit.
