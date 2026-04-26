import { describe, expect, it, beforeAll } from 'vitest';
import { createExecutionContext } from 'cloudflare:test';
import worker from '../../src/index';
import { signJwt } from '../../src/services/auth.service';
import {
  hashToken,
  seedRefreshToken,
  seedUser,
  setupIntegrationDb,
  testEnv,
  workerEnv,
} from '../helpers/integration';

beforeAll(async () => {
  await setupIntegrationDb('auth-test-setup');
});

describe('POST /api/auth/refresh', () => {
  it('应该用有效的 refresh_token 换取新的 access_token', async () => {
    // 先直接插入测试用户和 refresh token（模拟登录后的状态）
    // 注意：refresh_tokens 表存储的是 token 的哈希值
    const userId = crypto.randomUUID();
    const refreshToken = 'test-refresh-token-' + Date.now();
    const futureExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    await seedUser({ id: userId, email: `refresh-test-${Date.now()}@test.com` });
    await seedRefreshToken({ userId, token: refreshToken, expiresAt: futureExpiry });

    const ctx = createExecutionContext();
    const res = await worker.fetch(
      new Request('http://localhost/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      }),
      workerEnv(), ctx
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
      workerEnv(), ctx
    );
    expect(res.status).toBe(401);
  });
});

describe('POST /api/auth/logout', () => {
  it('应该成功吊销 refresh_token', async () => {
    const userId = crypto.randomUUID();
    const refreshToken = 'test-logout-token-' + Date.now();
    const futureExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    await seedUser({ id: userId, email: `logout-test-${Date.now()}@test.com` });
    await seedRefreshToken({ userId, token: refreshToken, expiresAt: futureExpiry });

    const ctx = createExecutionContext();
    const res = await worker.fetch(
      new Request('http://localhost/api/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      }),
      workerEnv(), ctx
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
      workerEnv(), ctx2
    );
    expect(res2.status).toBe(401);
  });
});

describe('GET /api/auth/me', () => {
  it('有效 JWT 应返回用户信息', async () => {
    const userId = crypto.randomUUID();
    const email = `me-test-${Date.now()}@test.com`;
    await seedUser({ id: userId, email, name: '测试用户' });

    const token = await signJwt({ sub: userId, email, plan: 'free' }, testEnv.JWT_SECRET);

    const ctx = createExecutionContext();
    const res = await worker.fetch(
      new Request('http://localhost/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      }),
      workerEnv(), ctx
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
      workerEnv(), ctx
    );
    expect(res.status).toBe(401);
  });
});

describe('POST /api/auth/test-token', () => {
  it('development 环境且携带正确测试密钥时，应返回 access_token 和 refresh_token', async () => {
    const ctx = createExecutionContext();
    const res = await worker.fetch(
      new Request('http://localhost/api/auth/test-token', {
        method: 'POST',
        headers: { Authorization: `Bearer ${testEnv.TEST_AUTH_TOKEN}` },
      }),
      workerEnv(), ctx
    );

    expect(res.status).toBe(200);
    const json = await res.json() as {
      access_token: string;
      refresh_token: string;
      user: { id: string; email: string; plan: string };
    };

    expect(json.access_token).toBeTruthy();
    expect(json.refresh_token).toBeTruthy();
    expect(json.user.email).toBe('staging-test@moneyjar.test');
    expect(json.user.plan).toBe('free');

    const storedUser = await testEnv.DB.prepare(`SELECT id, email FROM users WHERE email = ?`)
      .bind('staging-test@moneyjar.test')
      .first<{ id: string; email: string }>();
    expect(storedUser?.id).toBe(json.user.id);

    const storedToken = await testEnv.DB.prepare(`SELECT token, revoked FROM refresh_tokens WHERE user_id = ? ORDER BY created_at DESC LIMIT 1`)
      .bind(json.user.id)
      .first<{ token: string; revoked: number }>();
    // refresh_tokens 表存储的是 token 的哈希值
    const refreshTokenHash = await hashToken(json.refresh_token);
    expect(storedToken?.token).toBe(refreshTokenHash);
    expect(storedToken?.revoked).toBe(0);
  });

  it('测试密钥错误时应返回 401', async () => {
    const ctx = createExecutionContext();
    const res = await worker.fetch(
      new Request('http://localhost/api/auth/test-token', {
        method: 'POST',
        headers: { Authorization: 'Bearer wrong-test-auth-token' },
      }),
      workerEnv(), ctx
    );

    expect(res.status).toBe(401);
  });

  it('production 环境下应返回 404', async () => {
    const productionEnv = workerEnv({ ENVIRONMENT: 'production' });
    const ctx = createExecutionContext();
    const res = await worker.fetch(
      new Request('http://localhost/api/auth/test-token', {
        method: 'POST',
        headers: { Authorization: `Bearer ${testEnv.TEST_AUTH_TOKEN}` },
      }),
      productionEnv, ctx
    );

    expect(res.status).toBe(404);
  });
});

describe('GET /api/dev/token', () => {
  it('开发模式下应返回有效的 JWT', async () => {
    const ctx = createExecutionContext();
    const res = await worker.fetch(
      new Request('http://localhost/api/dev/token?plan=free'),
      workerEnv(), ctx
    );
    expect(res.status).toBe(200);
    const json = await res.json() as { access_token: string };
    expect(json).toHaveProperty('access_token');
  });

  it('plan=pro 应返回 Pro 计划的 JWT', async () => {
    const ctx = createExecutionContext();
    const res = await worker.fetch(
      new Request('http://localhost/api/dev/token?plan=pro'),
      workerEnv(), ctx
    );
    expect(res.status).toBe(200);
    const json = await res.json() as { access_token: string };
    const payload = JSON.parse(atob(json.access_token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    expect(payload.plan).toBe('pro');
  });
});
