## Context

The repository already contains production-oriented web frontend and server implementations, while the Android app remains a stock Compose starter. This change creates the first usable Android client surface, but intentionally limits scope to a local, single-device demo experience driven by fake data so we can validate native navigation, screen structure, and state flow before integrating auth, APIs, or sync.

Constraints:
- Work happens inside the existing `android/` Gradle project.
- MVP must be demoable without backend availability or Google login setup.
- The app should mirror the product's core IA from existing clients: record, ledger, stats, and settings.
- Future integration with Room, Retrofit, and auth should not require a UI rewrite.

## Goals / Non-Goals

**Goals:**
- Establish a native Android app shell with bottom navigation and four primary destinations.
- Model bookkeeping data and UI state through repository-backed ViewModels using mock data.
- Support the core MVP flow: create a transaction locally, view recent records, inspect simple weekly/monthly summaries, and browse a lightweight settings screen.
- Create clean seams so fake repositories can later be replaced by real local/remote data sources.

**Non-Goals:**
- Google login, token storage, or authenticated user state.
- Real backend communication, sync jobs, or offline conflict handling.
- Voice AI parsing, receipt OCR, or server-driven categorization.
- Database persistence in this proposal unless needed as an internal implementation detail later.

## Decisions

### 1. Use a repository interface with a fake in-memory implementation
The Android MVP will define repository contracts first, with a fake implementation providing seeded transactions and local mutations. This keeps UI and ViewModels stable while letting future phases swap in Room or network-backed repositories.

Alternatives considered:
- Directly storing mock lists inside screens: fastest, but creates a throwaway UI layer with no migration path.
- Implementing Room immediately: closer to final architecture, but adds setup cost before the user-facing Android flow is validated.

### 2. Align Android information architecture with existing product surfaces
The app will use four tabs: Record, Ledger, Stats, and Settings. This mirrors the product language already present in the web app while splitting "record entry" from "history browsing" more clearly for a native mobile shell.

Alternatives considered:
- Reusing only three tabs from web and combining record/history: simpler navigation, but makes the Android app feel cramped and reduces room for future transaction tooling.
- Building a single-screen demo: faster, but not representative of the intended app structure.

### 3. Use Jetpack Compose + Navigation Compose + ViewModel as the baseline app pattern
Compose is already enabled in the Android project and fits the need for rapid UI iteration. Navigation Compose provides a native, testable route structure, and ViewModels with `StateFlow` give us a clean state boundary for fake and future real repositories.

Alternatives considered:
- Keeping everything in `MainActivity` only: acceptable for a template, but not for a multi-screen MVP.
- Introducing a heavier architecture stack prematurely: unnecessary before real data and dependency injection arrive.

### 4. Keep summary and category data derived from seeded transaction models
Stats should be generated from the same transaction source used by record and ledger views so the app demonstrates coherent behavior even with fake data. The fake repository will own the source of truth and expose both record lists and derived summaries.

Alternatives considered:
- Separate mock stats payloads: easy to assemble, but risks inconsistent numbers between ledger and stats screens.

## Risks / Trade-offs

- [Mock data diverges from real API shape] -> Define Android domain models to closely follow current transaction fields from the server and web client.
- [MVP feels too shallow without login or sync] -> Keep scope explicit in proposal/specs and optimize for a polished local demo rather than partial infrastructure.
- [Future integration causes refactor churn] -> Hide data access behind repository interfaces and keep navigation/screen contracts independent from mock implementation details.
- [Stats UI becomes over-engineered too early] -> Limit MVP stats to lightweight totals and category breakdowns that can be rendered without adding charting complexity unless needed.

## Migration Plan

1. Build the Android app shell and fake repository-backed flows in isolation.
2. Validate navigation, component boundaries, and UI state using local mock data.
3. In a follow-up change, introduce persistent storage and/or real API repositories behind the same interfaces.
4. Add auth and sync only after the core native flow has been proven usable.

Rollback is low risk because this change only affects the Android client and can be reverted without impacting the web or server codepaths.

## Open Questions

- Should the first record screen use only text entry, or include a visible microphone button as a non-functional placeholder?
- Should stats stay card-based for MVP, or include a simple chart if Compose UI remains light enough?
- Do we want seeded mock data to be static on every app launch or regenerated for a more realistic demo state?
