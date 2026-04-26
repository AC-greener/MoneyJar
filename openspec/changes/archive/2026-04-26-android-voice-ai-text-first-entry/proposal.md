## Why

Android still has the deferred portion of the text-first voice bookkeeping work: the current native Record screen is a structured local form with a disabled "voice later" hint, while Web and server already support the shared `submit -> ready_to_commit | needs_confirmation | failed` parse/commit contract. Implementing Android now aligns the mobile experience with Web and lets users speak or type natural bookkeeping text while preserving the manual edit and confirmation safeguards learned from the previous Voice AI rollout.

## What Changes

- Replace the Android Record entry experience with a Web-aligned text-first composer that accepts both manual text and local speech-to-text results as the canonical submission payload.
- Add Android local speech-to-text capture with microphone permission handling and `zh-CN` recognition behavior, keeping recognized text editable before submission.
- Route Android submissions through the existing server voice transaction submit and confirm endpoints instead of introducing an Android-specific parse format.
- Add a dedicated Android confirmation screen for `needs_confirmation` responses, supporting review and correction of one or more returned drafts before final commit.
- Handle `ready_to_commit`, `needs_confirmation`, and `failed` outcomes explicitly, preserving source text on recoverable failures.
- Treat AI text-first submission as network-required: when offline or submit fails due to connectivity, preserve the composer text and prompt the user to retry after reconnecting rather than queuing unparsed text.
- Mirror committed server transactions into the local Android repository/Room data source so ledger and stats continue rendering from the local source of truth after successful online parse/commit.
- **BREAKING**: The primary Android Record entry UI changes from the current amount/category/note structured form to a text-first composer and confirmation flow.

## Capabilities

### New Capabilities

- `android-voice-ai-entry`: Native Android text-first voice/manual bookkeeping entry, including local STT, composer state, server submit outcomes, dedicated confirmation, and recovery states.

### Modified Capabilities

- `voice-ai-entry`: Extend the existing cross-client voice entry behavior with Android-native requirements for local STT, editable composer submission, and confirmation UX parity.
- `android-offline-first-auth-app`: Clarify how the online AI parse/commit flow coexists with the Android local source of truth: unparsed text is not queued offline, while committed transactions are mirrored locally after successful server confirmation.

## Impact

- Android UI: `RecordScreen`, app navigation, and new confirmation screen/components.
- Android state: `MoneyJarViewModel` or a dedicated record-entry ViewModel state machine for composer, STT, submit loading, confirmation, and recovery states.
- Android data: Retrofit DTOs/services for `/transactions/voice/submit` and `/transactions/voice/confirm`, repository methods, and local mirroring of committed transactions.
- Android platform: microphone permission flow and local speech recognition with `zh-CN`.
- Android tests: ViewModel state tests, repository/API mapping tests, and Compose UI tests for composer, permission/error states, and confirmation flow.
- Server API: no endpoint or schema changes expected; Android must conform to the existing voice transaction contract.
