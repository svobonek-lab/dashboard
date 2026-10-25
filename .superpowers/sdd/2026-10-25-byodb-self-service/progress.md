# SDD ledger — plan: docs/superpowers/plans/2026-10-25-byodb-self-service.md

Pre-flight: Task 1 produces the shared company/lead mapping and database-mode contracts consumed by Tasks 3, 4, 6, and 7; all use the existing version-1 connector envelope with additive canonical targets.
Pre-flight: Task 2 produces the HMAC client/server contract consumed by Task 5; existing Ed25519 is still used by current deployed code, but no released connector image exists and package release remains gated.
Pre-flight: Task 3 produces tenant-scoped operations consumed by Tasks 4, 5, and 6; poll/ack must derive connector/company scope from authenticated identity.
Pre-flight: Task 4 source mutations feed Task 5 signed ingest/ack; inspected schema currently lacks primary-key/identity metadata required to safely gate stable-key creates.
Pre-flight: Task 6 consumes the operation API from Task 3 and tenant read projection from Task 5; repositoryFactory currently always chooses SupabaseRepository.
Pre-flight: Task 7 consumes the contracts from Tasks 1–6; package generation must retain the existing immutable-image digest gate.
Pre-flight: Task 8 acceptance covers all earlier layers and the local synthetic tests only; no real Supabase/customer DB write is permitted.

Ruling: connector schema inspection must gain primary-key and generated-key metadata before enabling source creates — stable external-ID replay is impossible to guarantee on identity-only customer tables — the cost if wrong is duplicate company/lead rows.

Task 1: in_progress
Task 1: complete (commits 5e33463..94cb139, tests: npm test → ℹ duration_ms 11417.3362)

Task 2: in_progress
Task 2: Ruling: generate `CONNECTOR_SECRET` during the owner-authorized server enrollment and return it once — this allows the server to retain only an AES-GCM envelope and avoids browser-side secret generation/storage; the cost if wrong is that a lost one-time response requires creating a replacement enrollment and secret.
Task 2: complete (commits 94cb139..fdae309, tests: npm test --prefix connector → ℹ duration_ms 4233.3942)

Task 3: Ruling: an employee may only change lead status when the mapped source row's assigned email matches the authenticated employee email — role-only checks would let an employee alter an unrelated lead; the connector must enforce row assignment inside the source transaction.
Task 3: complete (commits fdae309..91a1e49, tests: npx tsx --test tests/connector-api.test.ts tests/connector-staging-contract.test.ts tests/connector-owner-api.test.ts tests/connector-contract.test.ts → ℹ duration_ms 1798.85)

Task 4: Ruling: source reads keep their read-only credential and source writes require a separate file-provisioned write credential — using one broad credential for both paths makes the routine sync worker more privileged than needed; companies must grant only mapped-table writes to the local write account.
Task 4: Ruling: create is enabled only when the mapped external ID is the table's sole, non-generated primary key, and all other required fields have an approved mapping or database default — otherwise safe replay cannot be guaranteed without inventing schema behavior.
Task 4: complete (commits 91a1e49..78520b2, tests: npm test --prefix connector → ℹ duration_ms 6602.5975)

Task 5: Ruling: source projection and operation terminal state update in one service-only acknowledgement RPC — separate ingest and ack requests could show a saved value while its operation remains pending, or mark completion before the UI read model changes.
Task 5: Ruling: a retry after a lost acknowledgement treats a create with the same stable external key and requested values, an update already at its desired mapped values, or an already-absent delete as idempotently complete — this avoids a source-side DDL journal; if wrong, a coincident external change to the exact desired values is accepted without a second mutation.
Task 5: complete (commits 78520b2..78520b2, tests: npm test --prefix connector → ℹ duration_ms 14321.1021)
Task 6: complete (commits db5ee5f..90acac9, tests: npm test → ℹ duration_ms 10973.5995)
Task 7: complete (commit 90acac9..a05a144, tests: npm test → 362/362; connector npm test → 81 passed, 6 database fixture tests skipped; root and connector lint/build passed)
Task 8: implementation and local verification complete; staging acceptance, immutable image publication, and NAS acceptance remain blocked on an already-existing isolated staging project and credentials. No SQL was applied and no database writes were performed.
