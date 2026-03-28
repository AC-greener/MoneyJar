import { describe, expect, it, beforeAll } from 'vitest';
import { createExecutionContext, env, applyD1Migrations, type D1Migration } from 'cloudflare:test';
import app from '../../src/index';

const CREATE_TRANSACTIONS_TABLE = `CREATE TABLE "transactions" (
  "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  "type" text(20) NOT NULL,
  "amount" real NOT NULL,
  "category" text(50) NOT NULL,
  "note" text(256),
  "created_at" text DEFAULT CURRENT_TIMESTAMP NOT NULL
)`;

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

async function setupD1() {
  const migration: D1Migration = {
    name: '0000_init',
    queries: [CREATE_TRANSACTIONS_TABLE, CREATE_REQUEST_LOGS_TABLE],
  };
  await applyD1Migrations(env.DB, [migration]);
}

function createJsonRequest(path: string, method: string, body?: unknown) {
  const url = new URL(path, 'http://localhost');
  const init: RequestInit = { method };
  if (body !== undefined) {
    init.headers = { 'Content-Type': 'application/json' };
    init.body = JSON.stringify(body);
  }
  return new Request(url.toString(), init);
}

beforeAll(async () => {
  await setupD1();
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

    // Verify logs were written
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
    // First create a transaction
    const createCtx = createExecutionContext();
    const createRes = await app.fetch(
      createJsonRequest('/api/transactions', 'POST', { type: 'expense', amount: 10, category: '测试' }),
      env,
      createCtx
    );
    const created = (await createRes.json()) as TransactionResponse;
    const id = created.id;

    // Then delete it
    const ctx = createExecutionContext();
    const res = await app.fetch(
      createJsonRequest(`/api/transactions/${id}`, 'DELETE'),
      env,
      ctx
    );
    expect(res.status).toBe(200);

    // Verify DELETE was logged
    const stmt = env.DB.prepare('SELECT * FROM request_logs WHERE request_method = ?');
    const logsResult = await stmt.bind('DELETE').all();
    const logs = logsResult.results as Array<Record<string, unknown>>;
    expect(logs.length).toBeGreaterThan(0);
  });
});
