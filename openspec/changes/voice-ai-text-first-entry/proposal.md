## Why

MoneyJar already has a clear product direction around voice-based bookkeeping, but the current project state does not yet define a formal end-to-end contract for turning speech into committed transactions across Android, Web, and the server. We need that contract now so teams can build the voice entry flow without duplicating parsing rules in clients or guessing when a transaction should be auto-committed versus confirmed by the user.

## What Changes

- Add a text-first voice entry flow where client apps perform speech-to-text locally, place the recognized text into the record composer, and let the user edit before submission.
- Add a server-side parsing workflow on Cloudflare Workers AI that converts submitted bookkeeping text into structured transaction drafts.
- Add a confidence-based decision model on the server so high-confidence submissions can be committed directly while ambiguous submissions return a confirmation payload for user review.
- Add shared API contracts that both Android and Web clients can use for parse, confirm, and commit flows.
- Define error-handling and fallback behavior for speech recognition failure, parsing failure, and missing transaction fields.

## Capabilities

### New Capabilities
- `voice-ai-entry`: Client-facing voice bookkeeping flow that captures speech, fills editable text into the composer, submits text for parsing, and handles direct commit or confirmation-required results.
- `transaction-parse-commit-api`: Server-side capability for parsing bookkeeping text into structured transactions, scoring confidence, and either committing transactions or requesting user confirmation.

### Modified Capabilities

## Impact

- Affected code:
  - `android/` record-entry flow and repository integration
  - `frontend/` voice entry UI and API client wiring
  - `server/src/routes/` for parse and commit endpoints
  - `server/src/services/` for AI parsing, confidence handling, and transaction creation
- Affected APIs:
  - New or expanded server endpoints for parse/commit and confirmation handling
- Dependencies and systems:
  - Device speech-to-text on clients
  - Cloudflare Workers AI-backed parsing on the server
  - Existing transaction persistence and authentication flows
