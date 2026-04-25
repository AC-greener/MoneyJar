## Context

MoneyJar already has product intent around voice bookkeeping, a native Android shell, a separate frontend workspace, and a Hono-based server that owns business logic and persistence. What is missing is a shared technical contract for the text-first voice entry flow: clients need to know how speech recognition feeds the composer, and the server needs a stable parsing and confirmation model that Android and Web can both consume.

This change spans multiple modules and introduces a user-visible decision boundary between parsing and committing. It also adds AI-specific behavior around confidence, ambiguity, and recovery, and it standardizes Cloudflare Workers AI as the server-side parsing engine, which makes an explicit design worthwhile before implementation.

## Goals / Non-Goals

**Goals:**
- Define a text-first voice entry architecture that works for both Android and Web clients.
- Keep speech-to-text client-side so raw audio does not have to be uploaded for the MVP flow.
- Centralize natural-language bookkeeping parsing on the server so parsing rules do not diverge across clients.
- Standardize server-side parsing on Cloudflare Workers AI so the deployment stack stays aligned with the existing Hono + Cloudflare runtime.
- Separate parse-time draft generation from final transaction commit so low-confidence results can be confirmed safely.
- Standardize API responses for three outcomes: direct commit, confirmation required, and parse failure.
- Preserve compatibility with the existing transaction persistence model and authenticated request flow.

**Non-Goals:**
- Continuous voice conversation or financial assistant chat.
- Server-side speech recognition or audio storage.
- Full redesign of transaction categories, analytics, or account systems.
- Replacing the existing Android shell or repository boundaries.
- Building a general-purpose multimodal AI pipeline for receipts or images in this change.

## Decisions

### Decision: Use a text-first client flow
Clients will handle microphone permission, audio capture, and speech-to-text locally, then place the recognized text into the existing record composer before any server call is made.

Rationale:
- Lets users review and edit what was recognized before spending a server-side AI call.
- Keeps bandwidth and privacy exposure lower than uploading raw audio.
- Fits the existing architecture direction where clients gather input and the server owns business interpretation.

Alternatives considered:
- Upload audio to the server for ASR and parsing. Rejected for MVP because it increases latency, privacy sensitivity, storage complexity, and implementation scope.
- Perform parsing on the client. Rejected because it would create inconsistent business rules between Android and Web.

### Decision: Use Cloudflare Workers AI for server-side parsing
The parsing service will run inside the Hono server on Cloudflare Workers and call Workers AI for bookkeeping intent extraction and draft generation.

Rationale:
- Keeps inference on the same platform as the existing server runtime, reducing integration sprawl.
- Simplifies deployment, secrets management, and observability by staying within the Cloudflare stack.
- Aligns AI parsing with the project's current direction around Workers, D1, and edge execution.

Alternatives considered:
- Use an external model provider through a separate SDK. Rejected because it adds vendor coordination and drifts from the selected Cloudflare-first backend direction.
- Delay the provider choice. Rejected because the user has explicitly chosen Workers AI and the contract should reflect that decision.

### Decision: Split parse and commit into separate server outcomes
The server will treat submitted text as a request to parse bookkeeping intent. The parse result can either be committed immediately, returned as a confirmation-required draft, or rejected as a failure. Even when the client calls a single submit action, the server response model will preserve this distinction.

Rationale:
- Prevents ambiguous text from silently creating incorrect transactions.
- Makes the confirmation UX explicit and reusable across clients.
- Allows confidence and completeness policies to evolve without changing client capture behavior.

Alternatives considered:
- Always auto-commit after parsing. Rejected because bookkeeping errors are costly and difficult to detect later.
- Always require confirmation. Rejected because it adds friction to the happy path and weakens the value of AI assistance.

### Decision: Normalize parser output as transaction drafts
The parsing service will return one or more transaction draft objects with normalized fields such as amount, direction, category, note, occurredAt, confidence, and missingFields. Commit logic will consume the same draft format.

Rationale:
- Supports single-sentence multi-transaction input like "午饭50，地铁6".
- Gives clients one stable payload to render whether the result is immediately committable or needs follow-up.
- Keeps AI output isolated from persistence entities until validation passes.

Alternatives considered:
- Return database-ready transaction entities directly. Rejected because parser output is often partial or probabilistic.
- Return only free-form AI text and let clients interpret it. Rejected because it pushes business logic to clients.

### Decision: Use confidence and completeness gates on the server
The server will decide whether a parse result is `ready_to_commit`, `needs_confirmation`, or `failed` based on field completeness, confidence thresholds, and validation checks.

Rationale:
- Concentrates trust decisions in one place.
- Allows tuning over time without shipping new client logic.
- Supports future observability and analytics on parse quality.

Alternatives considered:
- Let clients decide based on raw confidence scores. Rejected because clients should not encode business thresholds.

### Decision: Keep client composer as the source of submitted text
Once STT fills the input field, the editable composer value becomes the canonical submission payload. The server will not distinguish whether the final text originated from voice or manual edits except through optional metadata.

Rationale:
- Matches the intended UX where users may revise the recognized text before submitting.
- Simplifies input handling by treating voice as a faster way to fill the same composer.
- Avoids coupling parsing quality to a transient raw STT result that the user has already corrected.

Alternatives considered:
- Submit both original STT text and edited text as separate first-class inputs. Rejected for MVP because it complicates contracts and decision rules with limited user benefit.

## Risks / Trade-offs

- [Device STT quality differs across platforms] → Keep the composer editable, preserve the final submitted text, and design parser prompts around noisy input.
- [Confidence thresholds may initially be mis-tuned] → Start with conservative auto-commit rules, log parse outcomes, and adjust thresholds with real usage data.
- [Multi-transaction parsing can create partially valid results] → Return per-draft confidence and missing-fields metadata so clients can confirm only the uncertain parts.
- [Different clients may present confirmation UX inconsistently] → Define a shared response contract and minimum client behaviors in the capability specs.
- [Users may assume submit always commits] → Surface an explicit “needs confirmation” state in client flows and keep direct-commit behavior only for high-confidence results.
- [AI parsing adds latency to submit] → Optimize prompt size, use a fast Workers AI model tier for parse requests, and keep client-side loading states scoped to the submit action.
- [Workers AI model behavior may differ from external LLMs] → Keep parser output schema-driven, add golden-path tests, and tune prompts against real bookkeeping examples before broad rollout.

## Migration Plan

1. Add the new parse/commit contracts and specs without changing existing shell navigation.
2. Implement a Workers AI-backed parsing service and route responses behind authenticated endpoints.
3. Integrate Android record entry flow with local STT, composer fill, submit, and confirmation handling.
4. Integrate Web frontend with the same server contract where browser capabilities allow voice capture.
5. Roll out with conservative auto-commit thresholds and log parse/confirmation outcomes for tuning.
6. If parsing quality or latency is unacceptable, disable direct commit and force confirmation for all voice-originated submissions as a safe fallback.

## Open Questions

- Which device STT provider each client will use in the first implementation remains a platform-specific choice.
- Exact confidence thresholds for auto-commit versus confirmation need empirical tuning after initial instrumentation.
- The initial Workers AI model choice for parsing needs to be selected during implementation based on structured-output quality and latency.
- Whether confirmation edits should resubmit the full draft or patch individual fields can be decided during implementation, as long as the server contract stays draft-oriented.
