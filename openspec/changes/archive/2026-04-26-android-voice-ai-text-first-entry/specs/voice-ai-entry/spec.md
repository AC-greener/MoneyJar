## ADDED Requirements

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
