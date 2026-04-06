# Implementation Plan: MoneyJar 记账页面增强

**Branch**: `001-voice-expense-tracking` | **Date**: 2026-04-06 | **Spec**: [spec.md](./spec.md)
**Input**: 完善记账页面，新增一个输入框，用户可以通过语音输入记账信息或者在输入框输入信息，输入完成之后，点击输入框旁边的按钮即可完成记账。

## Summary

增强 MoneyJar 记账页面，将原有的独立语音输入按钮改为组合输入框形式：文本输入框 + 语音输入按钮 + 提交按钮。用户可以在输入框中直接输入文字或通过语音输入，点击提交按钮后直接完成记账流程，无需额外的确认弹窗（高级确认仍可编辑）。

## Technical Context

**Language/Version**: TypeScript 5.x, React 19
**Primary Dependencies**: Vite 6, Tailwind CSS v4, React Router v7, Axios, Zustand, React Hook Form + Zod, Recharts, Day.js, Web Speech API
**Storage**: LocalStorage (offline queue), Cloudflare D1 (backend)
**Testing**: Vitest + React Testing Library
**Target Platform**: Web (H5, mobile-first)
**Project Type**: SPA (Single Page Application)
**Performance Goals**: <3s initial load, <500ms page transitions, 60fps interactions
**Constraints**: Offline-capable, responsive (mobile-first), accessibility (WCAG AA)
**Scale/Scope**: 3 pages (记账/统计/设置), ~50 components

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Gate | Status | Notes |
|------|--------|-------|
| Type Safety | ✅ PASS | TypeScript 5.x with strict mode, Zod runtime validation |
| Testing Coverage | ⚠️ INCOMPLETE | T019, T020 (voice parsing tests) pending |
| Offline-First | ✅ PASS | localStorage queue implemented in transactionStore |
| Error Handling | ✅ PASS | Error boundaries, user-friendly messages |
| Accessibility | ⚠️ PARTIAL | ARIA labels, keyboard nav pending (T051) |

**Violations Requiring Justification**: None identified

## Project Structure

### Documentation (this feature)

```text
specs/001-voice-expense-tracking/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Phase 0 output (2026-04-05)
├── data-model.md        # Phase 1 output (2026-04-05)
├── quickstart.md        # Phase 1 output (2026-04-05)
├── tasks.md             # Phase 2 tasks
└── contracts/           # Phase 1 output (API contracts)
```

### Source Code (repository root)

```text
frontend/
├── src/
│   ├── api/             # Axios API clients
│   │   ├── client.ts    # Axios instance with interceptors
│   │   ├── auth.ts      # Auth API
│   │   └── transaction.ts # Transaction API
│   ├── components/      # React components
│   │   ├── voice/       # VoiceInput component
│   │   ├── transaction/ # TransactionList, TransactionConfirmDialog
│   │   ├── charts/      # CategoryPieChart, TrendLineChart
│   │   ├── settings/    # UserProfile, SettingsMenu
│   │   └── common/      # Button, Input, Modal, ErrorBoundary
│   ├── pages/           # Page components
│   │   ├── RecordPage/  # 记账页 (主要改动)
│   │   ├── StatsPage/   # 统计页
│   │   └── SettingsPage/ # 设置页
│   ├── stores/          # Zustand stores
│   │   ├── authStore.ts
│   │   ├── transactionStore.ts
│   │   └── voiceInputStore.ts
│   ├── hooks/           # Custom hooks
│   │   └── useVoiceInput.ts
│   ├── types/           # TypeScript definitions
│   │   └── api.ts
│   └── utils/           # Utilities
│       ├── validation.ts # Zod schemas
│       └── format.ts    # Formatting helpers
├── tests/               # Vitest tests
│   ├── components/
│   ├── pages/
│   ├── stores/
│   └── hooks/
└── specs/               # Feature specifications
```

**Structure Decision**: 标准的 React SPA 结构，VoiceInput 组件保持独立但会在 RecordPage 中与输入框组合使用。

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| N/A | - | - |

---

## Enhancement Details

### Current State (as-is)

- RecordPage 有一个独立的 `VoiceInput` 组件（大圆形麦克风按钮）
- 语音输入后显示"识别成功"提示和"查看并确认交易"按钮
- 点击按钮后弹出 `TransactionConfirmDialog` 确认弹窗
- 没有直接的文本输入方式完成记账

### Target State (to-be)

**新的记账输入组件** (`ExpenseInput`):

```
┌─────────────────────────────────────────────────────────┐
│  [输入框: "今天午餐花了50元"]  🎤  │  提交  │           │
└─────────────────────────────────────────────────────────┘
```

- 输入框：支持手动输入和语音输入填充
- 麦克风按钮：点击开始语音识别，识别结果自动填充到输入框
- 提交按钮：解析输入框内容并直接创建交易（无需弹窗）
- 如果需要编辑，提交前可点击输入框进入编辑/确认模式

### User Flow

1. 用户在输入框中输入"今天午餐花了50元"或点击麦克风语音输入
2. 输入框内容实时显示
3. 点击"提交"按钮
4. 系统解析文本（前端 mock / 后端 LLM）
5. 交易直接创建成功，显示简短成功提示
6. 输入框清空，页面刷新交易列表

### Key Components to Create/Modify

1. **New `ExpenseInput` component** (`src/components/expense/ExpenseInput.tsx`)
   - Combined text input + voice button + submit button
   - Uses `useVoiceInput` hook for voice recognition
   - Integrates with `transactionStore.createTransaction`

2. **Modify `RecordPage`** (`src/pages/RecordPage/index.tsx`)
   - Replace `VoiceInput` section with `ExpenseInput`
   - Simplify flow: input → submit → success

3. **Update `voiceInputStore`** if needed
   - Add text input state management

### Data Flow

```
User Input (text/voice)
       ↓
ExpenseInput component
       ↓
parseVoiceText() [mock or API]
       ↓
transactionStore.createTransaction()
       ↓
API call or offline queue
       ↓
Success feedback → reset input
```

---

## Phase 0: Research (Complete)

**Status**: ✅ Research completed 2026-04-05

Research findings documented in `research.md`:
- React 19 + TypeScript + Vite 6 chosen
- Web Speech API for voice input
- Zustand for state management
- localStorage for offline queue
- Cloudflare Pages deployment

## Phase 1: Design & Contracts

**Status**: ✅ Design completed 2026-04-05

Artifacts already exist:
- `data-model.md` - Type definitions (User, Transaction, Category, VoiceParseResult)
- `contracts/` - API contracts
- `quickstart.md` - Development quickstart

### Additional Contracts for This Enhancement

**ExpenseInput Component Contract**:

```typescript
interface ExpenseInputProps {
  onSuccess?: () => void;  // Callback after successful submission
  disabled?: boolean;       // Disable input during submission
}
```

**Parse Voice Text Contract** (already in voiceInputStore):

```typescript
interface ParsedTransaction {
  type: 'income' | 'expense';
  amount: number;
  category: string;
  note?: string;
}
```

---

## Phase 2: Implementation Tasks

**Priority**: P1 (MVP core - Voice expense tracking enhancement)

### Tasks

- [ ] T055 [P] [US1] Create ExpenseInput component combining text input + voice button + submit
- [ ] T056 [P] [US1] Integrate useVoiceInput hook into ExpenseInput
- [ ] T057 [US1] Update RecordPage to use ExpenseInput instead of VoiceInput section
- [ ] T058 [US1] Add input field state management in voiceInputStore
- [ ] T059 [P] [US1] Write unit tests for ExpenseInput component
- [ ] T060 [P] [US1] Write integration tests for expense submission flow
- [ ] T061 [US1] Add success/error toast notification
- [ ] T062 [US1] Add keyboard support (Enter to submit, mic button focus)
- [ ] T063 [US1] Mobile responsive refinement for ExpenseInput

---

## Verification Plan

1. **Unit Tests**: `npm test` passes for ExpenseInput and voiceInputStore
2. **Component Tests**: VoiceInput button click triggers recognition, text appears in input
3. **E2E Flow**: Type/voice input → submit → transaction appears in list
4. **Offline**: Disconnect network → submit → transaction queued → reconnect → synced
5. **Accessibility**: Keyboard navigation works, ARIA labels present

---

## Open Questions / NEEDS CLARIFICATION

1. **LLM Parsing**: 前端 mock 还是调用后端 API？目前是 mock (`parseVoiceText` in RecordPage)
2. **Confirm Dialog**: 是否需要保留 TransactionConfirmDialog 作为可选的确认步骤？
3. **Multiple Transactions**: "午饭50、地铁6" 单次输入多条时如何处理？

**Recommended**: 保持当前 mock 解析（未来对接后端 LLM），简化流程为直接提交不弹窗。
