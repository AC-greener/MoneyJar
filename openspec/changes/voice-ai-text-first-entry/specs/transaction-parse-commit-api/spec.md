## ADDED Requirements

### Requirement: Server SHALL parse bookkeeping text into transaction drafts
The server SHALL accept submitted bookkeeping text and return one or more structured transaction drafts that capture the interpreted bookkeeping intent.

#### Scenario: Single transaction text is parsed
- **WHEN** an authenticated client submits a sentence describing one transaction
- **THEN** the server returns one structured transaction draft with normalized bookkeeping fields

#### Scenario: Multi-transaction text is parsed
- **WHEN** an authenticated client submits text containing multiple bookkeeping items
- **THEN** the server returns multiple transaction drafts representing the separate interpreted records

### Requirement: Server SHALL classify parse outcomes by confidence and completeness
The server SHALL assign each parse request one of three statuses: `ready_to_commit`, `needs_confirmation`, or `failed`, based on validation, confidence, and required field completeness.

#### Scenario: High-confidence parse is committable
- **WHEN** submitted text yields complete drafts with confidence above the server threshold
- **THEN** the server marks the result as `ready_to_commit`

#### Scenario: Ambiguous parse requires confirmation
- **WHEN** one or more drafts contain low-confidence fields or missing required values
- **THEN** the server marks the result as `needs_confirmation` and includes the fields that need review

#### Scenario: Unusable parse fails safely
- **WHEN** the server cannot derive a valid bookkeeping interpretation from the submitted text
- **THEN** the server marks the result as `failed` and does not create transactions

### Requirement: Server SHALL separate parsing from final transaction creation
The server SHALL avoid creating persistent transactions until a parse result is either directly committable under server policy or confirmed by the user.

#### Scenario: Directly committable drafts are created
- **WHEN** a parse result is `ready_to_commit`
- **THEN** the server may create the transactions in the same submit flow and return the created record identifiers

#### Scenario: Confirmation gate blocks persistence
- **WHEN** a parse result is `needs_confirmation`
- **THEN** the server does not persist the returned drafts until the client submits a confirmation request

### Requirement: Server SHALL preserve draft metadata needed for confirmation UX
The server SHALL include draft-level metadata that allows clients to explain and resolve ambiguous parses.

#### Scenario: Confirmation payload includes missing fields
- **WHEN** a draft is incomplete
- **THEN** the server response includes which required fields are missing from that draft

#### Scenario: Confirmation payload includes confidence signals
- **WHEN** a draft contains uncertain interpretations
- **THEN** the server response includes confidence metadata or equivalent review hints for the affected draft fields

### Requirement: Server SHALL preserve the original submitted text through parse outcomes
The server SHALL associate parse results with the exact submitted bookkeeping text so clients can recover gracefully from failure or confirmation flows.

#### Scenario: Failed parse retains source text
- **WHEN** a parse request fails
- **THEN** the server response includes or references the original submitted text for retry and manual correction flows

#### Scenario: Confirmation response retains source text
- **WHEN** a parse request requires confirmation
- **THEN** the server response keeps the original submitted text linked to the returned drafts
