# StavbaFlow product interface design refresh

**Kind:** software product interface for construction-company owners, employees, and platform operators.

## Intent

Make the existing StavbaFlow application feel like a dependable work tool for a small building firm. The board, dashboard, employee jobs, sign-in, and public read-only demo should share one visual language and remain clear on a phone. Keep every existing workflow and honest product limitation intact.

## Evidence and goals

- The live synthetic `/demo/leads` board at 320 px shows only part of the next stage and relies on large rounded panels. A visitor cannot tell from the first viewport how to reach the later stages.
- The password recovery page uses a large blue monogram, oversized rounded card, and exposes a failed-request message without an actionable distinction between a send limit and a real error.
- Application views mix blue, violet, green, dark admin chrome, multiple corner radii, and inconsistent density.
- Improve hierarchy, touch targets, board navigation, legibility, and consistency without inventing customer proof or implying unavailable capabilities work.

## Visual system

The product is a construction workflow tool, so use practical work surfaces and a single high-visibility action color instead of decorative effects.

| Role | Token | Value |
| --- | --- | --- |
| Canvas | `--workspace-canvas` | `#F2F3F0` |
| Paper | `--surface` | `#FFFFFF` |
| Ink | `--text` | `#202923` |
| Secondary text | `--muted` | `#5F6B63` |
| Divider | `--border` | `#D9DED8` |
| Main action | `--workspace-primary` | `#2563EB` |
| Success state | `--workspace-success` | `#256344` |

- Use the existing system sans stack for dependable Czech glyphs and no external font request; enable tabular numerals for prices and counts.
- Use one compact shape family: 8 px controls, 12 px standard panels, 16 px dialogs. Avoid pill buttons, 24 px cards, repeated shadows, and nested containers.
- Set a consistent 4 px spacing base. Use thin dividers and surface contrast for structure; reserve orange for the main action and active navigation.
- Keep page titles left aligned, labels in sentence case, readable text at 14 px or above, and primary touch actions at least 44 px high.
- Keep semantic status colors for success, warning, and errors. Do not use color alone to convey status.
- Motion answers a user action only. Preserve visible keyboard focus and `prefers-reduced-motion`.

## Layout decisions

- **Owner:** fixed navigation rail on desktop, compact top navigation on mobile; content begins with one title, a short factual summary, and the next useful action. Recent work is a clear list or board, not a grid of identical cards.
- **Employee:** today's assigned jobs lead; prioritize address, scheduled time, status, and the next permitted action. Use full-width controls suitable for on-site use.
- **Platform admin:** use the same light canvas, type, controls, and spacing as the owner workspace, with a distinct control-plane label and safety notice.
- **Lead board:** keep six stages and existing drag/status rules. On mobile expose every stage through a labelled, operable stage navigator and keep the active column fully readable; on wider screens preserve the multi-column overview.
- **Public demo:** retain synthetic, read-only disclosure and provide a clear route back to the summary and to sign in.
- **Authentication:** center a restrained form on quiet neutral ground; use the same controls and error language as the rest of the product. Recovery and password setup remain on the application's `/login` route.
- **Landing:** maintain the truthful pilot scope and unavailable-feature list. Use the real StavbaFlow screens as the visual proof; no invented customers, quotes, or metrics.

## Interaction and accessibility

- Provide keyboard-operable board stage navigation with an announced selected stage and card count.
- Keep card actions, form validation, empty states, and disabled states explicit; avoid hover-only discovery.
- Check contrast, focus order, reduced motion, and layout at 1440, 1024, 768, 390, and the 320 px width observed in the open browser.
- Do not submit real forms, change database rows, change environment variables, or deploy to production during design verification.

## Scope

Apply the system to the shared application shell, shared controls, authentication and recovery, public demo, owner and employee main screens, admin shell, and the highest-traffic lead list/board. Audit the remaining route set for visual and functional inconsistencies and document anything that needs a separate feature or owner decision. Preserve the FSD boundaries and existing product behavior.

## Verification

- Run repository-required unit tests, type/lint, build, and connector tests only if connector code changes.
- Use Playwright against local/synthetic surfaces at desktop and mobile sizes. Verify navigation, demo read-only affordances, forms without submitting, no console exceptions, no horizontal page overflow, keyboard focus, and reduced motion.
- Review screenshots of the login/recovery, owner dashboard, board, employee jobs, and platform-admin shell. Authenticated routes without a valid synthetic session remain explicitly unverified.
- Keep database and production systems read-only. Open one reviewable PR from a dedicated branch; do not merge or deploy automatically.
