## 1. Local persistence foundation

- [x] 1.1 Add Android dependencies and project setup for persistent local storage, session storage, and network integration.
- [x] 1.2 Define local transaction schema/models with ownership and sync metadata such as anonymous/authenticated ownership, remote IDs, and sync state.
- [x] 1.3 Replace the current in-memory transaction source with a persistent local repository that survives app restarts.

## 2. Auth and session layer

- [x] 2.1 Introduce a dedicated Android auth/session layer for native Google login, token storage, token refresh, and logout.
- [x] 2.2 Connect the Android app to the backend auth endpoints used for native login and authenticated session recovery.
- [x] 2.3 Expose authenticated state cleanly to the app without coupling transaction UI directly to token management.

## 3. Local-first transaction data flow

- [x] 3.1 Update record creation so unauthenticated users continue saving transactions locally without backend dependency.
- [x] 3.2 Update ledger and stats flows so they always render from persisted local data for both anonymous and authenticated states.
- [x] 3.3 Add local transaction-state handling for unsynced, pending, synced, and failed records.

## 4. Claiming and synchronization

- [x] 4.1 Add a remote transaction data source for authenticated create/list/sync operations against the backend transaction APIs.
- [x] 4.2 Implement automatic claiming of anonymous local transactions immediately after successful login.
- [x] 4.3 Synchronize claimed anonymous records and newly created authenticated records to the backend while preserving local-first UX.
- [x] 4.4 Add retry handling for failed sync attempts without blocking local bookkeeping.

## 5. UI integration and product behavior

- [x] 5.1 Update the settings/account surface to show login state and allow native sign-in and logout actions.
- [x] 5.2 Surface enough sync/account state in the UI for users to understand whether data is local-only, syncing, or synced.
- [x] 5.3 Define and implement the intended post-logout behavior for locally stored anonymous and claimed records.

## 6. Verification

- [x] 6.1 Add or update tests covering anonymous local entry, session restoration, automatic claiming after login, and sync-state transitions.
- [x] 6.2 Run Android build and test verification for the new offline-first auth and sync flows.

## 7. Review follow-ups

- [x] 7.1 Complete the Google sign-in callback path so activity results are converted into backend login and authenticated app state.
- [x] 7.2 Make the Room transaction repository hydrate persisted records automatically on startup instead of booting with empty in-memory state.
- [x] 7.3 Attach Bearer tokens explicitly in sync-worker and remote transaction requests to protected backend transaction APIs.
- [x] 7.4 Replace placeholder backend host and Google client configuration with environment-backed Android build configuration.
- [x] 7.5 Remove IDE cache churn and other machine-local files from the feature diff before implementation is considered ready.
 
