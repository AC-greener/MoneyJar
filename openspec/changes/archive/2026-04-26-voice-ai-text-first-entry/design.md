## Context

MoneyJar already has product intent around voice bookkeeping, a separate frontend workspace, and a Hono-based server that owns business logic and persistence. What is missing is a shared technical contract for the text-first voice entry flow: the Web client needs to know how speech recognition feeds the composer, and the server needs a stable parsing and confirmation model it can enforce consistently.

This change spans multiple modules and introduces a user-visible decision boundary between parsing and committing. It also adds AI-specific behavior around confidence, ambiguity, and recovery, and it standardizes Cloudflare Workers AI as the server-side parsing engine, which makes an explicit design worthwhile before implementation.

## Goals / Non-Goals

**Goals:**
- Define a text-first voice entry architecture for the current Web client plus server rollout.
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
- Reintroducing Android client delivery in this phase.
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
- Perform parsing on the client. Rejected because it would create inconsistent business rules between client and server.

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

### Decision: Expand category recognition with a flat keyword dictionary
The server-side fallback parser will continue using a flat per-category keyword table in the near term, rather than introducing weighted scoring or multi-layer taxonomy rules. The goal is to improve direct-commit coverage for common spoken bookkeeping phrases while keeping the implementation easy to audit and tune.

Rationale:
- The current parsing issue is not that the fallback parser cannot infer intent at all; it is that common spoken nouns like "面" are missing from the category vocabulary and therefore fall below the auto-commit confidence threshold.
- A flat keyword table is easy to understand, extend, and regression-test during this phase of the product.
- The current category set is still small and stable enough that a more sophisticated scoring engine would add complexity before it adds proportionate value.

Alternatives considered:
- Introduce weighted keyword scoring immediately. Rejected for now because the product is still validating the base vocabulary and user language patterns.
- Introduce layered keyword classes such as strong/weak hints. Rejected for now because the immediate need is to improve coverage for obvious high-frequency nouns in the existing category set.

### Decision: Expand keywords around category vocabulary, not around memorized phrases
Keyword growth will be organized by category vocabulary and common spoken nouns, rather than by collecting whole example sentences one by one.

Rationale:
- Expanding by category keeps the dictionary coherent and reduces duplicate entries.
- Spoken bookkeeping language is compositional. Covering nouns such as "面", "米线", and "包子" is more scalable than storing many variants like "买面", "吃面", and "今天面钱".
- This approach maps well to the existing fallback parser, which already splits by segment and performs substring matches.

Implementation guidance:
- Prefer concrete nouns and merchant/context words over generic verbs.
- Treat verbs such as "买", "花", and "用了" as expense hints, not category evidence.
- Keep cross-category words conservative. If a token is too broad, leave it out rather than creating unstable auto-commit behavior.
- Grow the dictionary only within the existing default categories for this phase: `餐饮`, `交通`, `生鲜`, `购物`, `娱乐`, `医疗`, `投资`, and `工资`.

### Keyword Expansion Baseline
The first flat-dictionary expansion should cover the following high-frequency spoken terms.

#### 餐饮
- Focus: meals, drinks, staple foods, common dining contexts
- Suggested keywords: `午饭`, `晚饭`, `早餐`, `夜宵`, `吃饭`, `外卖`, `奶茶`, `咖啡`, `面`, `面条`, `拉面`, `米线`, `米粉`, `粉`, `包子`, `饺子`, `馄饨`, `盖饭`, `快餐`, `汉堡`, `炸鸡`, `火锅`, `烧烤`

#### 交通
- Focus: public transit, taxis, long-distance travel, driving costs
- Suggested keywords: `地铁`, `公交`, `打车`, `滴滴`, `出租车`, `网约车`, `高铁`, `火车票`, `机票`, `停车费`, `过路费`, `加油`

#### 生鲜
- Focus: ingredients, produce, food prep shopping
- Suggested keywords: `买菜`, `菜场`, `菜市场`, `蔬菜`, `水果`, `生鲜`, `肉`, `鸡蛋`, `海鲜`, `食材`

#### 购物
- Focus: retail, household goods, general shopping platforms
- Suggested keywords: `购物`, `超市`, `淘宝`, `京东`, `拼多多`, `买衣服`, `衣服`, `鞋`, `纸巾`, `牙膏`, `洗发水`, `日用品`, `生活用品`

#### 娱乐
- Focus: leisure, tickets, social activities
- Suggested keywords: `电影`, `KTV`, `唱歌`, `游戏`, `门票`, `桌游`, `演出`, `网吧`

#### 医疗
- Focus: hospitals, treatment, medicine
- Suggested keywords: `医院`, `药店`, `挂号`, `看病`, `买药`, `门诊`, `检查`, `体检`, `感冒药`

#### 投资
- Focus: wealth management and securities
- Suggested keywords: `基金`, `股票`, `理财`, `定投`, `加仓`, `买基`, `申购`

#### 工资
- Focus: salary and salary-like income
- Suggested keywords: `工资`, `薪水`, `月薪`, `奖金`, `收入`, `报销`, `发工资`, `发薪`, `工资到账`

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
3. Integrate Web frontend with the shared server contract where browser capabilities allow voice capture.
4. Roll out with conservative auto-commit thresholds and log parse/confirmation outcomes for tuning.
5. If parsing quality or latency is unacceptable, disable direct commit and force confirmation for all voice-originated submissions as a safe fallback.

## Rollout Expectations And Fallback Behavior

This change intentionally introduces a decision boundary between "parse" and "commit". Users should expect that submitting text does not always result in an immediate persisted transaction.

### Expected User-Visible Outcomes

- **Direct commit ("happy path")**: If the server returns `status=ready_to_commit`, clients treat the submission as committed and clear/reset the composer.
- **Confirmation required**: If the server returns `status=needs_confirmation`, clients show a confirmation UI (for example, a modal) to review and correct drafts, then call the confirm endpoint to commit. This is the expected behavior when confidence is below the auto-commit threshold or required fields are missing.
- **Parse failed**: If the server returns `status=failed`, clients preserve the text in the composer and offer retry/edit.

These three outcomes are part of the contract, not a temporary UX hack. The confirmation UI exists to prevent silent mis-bookkeeping.

### Server-Side Fallbacks

- **Workers AI enabled path**: When `WORKERS_AI_ENABLED=true` and the `AI` binding is available, the server attempts a Workers AI parse first.
- **Heuristic fallback**: If Workers AI is disabled or parsing throws, the server falls back to a heuristic parser (segment split + keyword/category inference + simple confidence scoring).
- **Conservative auto-commit**: The server uses a conservative auto-commit confidence threshold (`AUTO_COMMIT_CONFIDENCE_THRESHOLD=0.85` in `server/src/services/voice-transaction.service.ts`). Early rollout should expect a non-trivial share of `needs_confirmation` responses until prompts/thresholds and keywords are tuned with real usage data.

### Operational Rollback Knobs

- **Disable Workers AI**: Set `WORKERS_AI_ENABLED` to a non-`true` value to force the heuristic parser.
- **Force confirmations (safety mode)**: If confidence is mis-tuned or user trust is at risk, prefer a policy that routes more results to confirmation rather than auto-committing. In practice this can be achieved by raising the auto-commit threshold and/or treating more fields as "must-confirm" until the corpus improves.

## Platform-Specific STT Limitations (Client-Side)

This MVP keeps speech-to-text (STT) on-device/in-browser. As a result, STT availability and quality are platform-dependent and should be documented and expected during rollout.

### Web (Browser) STT Notes

- The web implementation relies on the Web Speech API (`SpeechRecognition` / `webkitSpeechRecognition`) and should be expected to work best on Chromium-based browsers.
- Some environments may fail due to permission denial, missing microphone devices, or transient "network" errors surfaced by the browser speech engine. The UI must always keep manual text entry available.
- Browsers that do not support Web Speech API should show a clear "not supported" message and never block the user from submitting typed text.

## Flat Category Keyword Expansion Baseline

The heuristic fallback parser uses a flat per-category keyword dictionary to improve "obvious" phrase coverage and reduce unnecessary confirmation prompts.

- Source of truth: `CATEGORY_KEYWORDS` in `server/src/services/voice-transaction.service.ts`
- Expansion rule: add high-frequency *nouns and domain terms* (for example `面`, `米线`, `包子`) instead of memorizing many sentence-level phrases.
- Safety rule: avoid overly broad tokens that could cause accidental mis-categorization. Prefer missing a match (leading to confirmation) over mis-classifying and auto-committing.
- Regression approach: each keyword expansion should be paired with a small set of parse tests (goldens) so direct-commit coverage improves without changing existing outcomes unexpectedly.

## Open Questions

- Which browser STT combinations should be treated as officially supported in the first implementation needs product confirmation.
- Exact confidence thresholds for auto-commit versus confirmation need empirical tuning after initial instrumentation.
- The initial Workers AI model choice for parsing needs to be selected during implementation based on structured-output quality and latency.
- Whether confirmation edits should resubmit the full draft or patch individual fields can be decided during implementation, as long as the server contract stays draft-oriented.
