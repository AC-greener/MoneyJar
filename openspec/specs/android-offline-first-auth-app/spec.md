## Purpose

Define the Android offline-first bookkeeping behavior introduced by `android-offline-first-auth`, where local persistence remains the source of truth, anonymous bookkeeping is allowed before login, and authenticated sessions add claiming and sync on top of that local foundation.

## Requirements

### Requirement: Android app SHALL support anonymous local bookkeeping before login
The Android application SHALL allow users to create, view, and summarize transactions locally before authentication, and these transactions MUST remain available on-device without requiring backend access.

#### Scenario: Anonymous user records an expense
- **WHEN** an unauthenticated user creates a valid transaction on the Android app
- **THEN** the system stores the transaction locally and includes it in ledger and stats views without calling authenticated transaction APIs

### Requirement: Android app SHALL persist local transactions across app restarts
The Android application SHALL persist local bookkeeping records and related metadata so that anonymous and authenticated transactions remain available after the app process is restarted.

#### Scenario: Local records survive app restart
- **WHEN** the user relaunches the Android app after previously creating local transactions
- **THEN** the system restores those transactions from persistent local storage and renders them in the app

### Requirement: Android app SHALL support native authenticated sessions
The Android application SHALL support native login using the backend's Android-oriented Google login flow and MUST maintain authenticated session state using locally stored refresh credentials and renewable access tokens.

#### Scenario: User signs in successfully
- **WHEN** the user completes native Google login and the backend accepts the provided `id_token`
- **THEN** the system stores the returned session credentials, marks the user as authenticated, and enables authenticated API use for subsequent sync operations

### Requirement: Android app SHALL automatically claim anonymous local transactions after login
The Android application SHALL automatically reassign anonymous locally stored transactions to the authenticated user after successful login and prepare them for backend synchronization without requiring separate user confirmation.

#### Scenario: Login claims existing anonymous records
- **WHEN** a user signs in on a device that already contains anonymous local transactions
- **THEN** the system marks those anonymous transactions as belonging to the authenticated user locally and queues them for synchronization

### Requirement: Android app SHALL synchronize claimed and authenticated transactions with backend APIs
The Android application SHALL upload claimed anonymous transactions and newly created authenticated transactions to the backend transaction APIs when valid session credentials are available.

#### Scenario: Pending local records sync after login
- **WHEN** the app has authenticated session credentials and there are locally queued transactions awaiting sync
- **THEN** the system attempts to upload those transactions to the backend and records their sync results locally

### Requirement: Android app SHALL track local ownership and sync state explicitly
The Android application SHALL track enough metadata on each local transaction to distinguish anonymous records, authenticated-user records, unsynced records, synced records, and failed sync attempts.

#### Scenario: Local transaction metadata distinguishes record state
- **WHEN** a transaction is created anonymously, claimed after login, synced successfully, or fails to sync
- **THEN** the system updates local transaction metadata so repository and UI logic can determine the record's ownership and sync status

### Requirement: Android app SHALL continue functioning when remote sync is unavailable
The Android application SHALL preserve local bookkeeping workflows even when login, token refresh, or transaction sync fails, and SHALL not block local data entry on remote availability.

#### Scenario: Sync failure does not block local bookkeeping
- **WHEN** an authenticated user creates a transaction while backend sync is unavailable or fails
- **THEN** the system stores the transaction locally, keeps it visible in ledger and stats views, and retains a retryable unsynced state

### Requirement: Android app SHALL derive ledger and stats views from local persisted data
The Android application SHALL use local persisted data as the rendering source for ledger and stats screens, regardless of whether records originated anonymously, were claimed after login, or were synchronized from the backend.

#### Scenario: Views remain consistent through auth and sync transitions
- **WHEN** anonymous transactions are claimed and later synchronized after login
- **THEN** the ledger and stats screens continue to render from local persisted records without dropping or duplicating visible transactions
