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
