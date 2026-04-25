## 1. Server Parse And Commit Contract

- [ ] 1.1 Define request and response schemas for text submission, parse outcomes, confirmation payloads, and commit results in the server types/contracts layer
- [ ] 1.2 Implement a Workers AI-backed parsing service that converts bookkeeping text into one or more normalized transaction drafts
- [ ] 1.3 Add confidence and completeness evaluation that classifies results as `ready_to_commit`, `needs_confirmation`, or `failed`
- [ ] 1.4 Implement authenticated server routes for submit-and-parse and confirmation-based commit flows
- [ ] 1.5 Wire successful commit paths into the existing transaction persistence layer without bypassing validation

## 2. Android Voice Entry Flow

- [ ] 2.1 Add local speech-to-text capture and microphone permission handling to the Android record-entry experience
- [ ] 2.2 Populate recognized text into the existing record composer and preserve manual editing before submit
- [ ] 2.3 Integrate Android submit flow with the new parse/commit API outcomes
- [ ] 2.4 Build Android confirmation UI for low-confidence or incomplete drafts before final commit
- [ ] 2.5 Add Android recovery states for STT failure, parse failure, and submit retry

## 3. Web Voice Entry Flow

- [ ] 3.1 Add browser voice capture support where available and fall back cleanly to manual text entry
- [ ] 3.2 Populate recognized text into the web composer and preserve user edits before submit
- [ ] 3.3 Integrate web submit flow with the shared parse/commit API outcomes
- [ ] 3.4 Build web confirmation UI for low-confidence or incomplete drafts before final commit
- [ ] 3.5 Add web recovery states for browser STT failure, parse failure, and submit retry

## 4. Verification And Tuning

- [ ] 4.1 Add server tests covering single-entry parse, multi-entry parse, confirmation-required responses, and safe failure behavior
- [ ] 4.2 Add client tests for composer fill, editable voice text, direct commit success, and confirmation-required flows
- [ ] 4.3 Instrument parse outcome logging so confidence thresholds and failure patterns can be tuned after rollout
- [ ] 4.4 Document rollout expectations, fallback behavior, and any platform-specific STT limitations
