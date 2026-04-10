---

description: "Task list for Google OAuth Login implementation"
---

# Tasks: Google OAuth Login

**Input**: Design documents from `/specs/002-google-login/`
**Prerequisites**: plan.md (required), research.md, data-model.md, quickstart.md

**Tests**: 测试任务已包含，符合 feature spec 要求

**Organization**: Tasks are grouped by user story to enable independent implementation and testing

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4)
- Include exact file paths in descriptions

---

## Phase 1: Setup (数据库迁移)

**Purpose**: 创建 OAuth 状态存储所需的数据库表

- [ ] T001 在 `server/src/db/schema.ts` 新增 `oauthStates` 表定义
- [ ] T002 在 `server/src/db/schema.ts` 新增 `loginExchangeTokens` 表定义
- [ ] T003 运行 `pnpm db:generate` 生成 Drizzle 迁移文件
- [ ] T004 运行 `pnpm db:push` 推送 Schema 到本地 D1

---

## Phase 2: Foundational (服务端 OAuth 核心)

**Purpose**: 实现 Google OAuth 授权流程的服务端逻辑，是所有用户故事的前置依赖

**⚠️ CRITICAL**: 服务端 OAuth 流程完成前，前端无法进行联调

### 服务端 - OAuth 仓库层

- [ ] T005 [P] 创建 `server/src/repositories/oauth.repository.ts` 实现 OAuth state CRUD
- [ ] T006 [P] 创建 `server/src/repositories/oauth.repository.ts` 实现 login exchange code CRUD

### 服务端 - Auth Service 扩展

- [ ] T007 [P] 在 `server/src/services/auth.service.ts` 新增 `startOAuth(returnTo)` 方法
- [ ] T008 [P] 在 `server/src/services/auth.service.ts` 新增 `handleGoogleCallback(code, state)` 方法
- [ ] T009 在 `server/src/services/auth.service.ts` 新增 `exchangeCode(code)` 方法
- [ ] T010 实现 Google ID Token 生产级签名校验 (使用 `jose` 库)

### 服务端 - Auth Types 扩展

- [ ] T011 [P] 在 `server/src/types/auth.ts` 新增 `GoogleStartQuerySchema`
- [ ] T012 [P] 在 `server/src/types/auth.ts` 新增 `ExchangeCodeSchema`

### 服务端 - Auth Routes 扩展

- [ ] T013 在 `server/src/routes/auth.route.ts` 新增 `GET /google/start` 端点
- [ ] T014 在 `server/src/routes/auth.route.ts` 新增 `GET /google/callback` 端点
- [ ] T015 在 `server/src/routes/auth.route.ts` 新增 `POST /exchange` 端点

**Checkpoint**: 服务端 OAuth 流程完整，可通过 curl/浏览器手动测试

---

## Phase 3: User Story 1 - OAuth 授权流程 (Backend) 🎯 MVP

**Goal**: 服务端完成 Google OAuth Authorization Code Flow 全流程

**Independent Test**: `curl "http://localhost:8787/api/auth/google/start"` 返回 302 重定向到 Google

### 实现

- [ ] T016 [P] [US1] 实现 `createOAuthState(returnTo)` 生成 state 并存储
- [ ] T017 [P] [US1] 实现 `validateAndConsumeState(state)` 校验并标记 state 已使用
- [ ] T018 [US1] 实现 Google token endpoint 交换 (`/oauth/token`)
- [ ] T019 [US1] 实现 `upsertUserFromGoogle(googleUser)` 用户创建/更新
- [ ] T020 [US1] 实现 `createExchangeToken(userId, tokens)` 生成一次性 exchange code
- [ ] T021 [US1] 实现 Open Redirect 防护 (`return_to` 只允许相对路径)

### 集成

- [ ] T022 [US1] 在 `server/src/routes/auth.route.ts` 连接 start → callback → exchange 全流程
- [ ] T023 [US1] 添加服务端错误处理和日志记录

---

## Phase 4: User Story 2 - 前端 Callback 页面 (Frontend)

**Goal**: 前端 callback 页面完成 exchange code 兑换和会话恢复

**Independent Test**: 访问 `/auth/callback?exchange_code=xxx` 能完成登录并跳转

### 前端 - Callback 页面

- [ ] T024 [P] [US2] 创建 `frontend/src/pages/CallbackPage.tsx` 页面组件
- [ ] T025 [P] [US2] 在 `frontend/src/App.tsx` 添加路由 `/auth/callback`
- [ ] T026 [US2] 实现 exchange code 解析和错误处理
- [ ] T027 [US2] 实现登录成功后跳转到 `return_to` 或默认 `/record`

### 前端 - Auth API 扩展

- [ ] T028 [P] [US2] 在 `frontend/src/api/auth.ts` 新增 `exchangeOAuthCode(code)` 方法
- [ ] T029 [P] [US2] 在 `frontend/src/types/api.ts` 新增 `ExchangeCodeRequest` 类型

### 前端 - Auth Store 调整

- [ ] T030 [US2] 在 `frontend/src/stores/authStore.ts` 新增 `completeOAuthLogin(exchangeCode)` action
- [ ] T031 [US2] 更新 `initialize()` 支持 callback 后会话恢复

---

## Phase 5: User Story 3 - 登录入口替换 (Frontend)

**Goal**: 将未登录态占位替换为真实 Google 登录按钮

**Independent Test**: 未登录用户访问任意页面能看到"使用 Google 登录"按钮

### 前端 - 登录入口

- [ ] T032 [P] [US3] 找到前端未登录态占位组件位置
- [ ] T033 [P] [US3] 创建 `frontend/src/components/LoginButton.tsx` 登录按钮组件
- [ ] T034 [US3] 替换所有未登录页面的占位为真实登录按钮
- [ ] T035 [US3] 按钮点击跳转到 `${VITE_API_BASE_URL}/api/auth/google/start?return_to=当前路径`

---

## Phase 6: User Story 4 - 测试 (Testing)

**Goal**: 补齐服务端和前端测试，确保 OAuth 流程可回归

**Independent Test**: `pnpm test` 和 `npm test` 全部通过

### 服务端测试

- [ ] T036 [P] [US4] 创建 `server/test/unit/oauth.service.test.ts` 测试 OAuth state 生成/校验
- [ ] T037 [P] [US4] 创建 `server/test/unit/oauth.service.test.ts` 测试 exchange code 生成/消费
- [ ] T038 [US4] 创建 `server/test/integration/auth.oauth.test.ts` 测试完整 OAuth 流程
- [ ] T039 [US4] 测试 state 无效/过期/重复使用时的错误处理

### 前端测试

- [ ] T040 [P] [US4] 创建 `frontend/src/tests/CallbackPage.test.tsx` 测试 callback 页面渲染
- [ ] T041 [P] [US4] 创建 `frontend/src/tests/LoginButton.test.tsx` 测试登录按钮跳转

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: 文档更新和最终验证

- [ ] T042 [P] 更新 `server/CLAUDE.md` 补充 OAuth 相关规范
- [ ] T043 [P] 更新 `frontend/CLAUDE.md` 补充 OAuth 相关规范
- [ ] T044 更新 `quickstart.md` 添加 OAuth 配置说明
- [ ] T045 运行完整 OAuth 流程手动测试验证
- [ ] T046 确保 `pnpm typecheck` 和 `npm run typecheck` 通过

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - 可立即开始
- **Foundational (Phase 2)**: 依赖 Phase 1 完成 - 阻塞所有用户故事
- **User Stories (Phase 3-6)**: 所有依赖 Phase 2 完成
  - US1 (Backend OAuth) → US2 (Callback) → US3 (Login Entry) 顺序实施
  - US4 (Testing) 可与 US1-US3 并行
- **Polish (Phase 7)**: 依赖所有用户故事完成

### User Story Dependencies

- **US1 (OAuth 授权流程)**: Phase 2 完成后即可开始 - 核心后端逻辑
- **US2 (Callback 页面)**: 依赖 US1 端点就绪 - 前端联调需要后端可用
- **US3 (登录入口)**: 可与 US2 并行开发 - 不依赖 US2 完成
- **US4 (测试)**: 依赖对应功能实现 - US1完成后可测试后端，US2/US3完成后可测试前端

### Within Each User Story

- Models/Types → Services → Routes
- Core implementation → Integration → Tests
- Story complete before moving to next priority

### Parallel Opportunities

- T005-T006: oauth.repository.ts 的两个表操作可并行
- T007-T008: auth.service.ts 的两个 OAuth 方法可并行
- T011-T012: types/auth.ts 的两个 Schema 可并行
- T024-T025, T028-T029, T032-T033, T036-T037, T040-T041: 均标记 [P] 可并行

---

## Parallel Example

```bash
# Phase 2 可并行任务:
Task T005: 创建 oauthStates repository
Task T006: 创建 loginExchangeTokens repository
Task T007: 实现 startOAuth service method
Task T008: 实现 handleGoogleCallback service method
Task T011: 新增 GoogleStartQuerySchema
Task T012: 新增 ExchangeCodeSchema
```

---

## Implementation Strategy

### MVP First (US1 Backend OAuth Only)

1. Complete Phase 1: Setup (T001-T004)
2. Complete Phase 2: Foundational (T005-T015) - **CRITICAL**
3. Complete Phase 3: US1 Backend OAuth (T016-T023)
4. **STOP and VALIDATE**: 手动测试 `curl` 完整 OAuth 流程
5. 部署/demo 服务端 OAuth 功能

### Incremental Delivery

1. Phase 1-2 完成 → 基础就绪
2. US1 完成 → 手动测试后端 OAuth → Demo
3. US2 完成 → 测试 callback 页面 → Demo
4. US3 完成 → 测试登录入口 → Demo
5. US4 完成 → 自动化测试覆盖 → 完整交付

---

## Summary

- **Total Tasks**: 46
- **User Stories**: 4 (US1: OAuth Backend, US2: Callback, US3: Login Entry, US4: Testing)
- **Parallelizable Tasks**: 18 (marked with [P])
- **MVP Scope**: Phase 1-3 (US1 Backend OAuth) - 可独立运行和测试

**建议实施顺序**: Phase 1 → Phase 2 → Phase 3 (US1) → 手动验证 → 继续 US2/US3/US4
