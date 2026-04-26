## 1. Verification Gate Setup

- [x] 1.1 Fix server test environment typing so `pnpm typecheck` succeeds without unsafe broad casts in integration tests
- [x] 1.2 Add `@vitest/coverage-istanbul` to `server` dev dependencies
- [x] 1.3 Add a `test:coverage` script to `server/package.json`
- [x] 1.4 Configure Vitest coverage reports, excludes, and practical baseline thresholds in `server/vitest.config.ts`

## 2. Shared Integration Test Infrastructure

- [x] 2.1 Create a shared D1 integration schema/setup helper under `server/test/`
- [x] 2.2 Add reusable seed helpers for users, JWTs, API tokens, feature flags, and transactions
- [x] 2.3 Migrate existing integration tests off duplicated inline `CREATE TABLE` SQL
- [x] 2.4 Ensure integration suites remain isolated through unique IDs, reset helpers, or idempotent setup

## 3. Transaction Service Test Quality

- [x] 3.1 Replace `transaction.service.test.ts` logic-duplication test with tests that instantiate and exercise production `TransactionService`
- [x] 3.2 Cover free-plan monthly quota enforcement and pro-plan quota bypass
- [x] 3.3 Cover user-filtered listing behavior for free and pro plans
- [x] 3.4 Cover summary aggregation including `income`, `expense`, `total`, `transactions`, and `byCategory`
- [x] 3.5 Cover soft-deleted transaction exclusion from reads or summaries

## 4. Voice AI Deterministic Coverage

- [x] 4.1 Add a deterministic AI-disabled fallback test that does not touch the unavailable remote AI binding
- [x] 4.2 Add a mocked successful Workers AI response test for draft normalization and classification
- [x] 4.3 Add mocked invalid JSON, empty response, and rejected AI response tests that verify heuristic fallback metadata
- [x] 4.4 Update existing voice integration tests to avoid noisy `Binding AI needs to be run remotely` logs during normal test runs

## 5. Documentation And Final Verification

- [x] 5.1 Document backend verification commands for typecheck, default tests, and coverage
- [x] 5.2 Run `pnpm typecheck` in `server/`
- [x] 5.3 Run `pnpm test` in `server/`
- [x] 5.4 Run the new coverage command in `server/`
- [x] 5.5 Confirm OpenSpec requirements are satisfied against `openspec/changes/improve-server-test-quality/specs/server-test-quality/spec.md`
