import { describe, expect, it, beforeAll } from 'vitest';
import { createExecutionContext, env, applyD1Migrations, type D1Migration } from 'cloudflare:test';
import app from '../../src/index';
import { signJwt } from '../../src/services/auth.service';

// ─────────────────────────────────────────────
// Inline 建表 SQL（含完整 Schema，避免在 Workers 运行时读取文件系统）
// ─────────────────────────────────────────────

const CREATE_USERS_TABLE = `CREATE TABLE "users" (
  "id" text PRIMARY KEY NOT NULL,
  "email" text NOT NULL,
  "name" text,
  "avatar_url" text,
  "plan" text NOT NULL DEFAULT 'free',
  "plan_started_at" text,
  "plan_expires_at" text,
  "google_id" text NOT NULL,
  "created_at" text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updated_at" text DEFAULT CURRENT_TIMESTAMP NOT NULL
)`;
const CREATE_USERS_EMAIL_UNIQUE = `CREATE UNIQUE INDEX "users_email_unique" ON "users" ("email")`;
const CREATE_USERS_GOOGLE_UNIQUE = `CREATE UNIQUE INDEX "users_google_id_unique" ON "users" ("google_id")`;

const CREATE_REFRESH_TOKENS_TABLE = `CREATE TABLE "refresh_tokens" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL,
  "token" text NOT NULL,
  "expires_at" text NOT NULL,
  "created_at" text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "revoked" integer NOT NULL DEFAULT 0,
  FOREIGN KEY ("user_id") REFERENCES "users"("id")
)`;
const CREATE_IDX_REFRESH_TOKEN = `CREATE UNIQUE INDEX "idx_refresh_token" ON "refresh_tokens" ("token")`;

const CREATE_FEATURE_FLAGS_TABLE = `CREATE TABLE "feature_flags" (
  "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  "feature_key" text NOT NULL,
  "min_plan" text NOT NULL DEFAULT 'free',
  "enabled" integer NOT NULL DEFAULT 1,
  "description" text
)`;
const CREATE_IDX_FEATURE_KEY = `CREATE UNIQUE INDEX "idx_feature_key" ON "feature_flags" ("feature_key")`;

// transactions 表含 user_id 字段，与当前 Schema 保持一致
const CREATE_TRANSACTIONS_TABLE = `CREATE TABLE "transactions" (
  "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  "user_id" text,
  "type" text(20) NOT NULL,
  "amount" real NOT NULL,
  "category" text(50) NOT NULL,
  "note" text(256),
  "created_at" text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "deleted_at" text
)`;
const CREATE_IDX_TRANSACTIONS_USER = `CREATE INDEX "idx_transactions_user_id" ON "transactions" ("user_id")`;

const CREATE_REQUEST_LOGS_TABLE = `CREATE TABLE "request_logs" (
  "id" text PRIMARY KEY,
  "request_path" text NOT NULL,
  "request_method" text NOT NULL,
  "status_code" integer NOT NULL,
  "duration" integer NOT NULL,
  "request_body" text,
  "response_body" text,
  "error_message" text,
  "client_ip" text,
  "user_agent" text,
  "timestamp" integer NOT NULL,
  "ai_parsed" integer,
  "ai_model" text,
  "ai_processing_time" integer
)`;

const CREATE_API_TOKENS_TABLE = `CREATE TABLE "api_tokens" (
  "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  "token" text NOT NULL,
  "name" text NOT NULL,
  "type" text(10) NOT NULL,
  "created_at" text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "expires_at" text
)`;

interface TransactionResponse {
  id: number;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  note: string | null;
  createdAt: string;
}

interface ErrorResponse {
  error: string;
  requestId: string;
}

// 测试用 JWT，在 beforeAll 中生成后缓存
let testToken = '';

// 测试用户 ID（合法 UUID v4 格式）
const TEST_USER_ID = 'f47ac10b-58cc-4372-a567-0e02b2c3d002';

async function setupD1() {
  const migration: D1Migration = {
    name: '0000_logger_test_init',
    queries: [
      CREATE_USERS_TABLE,
      CREATE_USERS_EMAIL_UNIQUE,
      CREATE_USERS_GOOGLE_UNIQUE,
      CREATE_REFRESH_TOKENS_TABLE,
      CREATE_IDX_REFRESH_TOKEN,
      CREATE_FEATURE_FLAGS_TABLE,
      CREATE_IDX_FEATURE_KEY,
      CREATE_TRANSACTIONS_TABLE,
      CREATE_IDX_TRANSACTIONS_USER,
      CREATE_REQUEST_LOGS_TABLE,
      CREATE_API_TOKENS_TABLE,
    ],
  };
  await applyD1Migrations(env.DB, [migration]);
  // 插入测试用 MCP Token（MCP 路由使用）
  await env.DB.prepare(`INSERT INTO api_tokens (token, name, type) VALUES ('test-token-coco', 'test-token', 'mcp')`).run();
}

// 创建带 JWT 鉴权头的 JSON 请求
function createJsonRequest(path: string, method: string, body?: unknown) {
  const url = new URL(path, 'http://localhost');
  const init: RequestInit = { method };
  const headers: Record<string, string> = {};
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(body);
  }
  // 使用 JWT Bearer token 鉴权（非 MCP token）
  headers['Authorization'] = testToken;
  init.headers = headers;
  return new Request(url.toString(), init);
}

beforeAll(async () => {
  await setupD1();

  // 插入测试用户
  await env.DB.prepare(
    `INSERT INTO users (id, email, google_id, plan, name) VALUES (?, ?, ?, 'free', '测试用户')`
  ).bind(TEST_USER_ID, 'logger-test@moneyjar.test', 'google-logger-test-001').run();

  // 生成测试 JWT 并缓存
  testToken = `Bearer ${await signJwt({ sub: TEST_USER_ID, email: 'logger-test@moneyjar.test', plan: 'free' }, env.JWT_SECRET)}`;
});

describe('Logger Middleware Integration', () => {
  it('should attach X-Request-Id header to response', async () => {
    const ctx = createExecutionContext();
    const res = await app.fetch(new Request('http://localhost/'), env, ctx);
    expect(res.headers.get('X-Request-Id')).toBeDefined();
  });

  it('should log transaction creation', async () => {
    const ctx = createExecutionContext();
    const res = await app.fetch(
      createJsonRequest('/api/transactions', 'POST', { type: 'expense', amount: 35.5, category: '餐饮' }),
      env,
      ctx
    );
    expect(res.status).toBe(201);

    // 验证日志已写入数据库
    const stmt = env.DB.prepare('SELECT * FROM request_logs WHERE request_method = ?');
    const logsResult = await stmt.bind('POST').all();
    const logs = logsResult.results as Array<Record<string, unknown>>;
    expect(logs.length).toBeGreaterThan(0);
  });

  it('should include requestId in error responses', async () => {
    const ctx = createExecutionContext();
    const res = await app.fetch(
      createJsonRequest('/api/transactions/99999', 'GET'),
      env,
      ctx
    );
    expect(res.status).toBe(404);
    const json = (await res.json()) as ErrorResponse;
    expect(json.requestId).toBeDefined();
  });

  it('should log DELETE requests', async () => {
    // 先创建一条交易记录
    const createCtx = createExecutionContext();
    const createRes = await app.fetch(
      createJsonRequest('/api/transactions', 'POST', { type: 'expense', amount: 10, category: '测试' }),
      env,
      createCtx
    );
    const created = (await createRes.json()) as TransactionResponse;
    const id = created.id;

    // 再删除该记录
    const ctx = createExecutionContext();
    const res = await app.fetch(
      createJsonRequest(`/api/transactions/${id}`, 'DELETE'),
      env,
      ctx
    );
    expect(res.status).toBe(200);

    // 验证 DELETE 请求已记录到日志
    const stmt = env.DB.prepare('SELECT * FROM request_logs WHERE request_method = ?');
    const logsResult = await stmt.bind('DELETE').all();
    const logs = logsResult.results as Array<Record<string, unknown>>;
    expect(logs.length).toBeGreaterThan(0);
  });
});
