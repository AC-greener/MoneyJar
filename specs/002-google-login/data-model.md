# Data Model: Google OAuth Login

**Feature**: 002-google-login
**Date**: 2026-04-10

## 新增 D1 表

### oauth_states

存储 OAuth 授权流程的 state 参数。

```typescript
// server/src/db/schema.ts 新增

export const oauthStates = sqliteTable('oauth_states', {
  id: text('id').primaryKey(), // UUID
  state: text('state').notNull(), // 随机 state 值
  returnTo: text('return_to').notNull().default('/'), // 登录后跳转地址
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  expiresAt: text('expires_at').notNull(), // 10分钟过期
  usedAt: text('used_at'), // 已使用时间，NULL = 未使用
}, (table) => ({
  idxState: uniqueIndex('idx_oauth_state').on(table.state),
}));
```

**验证规则**:
- `state`: 使用 `crypto.randomUUID()` 生成，43字符 UUID
- `expiresAt`: 创建时间 + 10分钟
- `usedAt`: 为 NULL 时才能使用

### login_exchange_tokens

存储一次性登录交换码。

```typescript
// server/src/db/schema.ts 新增

export const loginExchangeTokens = sqliteTable('login_exchange_tokens', {
  id: text('id').primaryKey(), // UUID
  code: text('code').notNull(), // 一次性交换码
  userId: text('user_id').notNull().references(() => users.id),
  accessToken: text('access_token').notNull(), // 短期 JWT
  refreshToken: text('refresh_token').notNull(), // 长期 token
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  expiresAt: text('expires_at').notNull(), // 5分钟过期
  usedAt: text('used_at'), // 已使用时间，NULL = 未使用
}, (table) => ({
  idxCode: uniqueIndex('idx_login_exchange_code').on(table.code),
}));
```

**验证规则**:
- `code`: 使用 `crypto.randomUUID()` 生成
- `expiresAt`: 创建时间 + 5分钟
- `usedAt`: 为 NULL 时才能兑换

## 现有表变更

### users 表（无变更）

继续使用 `googleId` 作为 Google 用户唯一标识。

```typescript
// 现有字段，无需修改
googleId: text('google_id').notNull().unique(), // Google OAuth sub
```

## API 类型定义

### 请求类型

```typescript
// server/src/types/auth.ts 新增

// GET /api/auth/google/start
// Query: { return_to?: string }

// GET /api/auth/google/callback
// Query: { code: string, state: string, error?: string }

// POST /api/auth/exchange
export const ExchangeCodeSchema = z.object({
  code: z.string().min(1),
})

export type ExchangeCodeRequest = z.infer<typeof ExchangeCodeSchema>
```

### 响应类型

```typescript
// server/src/types/auth.ts 新增

// POST /api/auth/exchange 响应
export const ExchangeResponseSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  user: UserSchema,
})

export type ExchangeResponse = z.infer<typeof ExchangeResponseSchema>
```

## 前端类型定义

```typescript
// frontend/src/types/api.ts 扩展

export interface AuthResponse {
  access_token: string
  refresh_token: string
  user: User
}

// 新增
export interface ExchangeCodeRequest {
  code: string
}
```

## 状态机

### OAuth 授权流程状态

```
┌─────────────┐
│  INITIAL    │ ← 用户点击登录
└──────┬──────┘
       │ generate state
       ▼
┌─────────────┐
│  PENDING    │ ← state 已存储，等待 Google 回调
└──────┬──────┘
       │ callback with code & state
       ▼
┌─────────────┐
│  EXCHANGED  │ ← exchange code 已生成，等待前端兑换
└──────┬──────┘
       │ POST /exchange with code
       ▼
┌─────────────┐
│  COMPLETED  │ ← 登录成功，tokens 已发放
└─────────────┘
```

### 状态转换规则

| 当前状态 | 事件 | 目标状态 | 条件 |
|---------|------|---------|------|
| INITIAL | 用户访问 /google/start | PENDING | state 成功生成并存储 |
| PENDING | Google callback 验证成功 | EXCHANGED | code 和 state 有效，user upsert 成功 |
| PENDING | state 无效/过期 | (拒绝) | 返回错误，跳转回前端 callback?error=... |
| EXCHANGED | 前端兑换 exchange code | COMPLETED | code 有效且未使用 |
| EXCHANGED | code 过期 | (拒绝) | code 被清理，前端需重新登录 |
