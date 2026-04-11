# Google Login Plan

## Summary

为 MoneyJar 的 frontend 和 server 接入基于 Google OAuth 2.0 Authorization Code Flow 的登录体系，主方案采用“服务端发起授权跳转、Google 回调到服务端 callback、服务端完成 code exchange 与用户登录、再回跳前端完成会话恢复”的模式。Web 端不再直接获取 Google `id_token` 后调用 `/api/auth/google`，而是通过 redirect/callback 完成登录。服务端继续签发 MoneyJar 自有 `access_token` 与 `refresh_token`，后续业务接口仍由 Hono `jwt()` 中间件保护。

该方案优先服务 Web 正式登录体验，并为未来 Android 保留单独的原生登录链路，不强行复用 Web callback 机制。整体目标是让 Web 和 Android 最终共享同一套用户模型、同一套会话体系、同一套服务端鉴权逻辑，但允许客户端登录入口形态不同。

## Current State

当前仓库已经具备部分认证基础设施，但登录链路与目标方案仍有明显差距：

- 前端已有 `authApi.googleLogin(idToken)` 和 `authStore.loginWithGoogle(idToken)`，当前设计是“前端拿 `id_token` 直传服务端”
- 服务端已有 `POST /api/auth/google`、用户 `google_id` 字段、refresh token 机制和 JWT 鉴权中间件
- 服务端当前 `verifyGoogleIdToken()` 仍是简化实现，只校验 payload 中的 `aud`、`iss`、`exp`，未做生产级签名验签
- 前端当前没有真正可用的 Google 登录入口，也没有 callback 页面、state 管理或 OAuth 跳转逻辑
- 当前未登录态页面只展示占位提示，不具备真实登录动作

因此，这次改造不是“补一个登录按钮”，而是把现有“直传 `id_token`”方案重构为“服务端控制 OAuth redirect/callback”的完整登录系统。

## Target Architecture

### Web Login Flow

Web 端采用标准 Authorization Code Flow，完整链路如下：

1. 用户在前端点击“使用 Google 登录”
2. 前端跳转到服务端 `GET /api/auth/google/start`
3. 服务端生成 `state`、记录登录事务、重定向到 Google 授权页
4. 用户在 Google 完成授权
5. Google 回调到服务端 `GET /api/auth/google/callback`
6. 服务端校验 `state`，使用 `code` 向 Google token endpoint 换取 token
7. 服务端校验 Google 返回的 ID token 和用户身份
8. 服务端 upsert 用户，并签发 MoneyJar 自有 `access_token` 和 `refresh_token`
9. 服务端生成一次性登录交换码，302 跳转回前端 callback 页面
10. 前端 callback 页面调用 `POST /api/auth/exchange`
11. 服务端返回正式 `access_token`、`refresh_token` 和 `user`
12. 前端写入本地认证状态并跳转回业务页面

### Session Model

本次不切换到 cookie-session 为中心的会话模型，继续沿用当前设计：

- `access_token`：短期 JWT，用于业务接口 Bearer 鉴权
- `refresh_token`：长期随机字符串，服务端持久化并支持吊销
- `/api/auth/refresh`：用于 access token 续签
- `/api/auth/logout`：用于 refresh token 吊销
- `/api/auth/me`：用于获取当前登录用户信息

### Why This Architecture

选择该方案的原因：

- 适合 Web 正式登录体验，符合标准 Google OAuth redirect/callback 模式
- 服务端统一控制授权回调、状态校验和安全边界
- 与现有 JWT + refresh token 体系兼容，不需要整体重写鉴权模型
- 避免把 access token、refresh token 暴露在 URL 中
- 能够为未来 Android 保留独立的原生登录接口，而不是强迫 Android 复用 Web callback

## Public API Changes

### New Auth Endpoints

新增以下服务端接口：

#### `GET /api/auth/google/start`

用途：

- 作为 Google 登录起点
- 生成 `state`
- 记录登录事务
- 重定向到 Google 授权页

可选 query 参数：

- `return_to`

约束：

- `return_to` 只能是站内相对路径，或通过白名单校验的安全目标地址
- 不允许任意外部 URL，避免 open redirect

#### `GET /api/auth/google/callback`

用途：

- 接收 Google OAuth 回调
- 读取 `code` 与 `state`
- 校验 state 和登录事务
- 使用 authorization code 向 Google 换 token
- 完成 Google 用户校验和本地登录
- 302 跳回前端 callback 页面

输入参数：

- `code`
- `state`
- Google 失败回调场景下可能出现的 `error`

输出行为：

- 成功时跳转到前端 callback 页面并附带一次性交换码
- 失败时跳转到前端 callback 页面并附带稳定错误码

#### `POST /api/auth/exchange`

用途：

- 前端 callback 页面使用一次性交换码换取正式登录结果

请求体：

```json
{
  "code": "string"
}
```

响应：

```json
{
  "access_token": "string",
  "refresh_token": "string",
  "user": {
    "id": "uuid",
    "email": "string",
    "name": "string | null",
    "avatarUrl": "string | null",
    "plan": "free | pro"
  }
}
```

安全要求：

- `code` 必须为短期有效、单次消费
- 交换成功后立即失效

### Existing Endpoints

以下接口继续保留并保持兼容：

- `GET /api/auth/me`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`

### Existing `POST /api/auth/google`

当前仓库中已有：

- `POST /api/auth/google`

该接口本次不再作为 Web 主登录路径使用。建议处理方式如下：

- Web 前端停止调用该接口
- 服务端可以暂时保留该接口
- 将其定位为未来 Android 原生登录的专用 token-exchange 接口

这样可以避免后续 Android 需要再额外设计一套新的服务端登录协议。

## Frontend Changes

### Login Entry

前端需要新增真实登录入口，不能继续停留在占位提示阶段。建议实现为：

- 在未登录态统一显示“使用 Google 登录”按钮
- 按钮点击后直接跳转到 `${VITE_API_BASE_URL}/api/auth/google/start`
- 如当前页面是业务页面，可携带 `return_to`

未登录态至少需要覆盖：

- 记账页
- 统计页
- 设置页

要求所有未登录页面都能到达同一个登录入口，而不是各自展示不同的静态说明卡片。

### Callback Page

前端需要新增 callback 页面，例如：

- `/auth/callback`

职责如下：

- 读取 URL 中的登录交换参数
- 若存在成功 code，则调用 `POST /api/auth/exchange`
- 若存在错误码，则展示错误信息
- 交换成功后写入 `access_token`、`refresh_token`
- 更新 `authStore`
- 跳转回 `return_to` 或默认 `/record`

该页面需要有以下 UI 状态：

- 登录处理中
- 登录成功后即将跳转
- 登录失败，可点击重新登录

### Auth Store Adjustments

`authStore` 需要调整为适配 redirect/callback 模型：

- 保留当前 `initialize()`、`logout()`、`fetchCurrentUser()`
- `loginWithGoogle(idToken)` 不再作为 Web 正式入口
- 新增 callback 完成动作，例如：
  - `completeOAuthLogin(exchangeCode)`
  - 或等价命名的 action

新的 store 流程应支持：

- callback 页面完成 exchange 后设置登录态
- 正常刷新页面后依赖 refresh token 恢复会话
- 登录失败时清理本地残留 token 与错误状态

### API Layer Adjustments

前端 `authApi` 需要新增：

- `exchangeOAuthCode(code: string)`

并更新职责划分：

- `googleLogin(idToken)` 不再由 Web 调用
- `getTestToken()` 继续只用于开发和测试
- `getCurrentUser()`、`logout()` 继续保留

### Routing

前端路由需要新增：

- `/auth/callback`

同时对现有访问策略做统一：

- 不强制全局路由守卫
- 但所有未登录页面都必须有清晰、真实的登录入口
- callback 页面必须能独立渲染和恢复会话，不依赖用户先进入某个业务页面

## Server Changes

### Auth Routes

服务端 `auth.route.ts` 需要从“单一路由处理 Google token 登录”升级为“完整 OAuth 路由组”，至少包含：

- `GET /google/start`
- `GET /google/callback`
- `POST /exchange`

当前已有的：

- `POST /google`
- `POST /refresh`
- `POST /logout`
- `GET /me`
- `POST /test-token`

其中：

- `/refresh`、`/logout`、`/me` 保持不变
- `/test-token` 保持开发/测试用途
- `/google` 改为非 Web 主路径

### OAuth Transaction Storage

服务端需要新增短期登录事务存储，用于管理：

- OAuth `state`
- 可选 `nonce`
- `return_to`
- 一次性 exchange code

推荐新增独立表或短期存储结构，记录：

- `id`
- `type`
- `state` 或 `exchange_code`
- `return_to`
- `payload`
- `created_at`
- `expires_at`
- `used_at`

该存储必须支持：

- 过期判断
- 单次消费
- 幂等失败
- 清理机制

如果为了实现简洁，也可以拆成两类表：

- `oauth_states`
- `login_exchange_tokens`

无论采用单表还是双表，计划要求必须满足“过期 + 单次消费 + 可清理”。

### Google Token Exchange

服务端 callback 阶段需要：

1. 使用 authorization code 调用 Google token endpoint
2. 获取 token 响应
3. 验证 Google 返回的 ID token
4. 提取用户身份字段

必须校验：

- `aud`
- `iss`
- `exp`
- 必要 claims，如 `sub`、`email`

由于这是 redirect/callback 服务端模式，必须使用生产级签名校验，不能继续使用当前“只解析 payload”的简化版本。

### User Upsert

继续沿用当前用户表与仓库层能力：

- `users.google_id` 作为唯一标识
- 首次登录自动注册
- 重复登录更新 `email`、`name`、`avatarUrl`

当前 `user.repository.ts` 的 upsert 逻辑可继续复用。

### Session Issuance

Google 回调校验成功后：

- 签发短期 `access_token`
- 生成长期 `refresh_token`
- 记录 refresh token
- 生成一次性交换码
- 重定向前端 callback 页面

不要在 URL 中直接传回：

- `access_token`
- `refresh_token`

这些正式凭据只能通过后续 `POST /api/auth/exchange` 返回。

### Hono Middleware Strategy

推荐保留现有中间件策略：

- 业务接口继续使用 Hono 内置 `jwt()` 中间件
- `user-auth` 中间件继续负责把 JWT payload 映射到 `c.var.user`
- Google 登录本身不使用第三方 session 型 OAuth 中间件主导流程

不推荐使用 Hono 第三方认证中间件作为本方案核心实现，原因：

- 当前项目已经有自有 JWT + refresh token 模型
- callback、state、return_to、exchange code 需要细粒度控制
- 未来 Android 还要保留独立原生登录链路

## Security Requirements

### State Validation

必须对 OAuth `state` 做严格校验：

- 随机生成
- 绑定到服务端登录事务
- 有明确过期时间
- 只能使用一次

以下情况必须拒绝登录：

- state 缺失
- state 不匹配
- state 已过期
- state 已被消费

### Exchange Code Security

一次性交换码必须满足：

- 短期有效
- 单次消费
- 与具体登录事务绑定
- 成功换取正式登录凭据后立即失效

### Open Redirect Protection

`return_to` 必须做严格限制：

- 推荐只允许相对路径
- 或使用服务端白名单

禁止将任意外部 URL 原样带入跳转链路。

### Token Exposure Rules

正式登录凭据不得通过以下方式传递：

- URL query
- URL fragment
- 明文回跳参数

只允许通过受控的 `POST /api/auth/exchange` 返回。

### Error Handling

对用户返回的错误应保持稳定、通用，不暴露内部细节。服务端日志中可区分：

- Google 授权失败
- state 校验失败
- code exchange 失败
- Google token 校验失败
- exchange code 无效或过期

## Environment and Configuration

### Server Environment Variables

服务端需要明确以下配置：

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI`
- `JWT_SECRET`
- `TEST_AUTH_TOKEN`
- `ENVIRONMENT`

### Frontend Environment Variables

前端至少需要：

- `VITE_API_BASE_URL`

如果前端需要拼接自身 callback 页面或构建跨环境链接，也可以增加：

- `VITE_APP_BASE_URL`

### Google Cloud Console Setup

需要为 Web OAuth Client 配置：

- Authorized redirect URI
- Authorized JavaScript origins

建议按环境明确列出：

- Local
- Staging
- Production

文档中必须写清每个环境对应的 callback URL，避免环境串配。

## Android Compatibility

由于你已经明确 Web 要采用 redirect/callback，本计划对 Android 的处理策略是“分链路、同会话模型”。

### Web

使用：

- Google OAuth redirect/callback

### Android

未来建议使用：

- Android 原生 Google Sign-In
- 或 Android Credential Manager 获取 Google `id_token`
- 调用保留的 `POST /api/auth/google`

### Shared Backend Responsibilities

无论 Web 还是 Android，服务端最终共享：

- 同一个 `users` 表
- 同一个 `google_id` 用户识别规则
- 同一个 access token 签发逻辑
- 同一个 refresh token 持久化与吊销逻辑
- 同一个后续业务 JWT 鉴权体系

这意味着两端登录入口不同，但登录后会话模型完全一致。

## Implementation Sequence

建议按以下顺序实施：

1. 设计并落地服务端 OAuth 事务存储
2. 新增 `/api/auth/google/start`
3. 新增 `/api/auth/google/callback`
4. 实现 Google token endpoint 交换与生产级 ID token 校验
5. 新增 `/api/auth/exchange`
6. 完成前端 callback 页面
7. 将未登录态统一替换为真实登录入口
8. 停止 Web 调用 `authApi.googleLogin(idToken)`
9. 保留或重命名 `POST /api/auth/google` 为未来 Android 路径
10. 补齐测试、文档和联调说明

## Test Plan

### Frontend Tests

需要覆盖：

- 登录按钮会跳转到 `/api/auth/google/start`
- callback 页面在收到有效 exchange code 时能完成登录
- callback 页面在缺少 code、code 无效、code 过期时显示错误
- 登录成功后恢复到原 `return_to` 页面
- 刷新页面后可通过 refresh token 恢复登录
- 登出后清理本地 token 并回到未登录态

### Server Unit Tests

需要覆盖：

- Google 授权 URL 生成正确
- state 生成和校验逻辑
- exchange code 生成和消费逻辑
- Google token response 校验逻辑
- ID token 必要 claims 校验

### Server Integration Tests

需要覆盖：

- `GET /api/auth/google/start` 返回 302
- `GET /api/auth/google/callback` 在合法 `code`/`state` 下成功创建登录事务
- 无效 state、过期 state、重复使用 state 时登录失败
- `POST /api/auth/exchange` 成功返回 access token、refresh token、user
- 相同 Google 用户重复登录时用户记录被复用并更新资料
- Google 登录后的 `/api/auth/me`、`/api/auth/refresh`、`/api/auth/logout` 正常工作

### Manual Acceptance

人工验收至少覆盖：

- 本地环境完整登录成功
- staging 环境真实 Google 登录成功
- 登录后能进入记账、统计、设置页面
- 退出登录后恢复未登录态
- 生产环境不显示 test-token 作为正式登录入口
- Google Console 配置与部署环境完全一致

## Assumptions and Defaults

- Web 登录主方案采用 Google OAuth redirect/callback
- 现有 JWT + refresh token 会话模型继续沿用
- Web 前端不再以 `id_token` 直传 `/api/auth/google` 为主路径
- `POST /api/auth/google` 默认保留给未来 Android 原生登录使用
- 服务端新增 `start`、`callback`、`exchange` 三段式流程
- 正式 token 不出现在 URL 中
- `return_to` 仅允许站内安全路径
- `google-login-plan.md` 作为完整实施说明文档，可直接交给实现者或后续 agent 落地
