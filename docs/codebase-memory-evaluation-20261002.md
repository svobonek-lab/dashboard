# codebase-memory-mcp evaluation — 2026-10-02

Evaluated `DeusData/codebase-memory-mcp` v0.11.0 for the StavbaFlow dashboard. The Windows amd64 release checksum matched the publisher's checksum file. The project is MIT licensed, runs locally and does not require a hosted account or API key, so the minimal setup has no separate usage fee. Normal local CPU, memory and disk use remain.

## Minimal installation used

- installed the single executable under the user's local application-data directory;
- registered one global MCP server named `codebase-memory` in Codex and OpenCode;
- did not install the optional hooks, plugin, generated agents, global instruction files or PATH changes;
- kept the graph in the tool's user cache with persistence disabled for repository files;
- added no binary, index, secret or tool configuration to this repository.

The automatic installer was not used because its dry run would also change global agent instructions, skills, hooks/plugin files and PATH. Those changes were unnecessary for the requested project map.

## Compatibility and measured usefulness

The current TypeScript/React repository indexed successfully on Windows. The latest index contained about 1,649 nodes and 4,907 edges. Parsing was partial for 61 files and unavailable for four SQL files, so the graph is a navigation aid rather than evidence of correctness.

Concrete comparison on this branch:

- a structural query for the invitation flow returned 24 connected symbols and call relationships, while the equivalent text search returned 80 line hits that still needed manual filtering;
- a structural write-flow query returned 14 connected symbols and quickly identified the repository, context and API boundaries;
- a broad semantic query returned irrelevant nodes and did not save work;
- every selected location was reopened in the source file and checked against tests before editing.

The useful saving is therefore narrower navigation for cross-file call chains. It does not replace source reads, SQL metadata checks, tests or browser verification. Re-index after meaningful code changes before relying on the map. Both Codex and OpenCode now point to the same local executable and cache, avoiding duplicate project indexing.
