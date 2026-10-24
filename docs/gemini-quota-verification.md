# Gemini quota handling and legal-consent verification (2026-10-24)

The existing owner registration and owner invite activation use two required TOS/DPA controls, disable submission until both are accepted, and pass acceptedAt to their API/RPC. The staging legal-consent proposal stores server clock_timestamp() as authoritative audit time in app_company_legal_acceptances. Employee invitations do not purport to sign a DPA for their organization.

Gemini generation now uses gemini-3.8-flash for both incoming-lead classification and optional website refinement. withGeminiBackoff is generic over the response type and prompt. It makes four attempts total, delays 2000/4000/8000 ms only after HTTP 429, and returns a safe Czech error on exhaustion or any other error. Website refinement retains its existing non-blocking scraped-data result when optional AI fails.

Model reference: https://ai.google.dev/gemini-api/docs/models/gemini-3.8-flash
No specific free quota is promised; provider quotas and pricing are account-dependent.

Verification: 282 full-suite tests passed before adding the SDK fixed-model test; all four focused Gemini tests then passed. TypeScript reports the pre-existing missing connector adapter dependencies (mssql, mysql2, pg). No database migration, live AI request, production write or deployment was performed. The user's reported success of two Stripe SQL runs is not independently verified: local browser control is disabled in Work settings.
