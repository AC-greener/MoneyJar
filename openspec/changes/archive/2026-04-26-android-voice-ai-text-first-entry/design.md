## Context

The previous `voice-ai-text-first-entry` change delivered the shared server parse/commit contract and Web text-first experience, then deferred Android-specific work into `backup/specs/voice-ai-text-first-entry-android-deferred.md`. Android currently has a native shell with Record, Ledger, Stats, and Settings, and the Record screen is still a structured amount/category/note local form with a disabled voice hint.

The Android app also has an offline-first local persistence direction: Room remains the rendering source for ledger and stats, and authenticated sync layers on top of local records. This change deliberately introduces an online AI parse step for text-first voice/manual input. To keep the architecture honest, Android will not queue unparsed natural-language text while offline; it will preserve the composer text and ask the user to retry once network access is available.

## Goals / Non-Goals

**Goals:**

- Replace the Android primary Record entry UI with a Web-aligned text-first composer.
- Let users enter bookkeeping text by speaking or typing, then edit the composer text before submission.
- Use native Android speech recognition configured for `zh-CN` and handle microphone permission denial gracefully.
- Call the existing server `/transactions/voice/submit` and `/transactions/voice/confirm` contract from Android.
- Support all server outcomes: `ready_to_commit`, `needs_confirmation`, and `failed`.
- Provide a dedicated confirmation screen that can review and edit multiple transaction drafts.
- Mirror committed server transactions into local Room so ledger and stats stay local-source-of-truth views.
- Preserve composer text on offline/network submit failure without creating an offline parse queue.

**Non-Goals:**

- Do not add Android-only parse endpoints or server response shapes.
- Do not send raw audio to the server; only recognized or typed text is submitted.
- Do not implement offline AI parsing or queue unparsed text for later automatic submission.
- Do not change server fallback parser behavior or category keyword dictionaries in this Android change.
- Do not redesign Ledger, Stats, Settings, authentication, or sync beyond the minimal local mirroring needed after voice commit.

## Decisions

### Decision: Use the same text-first UI model as Web

Android Record becomes a natural-language composer with a microphone action and submit action. Recognized speech populates the composer instead of auto-submitting, and fully manual text follows the same server path.

Alternative considered: keep the existing structured amount/category/note form and map voice parse results back into fields. That would reduce UI churn but keep Android on a different product model from Web and make confirmation/multi-draft flows awkward. The text-first model is a cleaner long-term contract for shared Voice AI behavior.

### Decision: Create an Android-specific voice entry state boundary

The current `MoneyJarUiState` is shaped around structured local fields. This change should introduce a dedicated voice entry state model, either inside a focused Record entry ViewModel or as a nested state owned by `MoneyJarViewModel`, with explicit fields for composer text, source, speech capture state, submit loading, transient messages, confirmation drafts, and navigation events.

Alternative considered: add more fields directly to `MoneyJarUiState`. That is workable for a small patch, but the submit/confirm/STT state machine is large enough to benefit from a focused boundary and clearer tests.

### Decision: Use native STT as an input enhancer, not a persistence path

Android speech recognition runs locally on device using `zh-CN`. Its only output is editable text in the composer. Final submission always uses the current composer text, regardless of whether it came from speech, manual typing, or user edits after recognition.

Alternative considered: submit immediately after speech recognition. That would feel faster in the happy path but repeats the earlier product confusion where "submit" is mistaken for "always persist." Keeping the edit step protects against normal STT errors.

### Decision: Route `needs_confirmation` to a dedicated screen

When submit returns `needs_confirmation`, Android navigates to a confirmation route that receives or resolves the source text and returned drafts from app state. The screen presents each draft with editable required fields, missing-field indicators, and a confirm action that calls `/transactions/voice/confirm`. The design supports one or more drafts from the first implementation rather than hardcoding a single-draft dialog.

Alternative considered: use a bottom sheet. A bottom sheet is faster to build for one draft, but it becomes cramped for multiple drafts, field-level review, and future correction UX.

### Decision: Mirror server-committed records into Room

For `ready_to_commit` and successful confirm responses, Android maps `committedTransactions` into local `MoneyJarTransaction` records with `remoteId` populated and `syncState = SYNCED`. Ledger and stats continue to read from Room rather than rendering server responses directly.

Alternative considered: show committed results only from the server response. That would bypass the existing local-source architecture and risk temporary disagreement between Record, Ledger, and Stats.

### Decision: Treat offline submit as a retryable composer state

If Android cannot reach the server for submit or confirm, the app keeps the current composer or confirmation edits intact and shows a retry message. It does not create a transaction, does not enqueue the source text, and does not auto-submit later.

Alternative considered: store a queue of unparsed source texts. That sounds convenient, but it creates hard questions around stale context, user intent, duplicate submissions, and confirmation timing. For this phase, explicit retry is safer and easier to understand.

## Risks / Trade-offs

- [Risk] Replacing the structured form may surprise users who rely on amount/category fields. -> Mitigation: keep placeholder examples clear and make confirmation fields easy to edit when parsing is uncertain.
- [Risk] Android native speech recognition differs by device and OS version. -> Mitigation: treat STT as optional input, preserve manual typing, and test permission denial, no-speech, cancellation, and noisy transcript states.
- [Risk] Online AI parse conflicts with offline-first expectations. -> Mitigation: document that only parsed/committed transactions are mirrored locally; unparsed composer text is preserved for manual retry without creating hidden records.
- [Risk] Multi-draft confirmation can grow complex quickly. -> Mitigation: support a simple list of editable draft cards first, with required amount/category fields and conservative validation.
- [Risk] Local mirroring can duplicate records if the same committed response is handled twice. -> Mitigation: upsert or de-duplicate by `remoteId` when inserting server-committed transactions into Room.
- [Risk] Auth/session failures can surface during voice submit even when text entry looks valid. -> Mitigation: map unauthorized responses to a login-required recovery state and keep the composer text unchanged.
