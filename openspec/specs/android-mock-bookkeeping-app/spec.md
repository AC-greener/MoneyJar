## Purpose

Define the baseline Android mock bookkeeping shell that was completed in the archived `2026-04-25-android-mvp-mock-ui` change, and preserve the implementation lessons that should constrain future Android work.

## Requirements

### Requirement: Android shell SHALL provide a native bookkeeping information architecture
The Android client SHALL provide a native application shell with dedicated destinations for record entry, ledger browsing, statistics, and settings so later phases can extend an already-stable information architecture.

#### Scenario: App boots into stable navigation shell
- **WHEN** the Android app launches
- **THEN** the user can navigate between Record, Ledger, Stats, and Settings without relying on backend availability

### Requirement: Android shell SHALL separate UI from data source selection
The Android client SHALL keep screens bound to repository and ViewModel contracts rather than hardcoded one-off screen state so later phases can replace fake data with local persistence and remote APIs without rewriting the UI layer.

#### Scenario: Data source can evolve without screen rewrite
- **WHEN** the transaction data source changes from fake in-memory data to a persistent or remote-backed repository
- **THEN** the screen contracts remain stable and only repository wiring changes

### Requirement: Android shell SHALL derive ledger and stats from one shared source of truth
The Android client SHALL use a shared transaction data source for record creation, ledger rendering, and summary derivation so counts and totals remain coherent across screens.

#### Scenario: New transaction updates all surfaces coherently
- **WHEN** a new transaction is created from the record flow
- **THEN** the ledger and stats surfaces reflect the same underlying transaction set without separate mock payloads

### Requirement: Android shell SHALL preserve room for offline-first evolution
The Android client SHALL treat the initial mock shell as a staging step toward offline-first local persistence, authenticated sessions, and sync rather than as a disposable prototype.

#### Scenario: Next phase extends instead of replaces
- **WHEN** later Android changes introduce Room, auth, or backend APIs
- **THEN** those changes build on the existing repository and navigation boundaries instead of replacing the entire shell

## Implementation Lessons

### Lesson: Missing delta specs prevented main spec generation
The archived `2026-04-25-android-mvp-mock-ui` change shipped with `proposal.md`, `design.md`, and `tasks.md`, but no `openspec/changes/.../specs/<capability>/spec.md`. Because no delta spec existed, archive/sync workflows had no source material to populate `openspec/specs/`.

### Lesson: Repository seams were the highest-value decision
Using a `TransactionRepository` abstraction and shared `MoneyJarViewModel` was the key decision that made the mock MVP useful beyond a one-off demo. This seam should remain the extension point for Room, auth, sync, and remote APIs.

### Lesson: Shared-source summaries avoided product drift
The stats screen stayed trustworthy because summary data was derived from the same transaction set used by ledger and record flows. Future Android work should keep local summaries derived from persisted records rather than introducing separate stats-only payloads.

### Lesson: Native shell first was the right scope cut
Deferring login, backend integration, and sync allowed the Android app to settle its information architecture, theme, and UI state model quickly. Future phases should continue layering infrastructure onto this shell rather than re-scoping the core navigation and screen model.

### Lesson: Verification required explicit local JDK and Gradle handling
During implementation, Android verification only became reliable after pointing Gradle at Android Studio's bundled JBR and accounting for local Gradle cache behavior. Future Android implementation notes should include reproducible build instructions early in the change to avoid environment churn.

## Follow-on Guidance

- Future Android changes SHOULD create delta specs under `openspec/changes/<change>/specs/<capability>/spec.md` before archiving.
- Future Android changes SHOULD treat `openspec/specs/android-mock-bookkeeping-app/spec.md` as the baseline shell contract and extend it rather than re-describing the entire app from scratch.
- Follow-on changes that add auth, persistence, or sync SHOULD explicitly reference these lessons when deciding whether to modify repository boundaries, ownership rules, or summary derivation.
