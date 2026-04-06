<!--
Sync Impact Report
==================
Version Change: N/A → 1.0.0 (initial population)
Modified Principles: N/A (initial creation)
Added Sections:
  - Core Principles (5 principles populated)
  - Additional Constraints (Technology Stack Enforcement, Feature Extensibility)
  - Development Workflow (Constitution Compliance, Review Requirements)
  - Governance
Removed Sections: None
Templates Status:
  ✅ plan-template.md - Constitution Check section present (advisory, not constitution-specific)
  ✅ spec-template.md - No constitution-specific requirements to update
  ✅ tasks-template.md - Note: constitution mandates tests as NON-NEGOTIABLE; template says "OPTIONAL" - consider aligning
  ✅ checklist-template.md - General placeholder, no constitution references
  ⚠️ commands/*.md - No commands directory exists
Follow-up TODOs:
  - TODO: Consider updating tasks-template.md to clarify tests are mandatory per constitution
  - TODO: Constitution supersedes CLAUDE.md per Governance section Line 80
-->

# MoneyJar Constitution

## Core Principles

### I. Code Quality (NON-NEGOTIABLE)

- **Clean Architecture with DDD**: All code MUST follow Domain-Driven Design patterns with clear separation across Account, Transaction, Budget, and Analytics domains.
- **Type Safety**: Data classes on Android MUST strictly match服务端 JSON schema; no type coercion or silent data loss.
- **Dependency Management**: All version references MUST use `gradle/libs.versions.toml`; hardcoded version strings in `build.gradle.kts` are prohibited.
- **Kotlin Idioms**: Code MUST use Kotlin best practices including coroutines for async, sealed classes for state, and named parameters for clarity.

**Rationale**: MoneyJar follows a thin-client philosophy where Android handles UI/collection and Hono.js handles AI logic. Type-safe contracts prevent runtime crashes and simplify debugging.

### II. Testing Standards (NON-NEGOTIABLE)

- **Full Coverage Requirement**: All new features (Android or Hono) MUST include corresponding test cases before PR merge.
- **Unit Tests**: Placed in `app/src/test/`. MUST cover ViewModel state transitions and Repository logic.
- **Compose UI Tests**: Placed in `app/src/androidTest/`. MUST verify core interactions (e.g.,记账 button tap).
- **TDD Discipline**: For bug fixes, tests MUST fail before implementation; Red-Green-Refactor cycle MUST be followed.
- **Sync Updates**: When modifying existing logic, all affected tests MUST be updated to reflect new behavior.

**Rationale**: The瘦逻辑原则 means bugs in either Android or Hono can cause data inconsistency. Rigorous testing protects against regression.

### III. User Experience Consistency

- **Material3 Design System**: All UI components MUST use Jetpack Compose with Material3 theming from `ui/theme/`.
- **Edge-to-Edge**: `enableEdgeToEdge()` MUST be enabled; content MUST extend behind system bars with proper insets.
- **Consistent Navigation**: All screens MUST follow the same navigation patterns; haptic and visual feedback MUST be consistent.
- **Accessibility**: All interactive elements MUST have content descriptions; color contrast MUST meet WCAG AA standards.

**Rationale**: Consistent UX builds user trust. MoneyJar's voice-first interaction model requires predictable UI responses.

### IV. Performance Requirements

- **Frame Rate**: UI interactions MUST maintain 60fps; janky frames exceeding 16ms MUST be investigated and fixed.
- **Network Timeout**: OkHttp timeout for AI parsing calls MUST be set to 30 seconds minimum to accommodate LLM latency.
- **Offline-First**: Room Database MUST serve as local cache for cloud D1; app MUST function meaningfully without network.
- **Memory Bounds**: Image loading and caching strategies MUST prevent memory bloat on low-end devices (2GB RAM target).

**Rationale**: Mobile users experience variable network conditions. Performance directly impacts the "开口即记" (开口即记) vision of frictionless expense tracking.

### V. AI Collaboration Protocol

- **Thin-Logic Principle**: Android collects voice/image and displays results. Complex parsing (amount extraction, categorization) MUST be delegated to Hono's Vercel AI SDK.
- **Contract Adherence**: Android Data classes and Hono JSON schemas MUST remain synchronized; breaking changes require version bump and migration plan.
- **Error Transparency**: AI parsing failures MUST surface as user-friendly messages, not silent fallures.

**Rationale**: The edge AI approach enables sophisticated parsing without bloating the Android APK.

## Additional Constraints

### Technology Stack Enforcement

- **Min SDK**: 24 | **Target SDK**: 36
- **Network**: Retrofit 2 + OkHttp 4 only
- **Storage**: Room Database as D1 mirror
- **Voice**: ML Kit Speech Recognition v16.1.3 with `zh-CN` locale
- **Backend**: Hono.js with Vercel AI SDK (Google Gemini 1.5)

### Feature Extensibility

- **Feature Toggles**: Analytics modules (charts, forex, depreciation) MUST be decoupled via toggles, not conditional compilation.
- **Multiplatform Ready**: Repository and Network layers MUST use interfaces, not concrete Android classes, for future Kotlin Multiplatform migration.

## Development Workflow

### Constitution Compliance

- **Plan First**: Before writing code for features involving Retrofit/Hono integration, a plan MUST be created in `/plans/`.
- **Complexity Justification**: Any deviation from these principles (e.g., adding a 4th architecture layer) MUST be documented with rationale and rejection of simpler alternatives.
- **Verification Gate**: `./gradlew test` MUST pass before declaring work complete.

### Review Requirements

- **PR Checklist**: Reviews MUST verify: tests added/updated, no hardcoded versions, type safety maintained, offline behavior considered.
- **AI Integration**: Any changes to API contracts MUST include Hono schema update and corresponding Android model update.

## Governance

- **Supremacy**: This constitution supersedes all other development practices in CLAUDE.md or project docs. In case of conflict, this document prevails.
- **Amendment Procedure**: Changes require: (1) draft proposal in `/plans/`, (2) rationale with simpler-alternative rejection, (3) migration plan for breaking changes, (4) approval via PR review.
- **Versioning Policy**: Semantic versioning applies: MAJOR for backward-incompatible principle changes, MINOR for new principles, PATCH for clarifications.
- **Compliance Review**: All PRs MUST self-certify compliance; reviewers act as secondary validation.

**Version**: 1.0.0 | **Ratified**: 2026-04-05 | **Last Amended**: 2026-04-05
