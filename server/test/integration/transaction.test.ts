import { describe, expect, it, beforeAll } from 'vitest';
import { createExecutionContext, env, applyD1Migrations, type D1Migration } from 'cloudflare:test';
import worker from '../../src/index';
import { mockTransaction } from '../fixtures/transaction';
import { signJwt } from '../../src/services/auth.service';

interface TransactionResponse {
  id: number;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  note: string | null;
  createdAt: string;
}

// Inline migration SQL to avoid filesystem access in Workers runtime
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

// transactions 表加入 user_id 字段以兼容新架构
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

// 测试用 JWT，在 beforeAll 中生成后缓存到此变量
let testToken = '';

// 测试用户 ID（合法 UUID v4 格式，满足 Zod v4 严格校验）
const TEST_USER_ID = 'f47ac10b-58cc-4372-a567-0e02b2c3d001';

// Apply migrations before tests
async function setupD1() {
  const migration: D1Migration = {
    name: '0000_tough_storm',
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
}

// Helper to create request with JSON body and auth
function createJsonRequest(path: string, method: string, body?: unknown) {
  const url = new URL(path, 'http://localhost');
  const init: RequestInit = { method };
  const headers: Record<string, string> = {};
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(body);
  }
  // 使用 JWT Bearer token 鉴权
  headers['Authorization'] = testToken;
  init.headers = headers;
  return new Request(url.toString(), init);
}

// Setup D1 before all tests
beforeAll(async () => {
  await setupD1();

  // 插入测试用户
  await env.DB.prepare(
    `INSERT INTO users (id, email, google_id, plan, name) VALUES (?, ?, ?, 'free', '测试用户')`
  ).bind(TEST_USER_ID, 'txtest@moneyjar.test', 'google-txtest-001').run();

  // 生成测试 JWT 并缓存
  testToken = `Bearer ${await signJwt({ sub: TEST_USER_ID, email: 'txtest@moneyjar.test', plan: 'free' }, env.JWT_SECRET)}`;
});

describe('POST /api/transactions', () => {
  it('should create a transaction with valid data', async () => {
    const ctx = createExecutionContext();
    const res = await worker.fetch(
      createJsonRequest('/api/transactions', 'POST', mockTransaction),
      env,
      ctx
    );
    expect(res.status).toBe(201);
    const json = (await res.json()) as TransactionResponse;
    expect(json).toHaveProperty('id');
    expect(json.type).toBe('expense');
    expect(json.amount).toBe(35.5);
  });

  it('should reject missing required fields', async () => {
    const ctx = createExecutionContext();
    const res = await worker.fetch(
      createJsonRequest('/api/transactions', 'POST', { amount: 35.5 }),
      env,
      ctx
    );
    expect(res.status).toBe(400);
  });

  it('should reject invalid type value', async () => {
    const ctx = createExecutionContext();
    const res = await worker.fetch(
      createJsonRequest('/api/transactions', 'POST', { type: 'invalid', amount: 35.5, category: '餐饮' }),
      env,
      ctx
    );
    expect(res.status).toBe(400);
  });

  it('should reject negative amount', async () => {
    const ctx = createExecutionContext();
    const res = await worker.fetch(
      createJsonRequest('/api/transactions', 'POST', { type: 'expense', amount: -10, category: '餐饮' }),
      env,
      ctx
    );
    expect(res.status).toBe(400);
  });
});

describe('GET /api/transactions', () => {
  it('should return transaction list', async () => {
    const ctx = createExecutionContext();
    const res = await worker.fetch(createJsonRequest('/api/transactions', 'GET'), env, ctx);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(Array.isArray(json)).toBe(true);
  });

  it('should return weekly summary with period=week', async () => {
    const ctx = createExecutionContext();
    const url = new URL('/api/transactions', 'http://localhost');
    url.searchParams.set('period', 'week');
    const req = new Request(url.toString(), { headers: { 'Authorization': testToken } });
    const res = await worker.fetch(req, env, ctx);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty('income');
    expect(json).toHaveProperty('expense');
    expect(json).toHaveProperty('balance');
    expect(json).toHaveProperty('count');
  });

  it('should return monthly summary with period=month', async () => {
    const ctx = createExecutionContext();
    const url = new URL('/api/transactions', 'http://localhost');
    url.searchParams.set('period', 'month');
    const req = new Request(url.toString(), { headers: { 'Authorization': testToken } });
    const res = await worker.fetch(req, env, ctx);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty('income');
    expect(json).toHaveProperty('expense');
    expect(json).toHaveProperty('balance');
    expect(json).toHaveProperty('count');
  });
});

describe('GET /api/transactions/:id', () => {
  it('should return 404 for non-existent id', async () => {
    const ctx = createExecutionContext();
    const res = await worker.fetch(createJsonRequest('/api/transactions/99999', 'GET'), env, ctx);
    expect(res.status).toBe(404);
  });

  it('should return existing transaction', async () => {
    const ctx = createExecutionContext();
    const createRes = await worker.fetch(
      createJsonRequest('/api/transactions', 'POST', mockTransaction),
      env,
      ctx
    );
    const created = (await createRes.json()) as TransactionResponse;
    const id = created.id;

    const ctx2 = createExecutionContext();
    const res = await worker.fetch(createJsonRequest(`/api/transactions/${id}`, 'GET'), env, ctx2);
    expect(res.status).toBe(200);
    const json = await res.json() as TransactionResponse;
    expect(json.id).toBe(id);
  });
});

describe('DELETE /api/transactions/:id', () => {
  it('should return 404 for non-existent id', async () => {
    const ctx = createExecutionContext();
    const res = await worker.fetch(createJsonRequest('/api/transactions/99999', 'DELETE'), env, ctx);
    expect(res.status).toBe(404);
  });

  it('should delete existing transaction', async () => {
    const ctx = createExecutionContext();
    const createRes = await worker.fetch(
      createJsonRequest('/api/transactions', 'POST', mockTransaction),
      env,
      ctx
    );
    const created = (await createRes.json()) as TransactionResponse;
    const id = created.id;

    const ctx2 = createExecutionContext();
    const delRes = await worker.fetch(
      createJsonRequest(`/api/transactions/${id}`, 'DELETE'),
      env,
      ctx2
    );
    expect(delRes.status).toBe(200);
  });
});
