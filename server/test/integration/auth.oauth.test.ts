import { describe, expect, it, beforeAll } from 'vitest';
import { createExecutionContext } from 'cloudflare:test';
import worker from '../../src/index';
import { OAuthStateRepository, LoginExchangeTokenRepository } from '../../src/repositories/oauth.repository';
import { drizzle } from 'drizzle-orm/d1';
import { seedUser, setupIntegrationDb, testEnv, workerEnv } from '../helpers/integration';

beforeAll(async () => {
  await setupIntegrationDb('oauth-test-setup');
});

describe('GET /api/auth/google/start', () => {
  it('应返回 302 重定向到 Google 授权页', async () => {
    const ctx = createExecutionContext();
    const res = await worker.fetch(
      new Request('http://localhost/api/auth/google/start'),
      workerEnv(), ctx
    );

    expect(res.status).toBe(302);
    const redirectUrl = res.headers.get('Location');
    expect(redirectUrl).toBeTruthy();
    expect(redirectUrl).toContain('accounts.google.com');
    expect(redirectUrl).toContain('client_id=');
    expect(redirectUrl).toContain('redirect_uri=');
    expect(redirectUrl).toContain('response_type=code');
  });

  it('携带 return_to 参数时应包含在 state 中', async () => {
    const ctx = createExecutionContext();
    const res = await worker.fetch(
      new Request('http://localhost/api/auth/google/start?return_to=/record'),
      workerEnv(), ctx
    );

    expect(res.status).toBe(302);
    // state 存储在数据库中，可以通过数据库验证
    const db = drizzle(testEnv.DB);
    const stateRepo = new OAuthStateRepository(db);
    const redirectUrl = res.headers.get('Location') || '';
    const stateMatch = redirectUrl.match(/state=([^&]+)/);
    expect(stateMatch).toBeTruthy();

    const state = stateMatch![1];
    const stateRecord = await stateRepo.findValidByState(state);
    expect(stateRecord).toBeTruthy();
    expect(stateRecord?.returnTo).toBe('/record');
  });

  it('无效的 return_to（如外部链接）应被拒绝', async () => {
    const ctx = createExecutionContext();
    const res = await worker.fetch(
      new Request('http://localhost/api/auth/google/start?return_to=https://evil.com'),
      workerEnv(), ctx
    );

    expect(res.status).toBe(302);
    const redirectUrl = res.headers.get('Location') || '';
    const stateMatch = redirectUrl.match(/state=([^&]+)/);
    expect(stateMatch).toBeTruthy();

    const state = stateMatch![1];
    const db = drizzle(testEnv.DB);
    const stateRepo = new OAuthStateRepository(db);
    const stateRecord = await stateRepo.findValidByState(state);
    // 外部 URL 应被拒绝，return_to 应默认为 /
    expect(stateRecord?.returnTo).toBe('/');
  });
});

describe('POST /api/auth/exchange', () => {
  it('有效的 exchange code 应返回 tokens', async () => {
    // 先创建一个用户
    const userId = crypto.randomUUID();
    const email = `exchange-test-${Date.now()}@test.com`;
    await seedUser({ id: userId, email, googleId: `google-exchange-${Date.now()}` });

    // 创建 exchange token
    const db = drizzle(testEnv.DB);
    const exchangeRepo = new LoginExchangeTokenRepository(db);
    const { code } = await exchangeRepo.create(
      userId,
      'test-access-token',
      'test-refresh-token'
    );

    // 兑换
    const ctx = createExecutionContext();
    const res = await worker.fetch(
      new Request('http://localhost/api/auth/exchange', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      }),
      workerEnv(), ctx
    );

    expect(res.status).toBe(200);
    const json = await res.json() as { access_token: string; refresh_token: string; user: { id: string } };
    expect(json.access_token).toBe('test-access-token');
    expect(json.refresh_token).toBe('test-refresh-token');
    expect(json.user.id).toBe(userId);
  });

  it('无效的 exchange code 应返回 401', async () => {
    const ctx = createExecutionContext();
    const res = await worker.fetch(
      new Request('http://localhost/api/auth/exchange', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: 'non-existent-code' }),
      }),
      workerEnv(), ctx
    );

    expect(res.status).toBe(401);
  });

  it('空的 code 应返回 400', async () => {
    const ctx = createExecutionContext();
    const res = await worker.fetch(
      new Request('http://localhost/api/auth/exchange', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: '' }),
      }),
      workerEnv(), ctx
    );

    expect(res.status).toBe(400);
  });

  it('exchange code 只能使用一次', async () => {
    // 创建用户和 exchange token
    const userId = crypto.randomUUID();
    const email = `reuse-test-${Date.now()}@test.com`;
    await seedUser({ id: userId, email, googleId: `google-reuse-${Date.now()}` });

    const db = drizzle(testEnv.DB);
    const exchangeRepo = new LoginExchangeTokenRepository(db);
    const { code } = await exchangeRepo.create(
      userId,
      'test-access-token-2',
      'test-refresh-token-2'
    );

    // 第一次兑换 - 成功
    const ctx1 = createExecutionContext();
    const res1 = await worker.fetch(
      new Request('http://localhost/api/auth/exchange', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      }),
      workerEnv(), ctx1
    );
    expect(res1.status).toBe(200);

    // 第二次兑换 - 失败（code 已使用）
    const ctx2 = createExecutionContext();
    const res2 = await worker.fetch(
      new Request('http://localhost/api/auth/exchange', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      }),
      workerEnv(), ctx2
    );
    expect(res2.status).toBe(401);
  });
});

describe('OAuth State 安全验证', () => {
  it('无效的 state 应被拒绝', async () => {
    const ctx = createExecutionContext();
    const res = await worker.fetch(
      new Request('http://localhost/api/auth/google/callback?code=test&state=invalid-state'),
      workerEnv(), ctx
    );

    // 应该重定向到错误页面而不是成功
    expect(res.status).toBe(302);
    const redirectUrl = res.headers.get('Location') || '';
    expect(redirectUrl).toContain('error=');
  });

  it('缺少 state 参数应返回 400', async () => {
    const ctx = createExecutionContext();
    const res = await worker.fetch(
      new Request('http://localhost/api/auth/google/callback?code=test'),
      workerEnv(), ctx
    );

    expect(res.status).toBe(400);
  });

  it('Google 返回错误时应正确处理', async () => {
    const ctx = createExecutionContext();
    const res = await worker.fetch(
      new Request('http://localhost/api/auth/google/callback?error=access_denied'),
      workerEnv(), ctx
    );

    expect(res.status).toBe(302);
    const redirectUrl = res.headers.get('Location') || '';
    expect(redirectUrl).toContain('error=');
    expect(redirectUrl).toContain('access_denied');
  });
});
