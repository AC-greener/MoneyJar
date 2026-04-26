# Server Test Quality Specification

## Purpose

Define the backend verification, coverage, and test-structure expectations that keep the server test suite meaningful and enforceable.

## Requirements

### Requirement: Server verification gate passes
The server test quality gate SHALL include TypeScript checking and the default Vitest suite, and both commands MUST pass without TypeScript errors or failed tests.

#### Scenario: Typecheck is run for server changes
- **WHEN** a developer runs `pnpm typecheck` in `server/`
- **THEN** TypeScript checking MUST complete successfully for server source and test files

#### Scenario: Default server tests are run
- **WHEN** a developer runs `pnpm test` in `server/`
- **THEN** the Vitest suite MUST complete successfully without failed tests

### Requirement: Coverage is measurable
The server test suite SHALL provide a runnable coverage command with configured coverage output and thresholds.

#### Scenario: Coverage command is run
- **WHEN** a developer runs the server coverage command
- **THEN** Vitest MUST generate a coverage report instead of failing due to missing coverage provider configuration

#### Scenario: Coverage thresholds are enforced
- **WHEN** coverage is generated
- **THEN** the command MUST fail if coverage drops below the configured baseline thresholds

### Requirement: Unit tests exercise production behavior
Server unit tests MUST call production services, functions, or controlled collaborators rather than duplicating implementation logic inside the test.

#### Scenario: Transaction service unit tests run
- **WHEN** transaction service unit tests execute
- **THEN** they MUST exercise `TransactionService` behavior such as quota enforcement, plan handling, summary aggregation, user filtering, or soft deletion

#### Scenario: Reimplemented-only logic is removed
- **WHEN** a unit test claims to cover service behavior
- **THEN** it MUST fail if the corresponding production service behavior is changed incorrectly

### Requirement: Voice AI tests are deterministic
Voice transaction tests SHALL explicitly cover AI-disabled fallback and mocked AI parsing outcomes without depending on unavailable remote Workers AI bindings.

#### Scenario: AI-disabled fallback is tested
- **WHEN** voice submit tests run with Workers AI disabled
- **THEN** the heuristic fallback path MUST be exercised without remote binding errors

#### Scenario: Mocked AI parse succeeds
- **WHEN** voice parsing receives a mocked valid Workers AI JSON response
- **THEN** the service MUST normalize the response and classify drafts correctly

#### Scenario: Mocked AI parse fails
- **WHEN** voice parsing receives invalid, empty, or rejected AI output
- **THEN** the service MUST fall back to heuristic parsing and expose fallback metadata

### Requirement: Integration tests share schema setup
Server integration tests SHALL use a shared D1 schema setup helper rather than duplicating table creation SQL in each test file.

#### Scenario: Integration database is initialized
- **WHEN** an integration test suite initializes D1
- **THEN** it MUST use the shared setup helper to create the required schema

#### Scenario: Schema changes are reflected once
- **WHEN** the server database schema changes
- **THEN** integration test setup MUST require updating one shared schema helper or migration source rather than multiple copied SQL blocks

### Requirement: Backend verification is documented
The server SHALL document the expected verification commands for backend test-quality work.

#### Scenario: Developer checks server verification steps
- **WHEN** a developer reads the server testing guidance
- **THEN** it MUST identify the commands for typecheck, default tests, and coverage
