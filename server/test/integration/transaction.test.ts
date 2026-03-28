import { describe, expect, it, beforeAll } from 'vitest';
import { createExecutionContext, env, applyD1Migrations, type D1Migration } from 'cloudflare:test';
import app from '../../src/index';
import { mockTransaction } from '../fixtures/transaction';

interface TransactionResponse {
  id: number;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  note: string | null;
  createdAt: string;
}

// Inline migration SQL to avoid filesystem access in Workers runtime
const CREATE_TRANSACTIONS_TABLE = `CREATE TABLE "transactions" (
  "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  "type" text(20) NOT NULL,
  "amount" real NOT NULL,
  "category" text(50) NOT NULL,
  "note" text(256),
  "created_at" text DEFAULT CURRENT_TIMESTAMP NOT NULL
)`;

// Apply migrations before tests
async function setupD1() {
  const migration: D1Migration = {
    name: '0000_tough_storm',
    queries: [CREATE_TRANSACTIONS_TABLE],
  };
  await applyD1Migrations(env.DB, [migration]);
}

// Helper to create request with JSON body
function createJsonRequest(path: string, method: string, body?: unknown) {
  const url = new URL(path, 'http://localhost');
  const init: RequestInit = { method };
  if (body !== undefined) {
    init.headers = { 'Content-Type': 'application/json' };
    init.body = JSON.stringify(body);
  }
  return new Request(url.toString(), init);
}

// Setup D1 before all tests
beforeAll(async () => {
  await setupD1();
});

describe('POST /api/transactions', () => {
  it('should create a transaction with valid data', async () => {
    const ctx = createExecutionContext();
    const res = await app.fetch(
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
    const res = await app.fetch(
      createJsonRequest('/api/transactions', 'POST', { amount: 35.5 }),
      env,
      ctx
    );
    expect(res.status).toBe(400);
  });

  it('should reject invalid type value', async () => {
    const ctx = createExecutionContext();
    const res = await app.fetch(
      createJsonRequest('/api/transactions', 'POST', { type: 'invalid', amount: 35.5, category: '餐饮' }),
      env,
      ctx
    );
    expect(res.status).toBe(400);
  });

  it('should reject negative amount', async () => {
    const ctx = createExecutionContext();
    const res = await app.fetch(
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
    const res = await app.fetch(createJsonRequest('/api/transactions', 'GET'), env, ctx);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(Array.isArray(json)).toBe(true);
  });

  it('should return weekly summary with period=week', async () => {
    const ctx = createExecutionContext();
    const url = new URL('/api/transactions', 'http://localhost');
    url.searchParams.set('period', 'week');
    const res = await app.fetch(new Request(url.toString()), env, ctx);
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
    const res = await app.fetch(new Request(url.toString()), env, ctx);
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
    const res = await app.fetch(createJsonRequest('/api/transactions/99999', 'GET'), env, ctx);
    expect(res.status).toBe(404);
  });

  it('should return existing transaction', async () => {
    const ctx = createExecutionContext();
    const createRes = await app.fetch(
      createJsonRequest('/api/transactions', 'POST', mockTransaction),
      env,
      ctx
    );
    const created = (await createRes.json()) as TransactionResponse;
    const id = created.id;

    const ctx2 = createExecutionContext();
    const res = await app.fetch(createJsonRequest(`/api/transactions/${id}`, 'GET'), env, ctx2);
    expect(res.status).toBe(200);
    const json = await res.json() as TransactionResponse;
    expect(json.id).toBe(id);
  });
});

describe('DELETE /api/transactions/:id', () => {
  it('should return 404 for non-existent id', async () => {
    const ctx = createExecutionContext();
    const res = await app.fetch(createJsonRequest('/api/transactions/99999', 'DELETE'), env, ctx);
    expect(res.status).toBe(404);
  });

  it('should delete existing transaction', async () => {
    const ctx = createExecutionContext();
    const createRes = await app.fetch(
      createJsonRequest('/api/transactions', 'POST', mockTransaction),
      env,
      ctx
    );
    const created = (await createRes.json()) as TransactionResponse;
    const id = created.id;

    const ctx2 = createExecutionContext();
    const delRes = await app.fetch(
      createJsonRequest(`/api/transactions/${id}`, 'DELETE'),
      env,
      ctx2
    );
    expect(delRes.status).toBe(200);
  });
});
