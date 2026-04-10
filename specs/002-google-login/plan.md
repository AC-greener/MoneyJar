# Implementation Plan: Google OAuth Login

**Branch**: `002-google-login` | **Date**: 2026-04-10
**Spec**: `/specs/002-google-login/spec.md` (来源: `google-login-plan.md`)
**Input**: Feature specification from `google-login-plan.md`

## Summary

为 MoneyJar 前端和服务端实现基于 Google OAuth 2.0 Authorization Code Flow 的登录体系。主方案采用"服务端发起授权跳转 → Google 回调到服务端 → 服务端完成 code exchange → 回跳前端完成会话恢复"的模式。Web 端不再直接获取 Google `id_token` 后调用 `/api/auth/google`，而是通过 redirect/callback 完成登录。服务端继续签发 MoneyJar 自有 `access_token` 与 `refresh_token`。

## Technical Context

**Language/Version**: TypeScript 5.x (服务端), React 19 (前端) | Kotlin (Android - 不在此功能范围)
**Primary Dependencies**: Hono.js, Drizzle ORM, Zod, jose, Cloudflare Workers, Vitest, React Router v7
**Storage**: Cloudflare D1 (SQLite) - 新增 `oauth_states`、`login_exchange_tokens` 表
**Testing**: Vitest + `@cloudflare/vitest-pool-workers` (服务端), React Testing Library (前端)
**Target Platform**: Cloudflare Workers (服务端), Web 浏览器 (前端)
**Project Type**: Web Service + Web Application (前后端分离)
**Performance Goals**: OAuth callback 响应 < 500ms
**Constraints**:
- `return_to` 仅允许站内相对路径
- exchange code 5分钟过期、一次性使用
- state 10分钟过期、一次性使用
- 正式 token 不出现在 URL 中

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

本项目 constitution.md 为模板，以下为适用于 MoneyJar 的核心原则：

| 原则 | 描述 | 合规性 |
|------|------|--------|
| I. 分层架构 | types → db → repositories → services → routes，单向依赖 | ✅ 符合 - OAuth state/exchange 存储遵循分层 |
| II. 类型安全 | Zod 校验所有输入，TypeScript 严格模式 | ✅ 符合 - 新增 Zod Schema 校验 |
| III. 测试先行 | 新功能必须包含测试 | ✅ 符合 - 需补齐服务端和前端测试 |
| IV. 中文注释 | 所有代码注释使用中文 | ✅ 符合 |
| V. Plan First | 复杂改动先创建步骤文档 | ✅ 符合 - 本计划书 |

## Project Structure

### Documentation (this feature)

```
specs/002-google-login/
├── plan.md              # 本文件
├── research.md          # 技术决策研究
├── data-model.md        # 数据模型设计
├── quickstart.md        # 实施快速指南
└── tasks.md             # 任务分解 (Phase 2 输出)
```

### Source Code (repository root)

```
server/src/
├── db/
│   └── schema.ts        # 新增 oauth_states, login_exchange_tokens 表
├── repositories/
│   └── oauth.repository.ts  # 新增 - OAuth state 和 exchange code CRUD
├── services/
│   └── auth.service.ts  # 扩展 - 新增 OAuth 流程方法
├── routes/
│   └── auth.route.ts    # 扩展 - 新增 /google/start, /google/callback, /exchange
├── types/
│   └── auth.ts          # 扩展 - 新增 Zod Schema
└── middlewares/
    └── user-auth.ts     # 无变更

frontend/src/
├── pages/
│   └── CallbackPage.tsx  # 新增 - /auth/callback 页面
├── stores/
│   └── authStore.ts     # 扩展 - 新增 completeOAuthLogin action
├── api/
│   └── auth.ts          # 扩展 - 新增 exchangeOAuthCode 方法
└── types/
    └── api.ts           # 扩展 - 新增类型定义
```

**Structure Decision**: 前后端分离架构，服务端使用 Cloudflare Workers，前端使用 React + Vite。遵循现有分层架构规范。

## Implementation Phases

### Phase 1: 数据库迁移

1. 在 `server/src/db/schema.ts` 新增 `oauth_states` 和 `login_exchange_tokens` 表
2. 运行 `pnpm db:generate` 生成迁移文件
3. 运行 `pnpm db:push` 推送 Schema 到本地 D1

### Phase 2: 服务端 OAuth 流程

1. 创建 `server/src/repositories/oauth.repository.ts` - OAuth state 和 exchange code CRUD
2. 扩展 `server/src/services/auth.service.ts` - 新增 `startOAuth`, `handleCallback`, `exchangeCode` 方法
3. 扩展 `server/src/types/auth.ts` - 新增 `GoogleStartQuerySchema`, `ExchangeCodeSchema`
4. 扩展 `server/src/routes/auth.route.ts` - 新增:
   - `GET /google/start` - 生成 state，重定向到 Google 授权页
   - `GET /google/callback` - 校验 state，exchange code，upsert user，签发 tokens，跳转回前端
   - `POST /exchange` - 验证 exchange code，返回正式 tokens

### Phase 3: 前端 Callback 页面

1. 创建 `frontend/src/pages/CallbackPage.tsx` - 处理 OAuth callback
2. 扩展 `frontend/src/stores/authStore.ts` - 新增 `completeOAuthLogin(exchangeCode)` action
3. 扩展 `frontend/src/api/auth.ts` - 新增 `exchangeOAuthCode(code)` 方法

### Phase 4: 登录入口替换

1. 找到前端未登录态占位组件
2. 替换为真实"使用 Google 登录"按钮
3. 按钮点击跳转到 `${VITE_API_BASE_URL}/api/auth/google/start?return_to=当前路径`

### Phase 5: 测试

1. 服务端单元测试 - OAuth state 生成/校验，exchange code 生成/消费
2. 服务端集成测试 - 完整 OAuth 流程
3. 前端测试 - callback 页面渲染，登录流程

## API Contract

### 新增端点

#### GET /api/auth/google/start

```
Query: { return_to?: string }  // 登录后跳转地址，默认 /
Response: 302 Redirect to Google Authorization URL
```

#### GET /api/auth/google/callback

```
Query: { code: string, state: string, error?: string }
Response: 302 Redirect to {return_to}?exchange_code={code}
Error: 302 Redirect to {return_to}?error={error_code}
```

#### POST /api/auth/exchange

```
Body: { code: string }
Response 200: { access_token, refresh_token, user }
Response 400: { error: [...] }  // Zod 校验失败
Response 401: { error: "无效的 exchange code" }  // code 不存在/已使用/过期
```

## Security Considerations

| 风险 | 缓解措施 |
|------|----------|
| CSRF (state 伪造) | state 使用 `crypto.randomUUID()` 随机生成，服务端存储校验 |
| Exchange code 盗用 | 5分钟过期 + 单次消费 + 绑定 userId |
| Open Redirect | `return_to` 仅允许相对路径，白名单验证 |
| Token 暴露 | 正式 tokens 仅通过 `POST /exchange` 返回，不出现在 URL |

## Complexity Tracking

> 本功能无需复杂度违规

## Dependencies

| 依赖 | 说明 |
|------|------|
| `jose` | Google ID Token 生产级签名校验 |
| Cloudflare D1 | OAuth state 和 exchange code 存储 |
| Google Cloud Console | OAuth Client 配置 (需人工配置) |
