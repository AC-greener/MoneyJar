# Tasks: MoneyJar 语音记账应用 (H5)

**Feature**: MoneyJar 语音记账应用
**Branch**: `001-voice-expense-tracking`
**Generated**: 2026-04-05
**Tech Stack**: React 19, TypeScript 5.x, Vite 6, Tailwind CSS v4, React Router v7, Axios, Zustand, React Hook Form + Zod, Recharts, Day.js
**Spec**: [spec.md](./spec.md)
**Plan**: [plan.md](./plan.md)

## Implementation Strategy

**MVP Scope**: User Story 1 (语音记账) - 核心语音记账功能
**Delivery**: 增量交付，每个用户故事完成后独立可测试

**Story Dependencies**:
- US1 (语音记账) - 独立，无依赖
- US2 (消费统计) - 依赖 US1 完成（需要交易数据）
- US3 (个人设置) - 独立，无依赖

**并行执行机会**:
- Setup 阶段任务可并行（不同文件）
- US1 的 UI 组件和 API 层可并行开发
- US2 和 US3 可并行（各自独立）

## Phase 1: Project Setup

**目标**: 初始化 React + Vite + TypeScript 项目，配置开发环境

- [x] T001 Create React + Vite + TypeScript project with `pnpm create vite`
- [x] T002 Configure Tailwind CSS v4 with mobile-first responsive design
- [x] T003 Setup ESLint 9 + Prettier with TypeScript support
- [x] T004 Configure path alias `@/` mapping to `src/` in tsconfig and vite
- [x] T005 Setup React Router v7 with page routes
- [x] T006 Create project directory structure per plan.md
- [x] T007 Configure environment variables in `.env.local` with VITE_TEST_TOKEN
- [x] T008 [P] Setup Vitest and React Testing Library

## Phase 2: Foundational Infrastructure

**目标**: 构建所有用户故事依赖的基础设施（API层、状态管理、认证）

- [x] T009 [P] Create TypeScript type definitions in `src/types/api.ts`
- [x] T010 [P] Implement Axios client with interceptors in `src/api/client.ts`
- [x] T011 [P] Create auth API module in `src/api/auth.ts`
- [x] T012 [P] Create transaction API module in `src/api/transaction.ts`
- [x] T013 [P] Implement authStore with Zustand in `src/stores/authStore.ts`
- [x] T014 [P] Implement transactionStore with Zustand in `src/stores/transactionStore.ts`
- [x] T015 [P] Create Zod validation schemas in `src/utils/validation.ts`
- [x] T016 [P] Create formatting utilities in `src/utils/format.ts`
- [x] T017 Implement token refresh logic and 401 handling in API client
- [x] T018 Setup offline storage queue for transactions in localStorage

## Phase 3: User Story 1 - 语音记账 (P1)

**目标**: 实现核心语音记账功能 - 语音输入、LLM转换、交易创建

**独立测试标准**: 用户能在30秒内完成从语音输入到记账成功的完整流程

### Tests

- [ ] T019 [P] [US1] Write unit tests for voice parsing logic
- [ ] T020 [P] [US1] Write component tests for VoiceInput component

### Implementation

- [x] T021 [P] [US1] Create VoiceInput component with Web Speech API in `src/components/voice/VoiceInput.tsx`
- [x] T022 [P] [US1] Create useVoiceInput hook in `src/hooks/useVoiceInput.ts`
- [x] T023 [P] [US1] Create voiceParseResultStore for managing parsing state
- [x] T024 [US1] Build RecordPage with voice input UI in `src/pages/RecordPage/index.tsx`
- [x] T025 [US1] Implement transaction confirmation dialog with edit capability
- [x] T026 [US1] Create transaction list display component in `src/components/transaction/TransactionList.tsx`
- [x] T027 [US1] Integrate transaction creation with transactionStore
- [x] T028 [US1] Implement error handling for voice recognition failures
- [x] T029 [US1] Implement offline queue: save failed transactions locally
- [x] T030 [US1] Add loading states and user feedback UI

## Phase 4: User Story 2 - 消费统计 (P2)

**目标**: 实现统计页面，图表展示消费数据

**独立测试标准**: 用户能在统计页面看到过去30天的消费数据聚合

### Tests

- [ ] T031 [P] [US2] Write unit tests for transaction aggregation logic
- [ ] T032 [P] [US2] Write component tests for StatsPage charts

### Implementation

- [x] T033 [P] [US2] Create CategoryPieChart component with Recharts in `src/components/charts/CategoryPieChart.tsx`
- [x] T034 [P] [US2] Create TrendLineChart component in `src/components/charts/TrendLineChart.tsx`
- [x] T035 [US2] Build StatsPage with chart containers in `src/pages/StatsPage/index.tsx`
- [x] T036 [US2] Implement period selector (week/month/3months) with Day.js
- [x] T037 [US2] Integrate summary API with transactionStore
- [x] T038 [US2] Handle empty state when no transaction data

## Phase 5: User Story 3 - 个人设置 (P3)

**目标**: 实现设置页面，用户管理个人信息和账户

**独立测试标准**: 用户能在设置页面完成信息修改和退出登录

### Tests

- [ ] T039 [P] [US3] Write component tests for SettingsPage

### Implementation

- [x] T040 [P] [US3] Create UserProfile component in `src/components/settings/UserProfile.tsx`
- [x] T041 [P] [US3] Create SettingsMenu component with menu items
- [x] T042 [US3] Build SettingsPage in `src/pages/SettingsPage/index.tsx`
- [x] T043 [US3] Implement profile edit with React Hook Form + Zod validation
- [x] T044 [US3] Integrate user info fetch and update with authStore
- [x] T045 [US3] Implement logout flow with token cleanup

## Phase 6: Polish & Cross-Cutting Concerns

**目标**: 完善细节，提升用户体验

- [x] T046 [P] Add global loading indicator with React Suspense
- [x] T047 [P] Implement error boundary for graceful error handling
- [ ] T048 Add responsive design refinements for tablet/desktop
- [ ] T049 Add haptic feedback and visual transitions
- [x] T050 Optimize performance: lazy load pages with React.lazy
- [ ] T051 Add accessibility attributes (ARIA labels, keyboard navigation)
- [ ] T052 Verify color contrast meets WCAG AA standards
- [ ] T053 Configure Cloudflare Pages deployment settings
- [ ] T054 Final E2E testing and bug fixes

## Dependency Graph

```
Phase 1 (Setup)
    │
    ▼
Phase 2 (Foundational) ─────────────────────────────────┐
    │                                                   │
    ├──► Phase 3 (US1 - 语音记账)                        │
    │                                                   │
    ├──► Phase 4 (US2 - 消费统计) ──────────────────────┤
    │                                                   │
    └──► Phase 5 (US3 - 个人设置) ──────────────────────┘
                                                            │
                                                            ▼
                                                    Phase 6 (Polish)
```

## Parallel Execution Examples

**Example 1**: Phase 2 foundational tasks
- T009, T010, T011 可并行执行（独立模块）
- T012, T013, T014 可并行执行（独立模块）

**Example 2**: US1 开发
- T021 (VoiceInput组件) 和 T022 (hook) 可并行
- T019 (测试) 和 T021-T023 (实现) 可并行

**Example 3**: US2 和 US3
- Phase 4 和 Phase 5 完全独立，可并行开发

## Summary

| 指标 | 数值 |
|------|------|
| **总任务数** | 54 |
| **Phase 1 (Setup)** | 8 任务 |
| **Phase 2 (Foundational)** | 10 任务 |
| **Phase 3 (US1 - 语音记账)** | 12 任务 |
| **Phase 4 (US2 - 消费统计)** | 8 任务 |
| **Phase 5 (US3 - 个人设置)** | 7 任务 |
| **Phase 6 (Polish)** | 9 任务 |
| **可并行任务** | ~50% |
| **MVP 建议** | Phase 1 + Phase 2 + Phase 3 (语音记账核心) |

## Checklist Format Validation

✅ 所有任务遵循 `- [ ] T### [P] [US#] Description @ filepath` 格式
✅ Task ID 连续编号 (T001 - T054)
✅ [P] 标记仅用于可并行任务
✅ [US#] 标签仅用于用户故事阶段任务
✅ 文件路径清晰明确
