# Voice AI Text First Entry Android Deferred Backup

This backup captures the Android-specific work that was originally tracked inside `openspec/changes/voice-ai-text-first-entry/` but is being deferred for later implementation.

## Deferred Task Group

Original source: `openspec/changes/voice-ai-text-first-entry/tasks.md`

### 2. Android Voice Entry Flow

- [ ] 2.1 Add local speech-to-text capture and microphone permission handling to the Android record-entry experience
- [ ] 2.2 Populate recognized text into the existing record composer and preserve manual editing before submit
- [ ] 2.3 Integrate Android submit flow with the new parse/commit API outcomes
- [ ] 2.4 Build Android confirmation UI for low-confidence or incomplete drafts before final commit
- [ ] 2.5 Add Android recovery states for STT failure, parse failure, and submit retry

## Deferred Design Notes

These notes were previously part of the shared change design and remain relevant when Android work resumes.

### Android Scope

- The original change was designed to support both Android and Web clients against the same server parse/commit contract.
- Android work should keep speech-to-text local on device and submit only text to the server.
- Android final submission should use the same `submit -> ready_to_commit | needs_confirmation | failed` contract as the web client.

### Android STT Notes

- Android STT behavior can differ across OEMs and OS versions, especially for accuracy, punctuation, number recognition, and offline support.
- The Android client must keep the composer editable after recognition.
- The Android client must route all final submissions through the same server parse/commit contract regardless of STT quality.

### Resume Guidance

- Reuse the existing server endpoints and draft schemas instead of introducing an Android-only parse format.
- Mirror the web confirmation behavior: low-confidence drafts should pause on confirmation instead of auto-committing.
- Preserve manual retry and text editing when STT fails or returns noisy text.
