## Why

Server tests currently pass at runtime, but the quality gate is incomplete: `pnpm typecheck` fails for integration tests, coverage cannot be generated, and several important backend paths are either only indirectly covered or covered by tests that do not exercise production code. This change makes server test health measurable, quieter, and harder to regress before more auth, voice AI, and MCP work builds on it.

## What Changes

- Add a runnable server coverage command and Vitest coverage configuration with initial thresholds suitable for the current codebase.
- Fix server test TypeScript environment typing so `pnpm typecheck` can be part of the backend verification gate.
- Replace low-value transaction unit coverage with tests that exercise `TransactionService` behavior through controlled collaborators or a test database.
- Add explicit voice transaction tests for AI-disabled fallback, successful Workers AI parsing, invalid/empty AI responses, and fallback behavior without relying on noisy remote-binding failures.
- Consolidate integration-test database setup so tests use one shared schema/migration helper instead of hand-copied `CREATE TABLE` SQL per file.
- Document the expected backend verification commands for future server changes.

## Capabilities

### New Capabilities
- `server-test-quality`: Defines backend test quality expectations, including typecheck, coverage generation, meaningful unit tests, integration schema consistency, and deterministic AI/fallback tests.

### Modified Capabilities

## Impact

- Affected code: `server/package.json`, `server/vitest.config.ts`, `server/test/**/*.ts`, server test helpers, and possibly server type declarations under `server/src/types/` or `server/test/`.
- Affected dependencies: add Vitest coverage provider, expected to be `@vitest/coverage-istanbul` because the Workers Vitest pool cannot use V8 coverage.
- Affected systems: local backend verification and CI commands for the Cloudflare Workers server.
- No production API contract changes are intended.
