# StavbaFlow product redesign — 2026-11-09

Construction software for owners of small companies and their field teams.

## Direction
A navy sales hero with a large, clearly synthetic product view replaces the narrow list preview. The page explains enquiries, responsibility and progress without inventing customer testimonials. Existing pricing, contact handoff, calculator and legal notices remain available.

The owner workspace has a dark navigation rail, a main job list and a separate next-action column. Next actions and pipeline counts come from the existing lead data. Search, attention filtering and opening a lead retain their callbacks. No database contracts or feature flags change.

References consulted: https://buildertrend.com/project-management/ and https://www.getjobber.com/features/dashboard/ — workflow presentation, not copied assets or branding.

## Verification
- 610 unit tests passed.
- TypeScript/ESLint and production build passed.
- Playwright verifies 320/390/768/1024/1440 widths, public demo, local mocked owner sign-in, mobile drawer and lead filtering.
- Screenshots reviewed for public landing and owner overview. Authenticated coverage uses synthetic local responses, not production credentials or data.
- This is a visual/product UI change, not evidence of production database write readiness.
