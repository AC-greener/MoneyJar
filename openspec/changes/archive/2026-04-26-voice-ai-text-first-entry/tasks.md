## 1. Server Parse And Commit Contract

- [x] 1.1 Define request and response schemas for text submission, parse outcomes, confirmation payloads, and commit results in the server types/contracts layer
- [x] 1.2 Implement a Workers AI-backed parsing service that converts bookkeeping text into one or more normalized transaction drafts
- [x] 1.3 Add confidence and completeness evaluation that classifies results as `ready_to_commit`, `needs_confirmation`, or `failed`
- [x] 1.4 Implement authenticated server routes for submit-and-parse and confirmation-based commit flows
- [x] 1.5 Wire successful commit paths into the existing transaction persistence layer without bypassing validation

## 2. Android Voice Entry Flow

Deferred to backup: `backup/specs/voice-ai-text-first-entry-android-deferred.md`

## 3. Web Voice Entry Flow

- [x] 3.1 Add browser voice capture support where available and fall back cleanly to manual text entry
- [x] 3.2 Populate recognized text into the web composer and preserve user edits before submit
- [x] 3.3 Integrate web submit flow with the shared parse/commit API outcomes
- [x] 3.4 Build web confirmation UI for low-confidence or incomplete drafts before final commit
- [x] 3.5 Add web recovery states for browser STT failure, parse failure, and submit retry

## 4. Verification And Tuning

- [x] 4.1 Add server tests covering single-entry parse, multi-entry parse, confirmation-required responses, and safe failure behavior
- [x] 4.2 Add client tests for composer fill, editable voice text, direct commit success, and confirmation-required flows
- [x] 4.3 Instrument parse outcome logging so confidence thresholds and failure patterns can be tuned after rollout
- [x] 4.4 Document rollout expectations, fallback behavior, platform-specific STT limitations, and the flat category keyword expansion baseline
