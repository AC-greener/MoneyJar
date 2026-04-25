## Context

The Android app already has a working mock-backed shell with record, ledger, stats, and settings screens, but all bookkeeping data currently lives in an in-memory fake repository. The backend already exposes native Android login and authenticated transaction APIs, yet the current Android app does not persist local data, maintain session state, or synchronize records. This change upgrades the Android app into a local-first architecture where anonymous bookkeeping is allowed, local storage remains the primary source of truth, and login enables automatic claiming and synchronization of anonymous local transactions into the authenticated account.

Constraints:
- Users must be able to create and view transactions before signing in.
- Existing backend transaction APIs remain authenticated-only, so anonymous records cannot be stored server-side before login.
- The Android UI should continue to work offline, with local persistence available regardless of network state.
- Login must be native Android login using the backend's existing `/api/auth/google` flow for `id_token` exchange.
- The next phase must evolve from the current Android codebase rather than replace it.

## Goals / Non-Goals

**Goals:**
- Introduce persistent local storage for transactions and app session state.
- Support anonymous local bookkeeping without backend dependency.
- Add native authenticated sessions and backend transaction API integration.
- Automatically claim anonymous local transactions for the current account after login and sync them to the backend.
- Track sync state explicitly so the app can distinguish local-only, pending, synced, and failed records.
- Keep ledger and stats views driven by local data, even after cloud integration arrives.

**Non-Goals:**
- Anonymous cloud storage or unauthenticated backend transaction APIs.
- Multi-account switching UX beyond the minimum needed to keep ownership boundaries coherent.
- Full bidirectional conflict resolution across multiple devices in this phase.
- Voice parsing, OCR, or other AI-specific enhancements.

## Decisions

### 1. Make local persistence the source of truth
Android will introduce a persistent local data store, such as Room, and all record, ledger, and stats screens will read from it first. Remote sync will update local records rather than bypass them.

Alternatives considered:
- Rendering directly from remote API responses after login: simpler on paper, but breaks offline-first guarantees and creates inconsistent UI behavior.
- Keeping a fake repository plus remote fetches: not durable enough for anonymous local bookkeeping.

### 2. Add explicit ownership and sync metadata to local transactions
Local records will carry ownership and sync metadata, for example `ownerType`, `ownerId`, `remoteId`, and `syncState`, so the app can distinguish anonymous records from authenticated records and automatically claim anonymous records after login.

Alternatives considered:
- Implicitly treating all local records as belonging to the current user: easy to start, but unsafe once login/logout and retry semantics appear.
- Separate anonymous and user tables: possible, but introduces more migration complexity and makes claiming logic harder to reason about.

### 3. Keep authentication separate from transaction repositories
The app should introduce a dedicated auth/session layer responsible for login state, access token usage, refresh token storage, and logout. Transaction repositories should consume auth state, not own it.

Alternatives considered:
- Embedding auth checks inside the transaction repository surface: convenient short term, but quickly tangles data and session logic.

### 4. Automatically claim anonymous transactions after successful login
When login succeeds, the app will detect anonymous local transactions that have not yet been claimed, assign them to the newly authenticated user locally, and enqueue them for backend synchronization.

Alternatives considered:
- Ignoring pre-login transactions after login: clean technically, but poor user experience.
- Prompting users to choose whether to claim local data: safer for shared-device scenarios, but the user has explicitly chosen automatic claiming for this phase.

### 5. Treat sync as incremental enhancement over local bookkeeping
Sync orchestration should run after login and on later retry opportunities, but local bookkeeping must remain available even when sync is delayed or fails. A background coordinator such as WorkManager is appropriate, but the first implementation can remain intentionally narrow as long as sync state is observable and retryable.

Alternatives considered:
- Blocking local saves until remote success: violates the offline-first model.
- Deferring all sync infrastructure to a later phase: would make login feel incomplete once cloud APIs are introduced.

### 6. Require a complete sign-in callback, not just sign-in UI affordance
The Android login flow is only valid once the activity result is converted into a Google account result, the `id_token` is extracted, and the backend login exchange updates application auth state. Rendering a login button or launching a sign-in intent is not sufficient.

Alternatives considered:
- Staging only the sign-in button UI first: visually useful, but functionally misleading because the account/sync flow still cannot transition into an authenticated state.

### 7. Require repository startup hydration from Room
The Room-backed transaction repository must begin collecting database state as part of app startup so persisted records become the live source for ledger and stats immediately after process launch.

Alternatives considered:
- Manually refreshing from Room only through ad hoc initialization hooks: fragile, easy to forget, and prone to booting into empty in-memory state despite persisted records existing.

### 8. Require authenticated sync clients to attach Bearer tokens explicitly
Any worker or remote transaction client that calls authenticated backend transaction routes must install the current access token into outgoing requests. Passing a token through method parameters without wiring it into the HTTP client is not an acceptable implementation.

Alternatives considered:
- Letting sync code assume auth is handled elsewhere: too implicit, and review already showed this creates guaranteed 401 loops.

### 9. Require environment-backed backend configuration
Backend base URLs and Google server client IDs must come from build configuration or environment-specific Android config rather than placeholder literals inside auth or sync classes.

Alternatives considered:
- Hard-coding placeholder hostnames during feature work: faster temporarily, but blocks real verification and makes the feature appear implemented when runtime connectivity is guaranteed to fail.

## Risks / Trade-offs

- [Ownership rules become confusing across login/logout] -> Persist explicit owner metadata locally and define deterministic transitions from anonymous to authenticated ownership.
- [Duplicate records appear after syncing claimed anonymous data] -> Store `remoteId` and sync state locally, and only upload unsynced claimed records.
- [Token lifecycle introduces brittle failure modes] -> Separate session storage from transaction logic and implement refresh/logout flows as first-class behaviors.
- [Stats drift if remote and local sources diverge] -> Keep stats derived from local persisted records only, with sync mutating local state after success.
- [Automatic claiming is risky on shared devices] -> Accept this trade-off for the chosen product rule and document it clearly for future account-management work.
- [Login UX exists but auth never completes] -> Treat sign-in callback handling as part of the minimum viable auth feature, and verify authenticated state changes in tests.
- [Persisted Room data is silently ignored on cold start] -> Require repository hydration on startup and include restart coverage in verification.
- [Sync workers fail every request with 401] -> Make authenticated request wiring explicit in worker and remote-client design, and test with protected endpoints.
- [Placeholder config leaks into implementation] -> Centralize backend host and Google client ID in build config so runtime environments are deterministic.
- [Review noise hides product changes] -> Keep IDE cache churn and other machine-local files out of feature changes so code review stays focused on behavior.

## Migration Plan

1. Replace the current in-memory fake repository with a persistent local repository while preserving current UI behavior.
2. Introduce local schema changes needed for ownership and sync metadata.
3. Add auth/session storage and native login flow.
4. Add remote transaction data source and upload logic for claimed/local pending records.
5. Trigger automatic anonymous-record claiming immediately after successful login.
6. Verify that existing local data still renders and that newly claimed records remain visible throughout sync.

Rollback remains contained to the Android client because backend contracts already exist and are reused rather than changed.

## Open Questions

- Should logout leave previously claimed records visible on the device, or should authenticated-user records be filtered when no session exists?
- Should first-login sync happen immediately in the foreground, or be handed off to background work after local ownership is reassigned?
- Do we want a visible sync status badge in the UI during this phase, or is silent background state enough for the initial rollout?
