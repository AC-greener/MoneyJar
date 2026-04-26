## Context

The server is a Cloudflare Workers Hono application tested with Vitest and `@cloudflare/vitest-pool-workers`. A review of the current backend tests found that runtime tests pass, but the backend verification gate is incomplete: coverage generation is not configured, `pnpm typecheck` fails in tests, some unit tests do not exercise production code, voice AI tests rely on noisy fallback from an unavailable AI binding, and integration tests duplicate schema setup by hand.

This change is cross-cutting across test configuration, test helpers, and server test suites. It is intentionally scoped to test quality and verification reliability, not production API behavior.

## Goals / Non-Goals

**Goals:**

- Make `pnpm typecheck` pass for server source and tests.
- Add a runnable coverage command and baseline coverage thresholds.
- Improve the signal of unit tests around transaction service behavior.
- Make voice transaction AI/fallback tests deterministic and quiet.
- Reduce schema drift risk in integration tests by sharing one database setup path.
- Establish a documented server verification sequence for future changes.

**Non-Goals:**

- Change production API contracts or response schemas.
- Replace Vitest or the Cloudflare Workers test pool.
- Require live Workers AI or remote Cloudflare services for the default test suite.
- Achieve perfect coverage in one step; thresholds should start practical and be raised later.

## Decisions

1. Use Vitest Istanbul coverage as the initial coverage provider.

   Rationale: The Workers Vitest pool runs tests inside the Workers runtime, where V8 coverage attempts to import `node:inspector/promises`. Cloudflare documents this as unsupported, so the coverage gate uses `@vitest/coverage-istanbul` instead.

2. Add a dedicated `test:coverage` script instead of overloading `pnpm test`.

   Rationale: The default test command should remain fast and familiar, while coverage can run in CI or before larger merges. Thresholds still make coverage measurable and prevent silent regression when the command is used.

3. Fix test environment typing through test-local declarations or a shared test env helper.

   Rationale: Runtime secrets are available in `.dev.vars`/Cloudflare bindings, but `cloudflare:test` currently exposes a narrower type. A typed helper keeps tests honest without spreading unsafe casts through each file.

4. Prefer deterministic collaborators over live remote bindings for AI tests.

   Rationale: Default tests must be local, repeatable, and quiet. Voice transaction tests should explicitly cover `WORKERS_AI_ENABLED=false`, successful mocked AI parsing, invalid AI output fallback, and empty AI output fallback. Live AI behavior can be covered separately by an opt-in smoke test if needed.

5. Share integration database setup.

   Rationale: Hand-copied table SQL across test files can diverge from Drizzle schema and migrations. A single helper should apply the same schema for all integration suites and provide seed helpers for users, tokens, feature flags, and transactions.

6. Replace low-value unit tests with behavior-oriented tests.

   Rationale: Tests that reimplement logic locally can pass even when production code breaks. Transaction service tests should exercise service methods and verify observable behavior: quota enforcement, pro bypass, user filtering, summary aggregation, and soft-delete exclusion.

## Risks / Trade-offs

- Coverage with the Workers pool may expose noisy instrumentation or slower runs -> Keep coverage in a separate script and tune excludes for generated/config files.
- Initial thresholds may be lower than ideal -> Set realistic baseline thresholds first, then ratchet upward in later changes.
- Shared integration setup could accidentally couple tests through shared DB state -> Provide reset/unique seed helpers and use isolated IDs in each suite.
- Mocking AI binding could miss real Workers AI quirks -> Keep deterministic unit/integration tests as the default and reserve remote AI checks for explicit smoke testing.
- Updating generated Worker typings directly may be overwritten by `wrangler types` -> Prefer additive declarations or helpers unless regenerated types are intentionally updated.
