## Purpose

Define the native Android text-first voice/manual bookkeeping entry flow, including local speech-to-text, server parse/commit outcomes, dedicated confirmation, recovery states, and local mirroring of committed server transactions.

## Requirements

### Requirement: Android Record SHALL use a text-first voice entry composer
The Android application SHALL make the primary Record entry experience a text-first composer where manual text and recognized speech are edited in the same input before submission.

#### Scenario: User types bookkeeping text manually
- **WHEN** the user enters bookkeeping text directly into the Android Record composer
- **THEN** the current composer text is available for submission through the voice transaction submit flow

#### Scenario: Speech recognition fills editable composer
- **WHEN** Android speech recognition returns recognized bookkeeping text
- **THEN** the recognized text is inserted into the editable Record composer without being submitted automatically

#### Scenario: Edited composer text is canonical
- **WHEN** the user edits recognized text before tapping submit
- **THEN** Android submits the edited composer text rather than the original recognition result

### Requirement: Android voice capture SHALL handle microphone permission and local STT states
The Android application SHALL request microphone permission before voice capture, run local speech-to-text with Chinese recognition behavior, and preserve manual text entry when capture is unavailable or fails.

#### Scenario: Microphone permission is granted
- **WHEN** the user grants microphone permission and starts voice capture
- **THEN** Android starts local speech recognition using `zh-CN` behavior and shows an active listening state

#### Scenario: Microphone permission is denied
- **WHEN** the user denies or permanently blocks microphone permission
- **THEN** Android shows a recoverable permission message and keeps the composer available for manual text entry

#### Scenario: Speech recognition fails
- **WHEN** speech recognition returns no usable text or reports an error
- **THEN** Android keeps the existing composer text, exits the listening state, and offers retry or manual editing

### Requirement: Android submit SHALL use the shared server parse and commit contract
The Android application SHALL submit the current composer text to the existing server voice transaction submit endpoint and handle `ready_to_commit`, `needs_confirmation`, and `failed` outcomes explicitly.

#### Scenario: Submit returns ready to commit
- **WHEN** the server returns `ready_to_commit` with committed transactions
- **THEN** Android mirrors the committed transactions locally, clears the composer, and shows success feedback

#### Scenario: Submit returns needs confirmation
- **WHEN** the server returns `needs_confirmation` with draft transactions
- **THEN** Android preserves the source text and navigates to the dedicated confirmation screen with the returned drafts

#### Scenario: Submit returns failed
- **WHEN** the server returns `failed`
- **THEN** Android keeps the submitted source text in the composer and shows a recovery path for editing and retrying

### Requirement: Android confirmation SHALL support one or more editable drafts
The Android application SHALL provide a dedicated confirmation screen that lets the user review, correct, and confirm all returned transaction drafts before final commit.

#### Scenario: Confirmation screen shows returned drafts
- **WHEN** Android opens confirmation for a `needs_confirmation` response
- **THEN** the screen displays the source text and every returned draft with editable amount, category, type, note, and occurred-at fields where available

#### Scenario: Missing required fields block confirmation
- **WHEN** any draft is missing a required amount or category
- **THEN** Android prevents final confirmation and highlights the fields that require user input

#### Scenario: User confirms corrected drafts
- **WHEN** the user submits valid corrected drafts from the confirmation screen
- **THEN** Android sends the source text and corrected drafts to the existing server voice transaction confirm endpoint

#### Scenario: Confirmation succeeds
- **WHEN** the confirm endpoint returns committed transactions
- **THEN** Android mirrors the committed transactions locally, returns to the Record flow, clears the confirmed source text, and shows success feedback

### Requirement: Android voice entry SHALL recover safely from network and auth failures
The Android application SHALL preserve user-entered text or draft edits when submit or confirm cannot complete because of network, timeout, or authentication failures.

#### Scenario: Submit fails while offline
- **WHEN** the user submits composer text and Android cannot reach the server
- **THEN** Android keeps the composer text unchanged and tells the user to retry after reconnecting

#### Scenario: Confirm fails while offline
- **WHEN** the user confirms corrected drafts and Android cannot reach the server
- **THEN** Android keeps the confirmation edits unchanged and offers retry without creating local transactions

#### Scenario: Submit requires login
- **WHEN** the server rejects voice submit because the user is unauthenticated or the session is invalid
- **THEN** Android keeps the composer text unchanged and routes the user toward login or session recovery

### Requirement: Android committed voice transactions SHALL appear in local ledger and stats
The Android application SHALL mirror voice-committed server transactions into the local transaction store so ledger and stats continue to render from the local source of truth.

#### Scenario: Ready commit is mirrored locally
- **WHEN** Android receives committed transactions from a `ready_to_commit` submit response
- **THEN** each committed transaction is stored locally with its backend identifier and visible in Ledger and Stats

#### Scenario: Confirmed commit is mirrored locally
- **WHEN** Android receives committed transactions from a successful confirmation response
- **THEN** each committed transaction is stored locally with its backend identifier and visible in Ledger and Stats

#### Scenario: Duplicate committed response is handled safely
- **WHEN** Android processes a committed transaction whose backend identifier already exists locally
- **THEN** Android updates or ignores the existing local record instead of creating a duplicate visible transaction
