## Purpose

Define the client-facing text-first voice bookkeeping flow for the current web implementation, including local speech-to-text capture, editable composer behavior, and handling of server parse outcomes.

## Requirements

### Requirement: Clients SHALL support text-first voice bookkeeping entry
Client applications SHALL allow users to start voice capture, run local speech-to-text, and place the recognized bookkeeping text into the standard record composer before server submission.

#### Scenario: Speech recognition fills composer
- **WHEN** the user records a bookkeeping utterance and speech recognition succeeds
- **THEN** the recognized text is inserted into the editable record composer instead of being submitted automatically

#### Scenario: User edits recognized text before submit
- **WHEN** recognized text is present in the composer
- **THEN** the user can modify or replace the text before submitting it to the server

### Requirement: Clients SHALL treat composer text as the canonical submission payload
Client applications SHALL submit the current composer text to the server, regardless of whether that text originated from voice recognition, manual edits, or fully manual entry.

#### Scenario: Edited voice text is submitted
- **WHEN** a user changes the recognized text in the composer and taps submit
- **THEN** the client sends the edited composer text as the request payload

#### Scenario: Manual text follows the same path
- **WHEN** a user types bookkeeping text manually without using voice capture
- **THEN** the client submits that text through the same parse-and-commit flow

### Requirement: Clients SHALL handle parse outcomes with explicit user states
Client applications SHALL support three response states from the server: direct commit success, confirmation required, and parse failure.

#### Scenario: Direct commit success
- **WHEN** the server returns a result with status `ready_to_commit` and commit success
- **THEN** the client shows success feedback and clears or resets the composer state

#### Scenario: Confirmation required
- **WHEN** the server returns a result with status `needs_confirmation`
- **THEN** the client presents the returned transaction draft data for user confirmation or correction before final commit

#### Scenario: Parse failure
- **WHEN** the server returns a result with status `failed`
- **THEN** the client preserves the submitted text and shows a recovery path for retrying or editing manually

### Requirement: Clients SHALL provide recovery for local voice capture failure
Client applications SHALL handle microphone permission denial and speech recognition failure without blocking bookkeeping entry.

#### Scenario: Microphone permission denied
- **WHEN** microphone access is unavailable or denied
- **THEN** the client informs the user and keeps manual text entry available

#### Scenario: Speech recognition fails
- **WHEN** local speech recognition cannot produce usable text
- **THEN** the client shows a retry message and leaves the composer available for manual input

### Requirement: Android clients SHALL match the shared text-first voice entry contract
Android clients SHALL implement the same text-first voice bookkeeping contract as other clients while using native platform capabilities for speech capture and navigation.

#### Scenario: Android manual text follows voice submit path
- **WHEN** an Android user types bookkeeping text without using the microphone
- **THEN** Android submits that text through the same server parse-and-commit flow used for recognized speech

#### Scenario: Android recognized speech remains editable
- **WHEN** Android speech recognition inserts text into the composer
- **THEN** the user can edit or replace the text before submitting it to the server

#### Scenario: Android uses platform-native confirmation
- **WHEN** Android receives a `needs_confirmation` response
- **THEN** Android presents a native confirmation experience that preserves the returned source text and draft metadata before final commit

### Requirement: Android clients SHALL preserve source text through recoverable failures
Android clients SHALL keep the user's submitted composer text available when local speech recognition, server parsing, network, or authentication failures prevent completion.

#### Scenario: Android parse failure preserves text
- **WHEN** the server returns `failed` for an Android submit request
- **THEN** Android preserves the submitted source text for editing and retry

#### Scenario: Android network failure preserves text
- **WHEN** Android cannot complete submit because of network or timeout failure
- **THEN** Android preserves the current composer text and does not create or queue a transaction

#### Scenario: Android speech failure preserves existing composer
- **WHEN** local speech recognition fails after the composer already contains text
- **THEN** Android leaves the existing composer text unchanged
