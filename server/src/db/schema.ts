import { sql } from 'drizzle-orm';
import { sqliteTable, text, integer, real, index, uniqueIndex } from 'drizzle-orm/sqlite-core';

// 用户表：存储通过 Google OAuth 登录的用户信息及会员计划
export const users = sqliteTable('users', {
  id: text('id').primaryKey(), // UUID，使用 crypto.randomUUID() 生成
  email: text('email').notNull().unique(),
  name: text('name'),
  avatarUrl: text('avatar_url'),
  plan: text('plan', { enum: ['free', 'pro'] as const }).notNull().default('free'), // 会员计划：'free' | 'pro'
  planStartedAt: text('plan_started_at'), // Pro 计划开始时间（ISO 字符串）
  planExpiresAt: text('plan_expires_at'), // Pro 计划到期时间（NULL = 永久有效）
  googleId: text('google_id').notNull().unique(), // Google OAuth sub 字段，唯一标识
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// 刷新令牌表：存储用于续签 JWT 的长效令牌，支持软吊销
export const refreshTokens = sqliteTable('refresh_tokens', {
  id: text('id').primaryKey(), // UUID
  userId: text('user_id').notNull().references(() => users.id), // 关联用户
  token: text('token').notNull(), // 随机 UUID 令牌值
  expiresAt: text('expires_at').notNull(), // 30 天有效期（ISO 字符串）
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  revoked: integer('revoked', { mode: 'boolean' }).notNull().default(false), // 是否已吊销
}, (table) => ({
  // 通过 token 字段快速查找，保证唯一性
  idxRefreshToken: uniqueIndex('idx_refresh_token').on(table.token),
}));

// 功能开关表：控制各功能模块按会员计划开放，支持全局紧急关闭
export const featureFlags = sqliteTable('feature_flags', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  featureKey: text('feature_key').notNull(), // 功能标识符，如 'ai_voice'、'advanced_budget'
  minPlan: text('min_plan', { enum: ['free', 'pro'] as const }).notNull().default('free'), // 最低所需计划
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true), // 全局开关
  description: text('description'), // 功能描述，便于管理
}, (table) => ({
  // 通过功能键快速查找，保证唯一性
  idxFeatureKey: uniqueIndex('idx_feature_key').on(table.featureKey),
}));

// 交易记录表：核心记账数据，新增 user_id 字段关联用户（可空以兼容存量数据）
export const transactions = sqliteTable('transactions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: text('user_id').references(() => users.id), // 关联用户，可空以兼容存量数据
  type: text('type', { length: 20 }).notNull(), // 'income' | 'expense'
  amount: real('amount').notNull(),
  category: text('category', { length: 50 }).notNull(),
  note: text('note', { length: 256 }),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  deletedAt: text('deleted_at'), // NULL = 未删除，ISO 时间戳 = 已软删除
}, (table) => ({
  // 通过 user_id 快速查找用户的所有交易记录
  idxUserId: index('idx_transactions_user_id').on(table.userId),
}));

// API Token 表：管理 MCP 及 App 类型的访问令牌
export const apiTokens = sqliteTable('api_tokens', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  token: text('token').notNull(),
  name: text('name').notNull(),
  type: text('type', { length: 10 }).notNull(), // 'mcp' | 'app'
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  expiresAt: text('expires_at'), // 预留字段，暂不使用
}, (table) => ({
  idxToken: uniqueIndex('idx_token').on(table.token),
}));

// OAuth State 表：存储 Google OAuth 授权流程的 state 参数（10分钟过期，单次使用）
export const oauthStates = sqliteTable('oauth_states', {
  id: text('id').primaryKey(), // UUID
  state: text('state').notNull(), // 随机 state 值，用于防止 CSRF
  returnTo: text('return_to').notNull().default('/'), // 登录成功后跳转地址
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  expiresAt: text('expires_at').notNull(), // 10分钟后过期
  usedAt: text('used_at'), // 已使用时间，NULL = 未使用
}, (table) => ({
  idxOauthState: uniqueIndex('idx_oauth_state').on(table.state),
}));

// Login Exchange Token 表：存储一次性登录交换码（5分钟过期，单次使用）
export const loginExchangeTokens = sqliteTable('login_exchange_tokens', {
  id: text('id').primaryKey(), // UUID
  code: text('code').notNull(), // 一次性交换码
  userId: text('user_id').notNull().references(() => users.id), // 关联用户
  accessToken: text('access_token').notNull(), // 短期 JWT
  refreshToken: text('refresh_token').notNull(), // 长期 token
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  expiresAt: text('expires_at').notNull(), // 5分钟后过期
  usedAt: text('used_at'), // 已使用时间，NULL = 未使用
}, (table) => ({
  idxExchangeCode: uniqueIndex('idx_login_exchange_code').on(table.code),
}));

// 请求日志表：记录所有 API 请求的元数据，用于监控和调试
export const requestLogs = sqliteTable('request_logs', {
  id: text('id').primaryKey(),
  requestPath: text('request_path').notNull(),
  requestMethod: text('request_method').notNull(),
  statusCode: integer('status_code').notNull(),
  duration: integer('duration').notNull(),
  requestBody: text('request_body'),
  responseBody: text('response_body'),
  errorMessage: text('error_message'),
  clientIp: text('client_ip'),
  userAgent: text('user_agent'),
  timestamp: integer('timestamp', { mode: 'timestamp' }).notNull(),
  aiParsed: integer('ai_parsed', { mode: 'boolean' }),
  aiModel: text('ai_model'),
  aiProcessingTime: integer('ai_processing_time'),
}, (table) => ({
  idxRequestId: index('idx_request_id').on(table.id),
  idxTimestamp: index('idx_timestamp').on(table.timestamp),
  idxStatusCode: index('idx_status_code').on(table.statusCode),
  idxRequestPath: index('idx_request_path').on(table.requestPath),
}));
