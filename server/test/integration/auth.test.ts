import { describe, expect, it, beforeAll } from 'vitest';
import { createExecutionContext, env, applyD1Migrations, type D1Migration } from 'cloudflare:test';
import worker from '../../src/index';
import { signJwt } from '../../src/services/auth.service';

// Inline 建表 SQL
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

const CREATE_API_TOKENS_TABLE = `CREATE TABLE "api_tokens" (
  "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  "token" text NOT NULL,
  "name" text NOT NULL,
  "type" text(10) NOT NULL,
  "created_at" text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "expires_at" text
)`;

async function setupDB() {
  const migration: D1Migration = {
    name: 'auth-test-setup',
    queries: [
      CREATE_USERS_TABLE,
      CREATE_USERS_EMAIL_UNIQUE,
      CREATE_USERS_GOOGLE_UNIQUE,
      CREATE_REFRESH_TOKENS_TABLE,
      CREATE_IDX_REFRESH_TOKEN,
      CREATE_API_TOKENS_TABLE,
    ],
  };
  await applyD1Migrations(env.DB, [migration]);
}

beforeAll(async () => {
  await setupDB();
});

describe('POST /api/auth/refresh', () => {
  it('应该用有效的 refresh_token 换取新的 access_token', async () => {
    // 先直接插入测试用户和 refresh token（模拟登录后的状态）
    const userId = crypto.randomUUID();
    const refreshToken = 'test-refresh-token-' + Date.now();
    const futureExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    await env.DB.prepare(`INSERT INTO users (id, email, google_id, plan) VALUES (?, ?, ?, 'free')`)
      .bind(userId, `refresh-test-${Date.now()}@test.com`, `google-${Date.now()}`)
      .run();
    await env.DB.prepare(`INSERT INTO refresh_tokens (id, user_id, token, expires_at, revoked) VALUES (?, ?, ?, ?, 0)`)
      .bind(crypto.randomUUID(), userId, refreshToken, futureExpiry)
      .run();

    const ctx = createExecutionContext();
    const res = await worker.fetch(
      new Request('http://localhost/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      }),
      env, ctx
    );

    expect(res.status).toBe(200);
    const json = await res.json() as { access_token: string };
    expect(json).toHaveProperty('access_token');
    expect(typeof json.access_token).toBe('string');
  });

  it('无效的 refresh_token 应返回 401', async () => {
    const ctx = createExecutionContext();
    const res = await worker.fetch(
      new Request('http://localhost/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: 'invalid-token-does-not-exist' }),
      }),
      env, ctx
    );
    expect(res.status).toBe(401);
  });
});

describe('POST /api/auth/logout', () => {
  it('应该成功吊销 refresh_token', async () => {
    const userId = crypto.randomUUID();
    const refreshToken = 'test-logout-token-' + Date.now();
    const futureExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    await env.DB.prepare(`INSERT INTO users (id, email, google_id, plan) VALUES (?, ?, ?, 'free')`)
      .bind(userId, `logout-test-${Date.now()}@test.com`, `google-logout-${Date.now()}`)
      .run();
    await env.DB.prepare(`INSERT INTO refresh_tokens (id, user_id, token, expires_at, revoked) VALUES (?, ?, ?, ?, 0)`)
      .bind(crypto.randomUUID(), userId, refreshToken, futureExpiry)
      .run();

    const ctx = createExecutionContext();
    const res = await worker.fetch(
      new Request('http://localhost/api/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      }),
      env, ctx
    );
    expect(res.status).toBe(200);

    // 验证 token 已被吊销：再次刷新应该失败
    const ctx2 = createExecutionContext();
    const res2 = await worker.fetch(
      new Request('http://localhost/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      }),
      env, ctx2
    );
    expect(res2.status).toBe(401);
  });
});

describe('GET /api/auth/me', () => {
  it('有效 JWT 应返回用户信息', async () => {
    const userId = crypto.randomUUID();
    const email = `me-test-${Date.now()}@test.com`;
    await env.DB.prepare(`INSERT INTO users (id, email, google_id, plan, name) VALUES (?, ?, ?, 'free', '测试用户')`)
      .bind(userId, email, `google-me-${Date.now()}`)
      .run();

    const token = await signJwt({ sub: userId, email, plan: 'free' }, env.JWT_SECRET);

    const ctx = createExecutionContext();
    const res = await worker.fetch(
      new Request('http://localhost/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      }),
      env, ctx
    );

    expect(res.status).toBe(200);
    const json = await res.json() as { id: string; email: string; plan: string };
    expect(json.id).toBe(userId);
    expect(json.email).toBe(email);
    expect(json.plan).toBe('free');
  });

  it('无 JWT 时应返回 401', async () => {
    const ctx = createExecutionContext();
    const res = await worker.fetch(
      new Request('http://localhost/api/auth/me'),
      env, ctx
    );
    expect(res.status).toBe(401);
  });
});

describe('GET /api/dev/token', () => {
  it('开发模式下应返回有效的 JWT', async () => {
    const ctx = createExecutionContext();
    const res = await worker.fetch(
      new Request('http://localhost/api/dev/token?plan=free'),
      env, ctx
    );
    expect(res.status).toBe(200);
    const json = await res.json() as { access_token: string };
    expect(json).toHaveProperty('access_token');
  });

  it('plan=pro 应返回 Pro 计划的 JWT', async () => {
    const ctx = createExecutionContext();
    const res = await worker.fetch(
      new Request('http://localhost/api/dev/token?plan=pro'),
      env, ctx
    );
    expect(res.status).toBe(200);
    const json = await res.json() as { access_token: string };
    const payload = JSON.parse(atob(json.access_token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    expect(payload.plan).toBe('pro');
  });
});
