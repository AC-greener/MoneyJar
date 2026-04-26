import { describe, expect, it, beforeAll } from 'vitest';
import { createExecutionContext } from 'cloudflare:test';
import worker from '../../src/index';
import { mockTransaction } from '../fixtures/transaction';
import {
  createBearerToken,
  seedUser,
  setupIntegrationDb,
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

// 测试用 JWT，在 beforeAll 中生成后缓存到此变量
let testToken = '';

// 测试用户 ID（合法 UUID v4 格式，满足 Zod v4 严格校验）
const TEST_USER_ID = 'f47ac10b-58cc-4372-a567-0e02b2c3d001';

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
  await setupIntegrationDb('transaction-test-setup');

  const user = await seedUser({
    id: TEST_USER_ID,
    email: 'txtest@moneyjar.test',
    googleId: 'google-txtest-001',
    name: '测试用户',
  });

  // 生成测试 JWT 并缓存
  testToken = await createBearerToken(user);
});

describe('POST /api/transactions', () => {
  it('should reject requests without JWT', async () => {
    const ctx = createExecutionContext();
    const res = await worker.fetch(
      new Request('http://localhost/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mockTransaction),
      }),
      workerEnv(),
      ctx
    );
    expect(res.status).toBe(401);
  });

  it('should create a transaction with valid data', async () => {
    const ctx = createExecutionContext();
    const res = await worker.fetch(
      createJsonRequest('/api/transactions', 'POST', mockTransaction),
      workerEnv(),
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
      workerEnv(),
      ctx
    );
    expect(res.status).toBe(400);
  });

  it('should reject invalid type value', async () => {
    const ctx = createExecutionContext();
    const res = await worker.fetch(
      createJsonRequest('/api/transactions', 'POST', { type: 'invalid', amount: 35.5, category: '餐饮' }),
      workerEnv(),
      ctx
    );
    expect(res.status).toBe(400);
  });

  it('should reject negative amount', async () => {
    const ctx = createExecutionContext();
    const res = await worker.fetch(
      createJsonRequest('/api/transactions', 'POST', { type: 'expense', amount: -10, category: '餐饮' }),
      workerEnv(),
      ctx
    );
    expect(res.status).toBe(400);
  });
});

describe('GET /api/transactions', () => {
  it('should return transaction list', async () => {
    const ctx = createExecutionContext();
    const res = await worker.fetch(createJsonRequest('/api/transactions', 'GET'), workerEnv(), ctx);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(Array.isArray(json)).toBe(true);
  });

  it('should return weekly summary with period=week', async () => {
    const ctx = createExecutionContext();
    const url = new URL('/api/transactions', 'http://localhost');
    url.searchParams.set('period', 'week');
    const req = new Request(url.toString(), { headers: { 'Authorization': testToken } });
    const res = await worker.fetch(req, workerEnv(), ctx);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty('income');
    expect(json).toHaveProperty('expense');
    expect(json).toHaveProperty('total');
    expect(json).toHaveProperty('transactions');
    expect(json).toHaveProperty('byCategory');
  });

  it('should return monthly summary with period=month', async () => {
    const ctx = createExecutionContext();
    const url = new URL('/api/transactions', 'http://localhost');
    url.searchParams.set('period', 'month');
    const req = new Request(url.toString(), { headers: { 'Authorization': testToken } });
    const res = await worker.fetch(req, workerEnv(), ctx);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty('income');
    expect(json).toHaveProperty('expense');
    expect(json).toHaveProperty('total');
    expect(json).toHaveProperty('transactions');
    expect(json).toHaveProperty('byCategory');
  });
});

describe('GET /api/transactions/:id', () => {
  it('should return 404 for non-existent id', async () => {
    const ctx = createExecutionContext();
    const res = await worker.fetch(createJsonRequest('/api/transactions/99999', 'GET'), workerEnv(), ctx);
    expect(res.status).toBe(404);
  });

  it('should return existing transaction', async () => {
    const ctx = createExecutionContext();
    const createRes = await worker.fetch(
      createJsonRequest('/api/transactions', 'POST', mockTransaction),
      workerEnv(),
      ctx
    );
    const created = (await createRes.json()) as TransactionResponse;
    const id = created.id;

    const ctx2 = createExecutionContext();
    const res = await worker.fetch(createJsonRequest(`/api/transactions/${id}`, 'GET'), workerEnv(), ctx2);
    expect(res.status).toBe(200);
    const json = await res.json() as TransactionResponse;
    expect(json.id).toBe(id);
  });
});

describe('DELETE /api/transactions/:id', () => {
  it('should return 404 for non-existent id', async () => {
    const ctx = createExecutionContext();
    const res = await worker.fetch(createJsonRequest('/api/transactions/99999', 'DELETE'), workerEnv(), ctx);
    expect(res.status).toBe(404);
  });

  it('should delete existing transaction', async () => {
    const ctx = createExecutionContext();
    const createRes = await worker.fetch(
      createJsonRequest('/api/transactions', 'POST', mockTransaction),
      workerEnv(),
      ctx
    );
    const created = (await createRes.json()) as TransactionResponse;
    const id = created.id;

    const ctx2 = createExecutionContext();
    const delRes = await worker.fetch(
      createJsonRequest(`/api/transactions/${id}`, 'DELETE'),
      workerEnv(),
      ctx2
    );
    expect(delRes.status).toBe(200);
  });
});
