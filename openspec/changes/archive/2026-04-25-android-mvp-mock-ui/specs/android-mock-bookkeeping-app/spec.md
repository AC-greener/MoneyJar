## ADDED Requirements

### Requirement: Android app SHALL provide a native mock-backed bookkeeping shell
The Android application SHALL provide a native mobile shell with bottom navigation and dedicated destinations for record entry, ledger browsing, statistics, and settings, without requiring authentication or backend connectivity.

#### Scenario: App opens into the MVP shell
- **WHEN** the user launches the Android application
- **THEN** the system shows a native Compose application shell with accessible destinations for record, ledger, stats, and settings

### Requirement: Android app SHALL support local mock transaction entry
The Android application SHALL allow the user to create a bookkeeping record from local UI controls using a fake repository, and the newly created record MUST immediately appear in the app's mock-backed state.

#### Scenario: User saves a new expense
- **WHEN** the user enters a valid amount, category, and optional note on the record screen and taps save
- **THEN** the system creates a mock transaction locally and reflects it in subsequent ledger and stats views

### Requirement: Android app SHALL display recent bookkeeping history
The Android application SHALL present a ledger view driven by the shared mock transaction source, ordered from newest to oldest, so the user can review recent records in the MVP.

#### Scenario: Ledger shows seeded and newly added items
- **WHEN** the user opens the ledger destination after app launch or after adding a transaction
- **THEN** the system displays the available mock transactions in reverse chronological order

### Requirement: Android app SHALL provide mock-derived summary insights
The Android application SHALL calculate and display simple weekly and monthly bookkeeping summaries from the same mock transaction dataset used by record and ledger flows.

#### Scenario: Stats reflect current mock data
- **WHEN** the user opens the stats destination
- **THEN** the system shows weekly and monthly totals and a category-level breakdown derived from the current mock transactions

### Requirement: Android app SHALL expose a lightweight settings surface
The Android application SHALL provide a settings destination that exposes non-authenticated app information and placeholder preferences suitable for the MVP scope.

#### Scenario: Settings loads without account state
- **WHEN** the user opens the settings destination
- **THEN** the system shows application-level settings content without prompting for login or account management

### Requirement: Android app SHALL isolate mock data behind replaceable interfaces
The Android MVP SHALL access bookkeeping data through repository abstractions so that future local persistence, auth, and network implementations can replace the fake data source without redefining screen-level requirements.

#### Scenario: Screens depend on app data contracts rather than hardcoded lists
- **WHEN** the application renders record, ledger, stats, or settings content
- **THEN** each screen obtains its state through defined application data contracts rather than embedding one-off mock lists directly in UI components
