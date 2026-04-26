## MODIFIED Requirements

### Requirement: Android app SHALL continue functioning when remote sync is unavailable
The Android application SHALL preserve local ledger, stats, settings, and already persisted bookkeeping records when remote services are unavailable. For AI text-first voice/manual submissions that require server parsing, Android SHALL keep the unparsed composer text or confirmation edits available for explicit retry and MUST NOT create a local transaction or background queue entry until the server returns committed transactions.

#### Scenario: Sync failure does not block existing local bookkeeping views
- **WHEN** backend sync is unavailable or fails
- **THEN** Android continues rendering locally persisted transactions in ledger and stats views without dropping visible records

#### Scenario: AI text-first submit is unavailable offline
- **WHEN** the user submits natural-language composer text while Android cannot reach the server
- **THEN** Android preserves the composer text, shows a retry message, and does not create a local transaction

#### Scenario: AI confirmation is unavailable offline
- **WHEN** the user confirms returned AI drafts while Android cannot reach the server
- **THEN** Android preserves the edited confirmation drafts, shows a retry message, and does not create local transactions

#### Scenario: Committed AI transactions become local source records
- **WHEN** the server returns committed transactions after submit or confirmation
- **THEN** Android mirrors those committed transactions into the local store with backend identifiers so ledger and stats continue to render from local data
