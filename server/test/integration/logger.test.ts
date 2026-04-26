import { describe, expect, it, beforeAll } from 'vitest';
import { createExecutionContext } from 'cloudflare:test';
import app from '../../src/index';
import {
  createBearerToken,
  seedApiToken,
  seedUser,
  setupIntegrationDb,
  testEnv,
  workerEnv,
} from '../helpers/integration';

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
  await setupIntegrationDb('logger-test-setup');
  await seedApiToken({ token: 'test-token-coco' });

  const user = await seedUser({
    id: TEST_USER_ID,
    email: 'logger-test@moneyjar.test',
    googleId: 'google-logger-test-001',
    name: '测试用户',
  });

  // 生成测试 JWT 并缓存
  testToken = await createBearerToken(user);
});

describe('Logger Middleware Integration', () => {
  it('should attach X-Request-Id header to response', async () => {
    const ctx = createExecutionContext();
    const res = await app.fetch(new Request('http://localhost/'), workerEnv(), ctx);
    expect(res.headers.get('X-Request-Id')).toBeDefined();
  });

  it('should log transaction creation', async () => {
    const ctx = createExecutionContext();
    const res = await app.fetch(
      createJsonRequest('/api/transactions', 'POST', { type: 'expense', amount: 35.5, category: '餐饮' }),
      workerEnv(),
      ctx
    );
    expect(res.status).toBe(201);

    // 验证日志已写入数据库
    const stmt = testEnv.DB.prepare('SELECT * FROM request_logs WHERE request_method = ?');
    const logsResult = await stmt.bind('POST').all();
    const logs = logsResult.results as Array<Record<string, unknown>>;
    expect(logs.length).toBeGreaterThan(0);
  });

  it('should include requestId in error responses', async () => {
    const ctx = createExecutionContext();
    const res = await app.fetch(
      createJsonRequest('/api/transactions/99999', 'GET'),
      workerEnv(),
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
      workerEnv(),
      createCtx
    );
    const created = (await createRes.json()) as TransactionResponse;
    const id = created.id;

    // 再删除该记录
    const ctx = createExecutionContext();
    const res = await app.fetch(
      createJsonRequest(`/api/transactions/${id}`, 'DELETE'),
      workerEnv(),
      ctx
    );
    expect(res.status).toBe(200);

    // 验证 DELETE 请求已记录到日志
    const stmt = testEnv.DB.prepare('SELECT * FROM request_logs WHERE request_method = ?');
    const logsResult = await stmt.bind('DELETE').all();
    const logs = logsResult.results as Array<Record<string, unknown>>;
    expect(logs.length).toBeGreaterThan(0);
  });
});
