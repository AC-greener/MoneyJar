## 1. Android Voice API Contract

- [x] 1.1 Add Kotlin serialization DTOs matching `VoiceTransactionSubmitSchema`, `VoiceTransactionConfirmSchema`, and `VoiceTransactionSubmitResponseSchema`
- [x] 1.2 Extend `TransactionApi` with `/api/transactions/voice/submit` and `/api/transactions/voice/confirm` suspend methods
- [x] 1.3 Add response mapping from committed voice transactions to local `MoneyJarTransaction` fields, including `remoteId` and `SyncState.SYNCED`
- [x] 1.4 Add repository method for inserting or updating committed remote transactions without duplicating existing `remoteId` records
- [x] 1.5 Add unit tests for DTO decoding across `ready_to_commit`, `needs_confirmation`, and `failed` responses

## 2. Record Entry State Machine

- [x] 2.1 Replace amount/category/note input state with text-first composer state for Android Record entry
- [x] 2.2 Model speech capture states for idle, requesting permission, listening, recognized text, cancelled, and failed
- [x] 2.3 Model submit states for idle, submitting, ready committed, needs confirmation, parse failed, network failed, and auth failed
- [x] 2.4 Preserve composer text on parse, network, timeout, and auth failures
- [x] 2.5 Clear composer text only after committed transactions are mirrored locally
- [x] 2.6 Add ViewModel tests for composer editing, submit success, needs-confirmation navigation state, failed parse, and offline retry behavior

## 3. Native Speech Capture

- [x] 3.1 Add Android microphone permission declaration and runtime permission handling for Record entry
- [x] 3.2 Implement local speech recognition with `zh-CN` language configuration
- [x] 3.3 Insert recognized text into the composer without auto-submitting
- [x] 3.4 Keep existing composer text unchanged when speech recognition fails or returns no usable text
- [x] 3.5 Add tests or fakes around speech recognition callbacks and permission denial states

## 4. Text-First Record UI

- [x] 4.1 Refactor `RecordScreen` from structured amount/category/note fields to a natural-language composer
- [x] 4.2 Add microphone, listening, submit, loading, success, and recoverable error UI states
- [x] 4.3 Keep manual text entry fully available when microphone permission is denied or speech recognition fails
- [x] 4.4 Update copy to make submit mean parse-and-decide, not guaranteed immediate persistence
- [x] 4.5 Add Compose UI tests for manual typing, speech-filled composer, edited recognized text, and offline retry message

## 5. Confirmation Flow

- [x] 5.1 Add a dedicated confirmation navigation route and screen for `needs_confirmation` responses
- [x] 5.2 Store source text and returned drafts in app state so the confirmation screen can survive navigation within the flow
- [x] 5.3 Render one or more editable draft cards with type, amount, category, note, occurred-at, confidence, and missing-field indicators
- [x] 5.4 Validate required amount and category fields before enabling final confirmation
- [x] 5.5 Call the confirm endpoint with corrected drafts and original source text
- [x] 5.6 Mirror confirmed transactions locally, return to Record, clear confirmed source text, and show success feedback
- [x] 5.7 Preserve draft edits and show retry feedback when confirmation fails because of network or timeout errors
- [x] 5.8 Add ViewModel and Compose tests for multi-draft review, missing-field validation, confirm success, and confirm retry

## 6. Local Mirroring And Existing Views

- [x] 6.1 Ensure `ready_to_commit` responses insert committed transactions into Room with backend identifiers
- [x] 6.2 Ensure successful confirmation responses insert committed transactions into Room with backend identifiers
- [x] 6.3 Ensure repeated handling of the same backend transaction id does not create duplicate ledger rows
- [x] 6.4 Verify Ledger and Stats update from local Room data after voice commit without reading directly from the submit response
- [x] 6.5 Add repository tests for committed transaction mirroring and duplicate `remoteId` handling

## 7. Recovery, Auth, And Rollout Notes

- [x] 7.1 Map unauthenticated or expired-session responses to a login-required recovery state while preserving composer or confirmation edits
- [x] 7.2 Document that Android AI text-first entry is network-required and does not queue unparsed source text offline
- [x] 7.3 Update deferred Android backup or related notes to point to this active OpenSpec change
- [x] 7.4 Ensure no dependency versions are hardcoded in Gradle files if speech or test dependencies are added

## 8. Verification

- [x] 8.1 Run `cd android && ./gradlew test`
- [x] 8.2 Run `cd android && ./gradlew build`
- [x] 8.3 Run targeted connected Compose tests if an emulator is available
- [ ] 8.4 Manually verify Record composer, microphone denial, successful submit, needs-confirmation flow, failed parse, and offline retry on Android
