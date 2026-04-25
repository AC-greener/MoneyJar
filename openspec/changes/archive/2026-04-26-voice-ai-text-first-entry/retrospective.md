# Voice AI Text First Entry Retrospective

This note captures the main issues, pitfalls, and lessons learned while delivering and closing `voice-ai-text-first-entry`.

## 1. OpenSpec Path Confusion Was Easy To Trigger

One recurring source of confusion was mixing the generic `changes/...` wording from discussion with the actual repository path `openspec/changes/...`.

What we learned:
- When discussing tasks with humans, it is easy to shorthand the path and accidentally omit the `openspec/` prefix.
- For follow-up work, use the full repo path in tickets and comments so people can jump directly to the right location.
- Archive operations make this more noticeable because files move from `openspec/changes/<name>/...` to `openspec/changes/archive/<date>-<name>/...`.

Recommendation:
- Prefer full paths in implementation notes and review comments, especially for OpenSpec artifacts.

## 2. "Submit" Does Not Always Mean "Persist"

The biggest product/UX misunderstanding during implementation was the assumption that tapping submit after entering text should always write directly to the backend.

What actually happened:
- The server contract intentionally distinguishes `ready_to_commit`, `needs_confirmation`, and `failed`.
- A confirmation modal is not a bug by itself. It is the expected safety gate when confidence is low or required fields are incomplete.
- This is especially visible for short, ambiguous bookkeeping text and for phrases that are not yet covered well by the fallback keyword dictionary.

What we learned:
- The submit button is better understood as "submit for parse and decision" rather than "force create transaction".
- This behavior has to be documented early, otherwise test users will reasonably assume the popup is an unexpected interruption.

Recommendation:
- Keep confirmation behavior explicit in product copy, QA scripts, and rollout notes.

## 3. Workers AI Needs A Real Fallback Path

Choosing Cloudflare Workers AI simplified platform alignment, but it also made it important to design for model unavailability, malformed output, and rollout toggles.

What we learned:
- The server should not assume Workers AI is always available or always returns clean JSON.
- A simple heuristic fallback is valuable not just as a backup, but also as an operational safety net when the AI binding is disabled or inference fails.
- Feature flags such as `WORKERS_AI_ENABLED` are important because they let us fall back without blocking the whole voice flow.

Recommendation:
- Keep the fallback parser healthy and tested even if Workers AI is the primary path.
- Treat "AI optional, contract stable" as a core design principle.

## 4. Flat Keyword Expansion Matters More Than It Looks

Early behavior showed that many "almost obvious" bookkeeping phrases still ended up in confirmation because the fallback parser lacked category nouns that users naturally speak.

Examples of the pattern:
- Food nouns like `面`, `米线`, and `包子` are much more useful than memorizing whole phrases.
- Generic verbs like `买` and `花` are useful for expense intent, but not strong enough to determine category safely.

What we learned:
- Coverage improves faster by expanding category vocabulary than by collecting sentence templates one by one.
- The keyword list should stay conservative. A false positive category that auto-commits is worse than sending the user through confirmation.

Recommendation:
- Grow keywords by category nouns and merchant/context words.
- Pair keyword expansion with regression tests so auto-commit behavior does not drift unexpectedly.

## 5. Web STT Is Good Enough For MVP, But Not Uniform

The web implementation uses the browser speech API, which made it possible to ship quickly, but it is inherently environment-dependent.

What we learned:
- `SpeechRecognition` / `webkitSpeechRecognition` support is not uniform across browsers.
- Permission denial, microphone availability, and browser-level network/STT errors are common enough that manual text entry must always remain first-class.
- The recognized text must stay editable because STT errors are normal, not exceptional.

Recommendation:
- Treat browser STT as a convenience layer on top of the text flow, not as the single source of truth.
- Keep QA focused on fallback states, not just the happy path.

## 6. Web And Android Should Not Be Forced Through The Same Delivery Timeline

The original change covered both Web and Android, but in practice the Web + server path moved faster and had clearer verification.

What we learned:
- Sharing one parse/commit contract across platforms is good.
- Shipping both clients in the same change made task tracking look incomplete even when the server and Web work were effectively done.
- Deferring Android into `backup/specs/voice-ai-text-first-entry-android-deferred.md` made the active scope clearer and let the current change close cleanly.

Recommendation:
- Reuse shared backend contracts across platforms, but split delivery tracking when platform readiness differs materially.

## 7. Documentation Closure Is Part Of The Work, Not Cleanup

Several late questions were not implementation bugs at all. They were missing documentation around confirmation behavior, fallback expectations, STT limitations, and task ownership.

What we learned:
- `4.4` looked optional at first, but it actually closed an important understanding gap.
- A small amount of rollout and behavior documentation can prevent repeated confusion during QA and future iterations.

Recommendation:
- Treat rollout expectations, fallback notes, and known platform limits as deliverables for AI-assisted features, not as optional polish.
