import { beforeAll, describe, expect, it } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { applyD1Migrations, createExecutionContext, env, type D1Migration } from 'cloudflare:test';
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

// 测试用的 MCP Token（用于 /api/mcp 路由）
const TEST_MCP_TOKEN = 'test-mcp-token-12345';

// 测试用户 ID（合法 UUID v4 格式，用于 /api/transactions 的 JWT 鉴权）
const TEST_USER_ID = 'f47ac10b-58cc-4372-a567-0e02b2c3d003';

// 测试用 JWT，在 beforeAll 中生成后缓存
let testJwtToken = '';

async function setupD1() {
  const migration: D1Migration = {
    name: '0003_add_api_tokens',
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

async function insertTestMcpToken() {
  await env.DB.exec(`INSERT INTO api_tokens (token, name, type) VALUES ('${TEST_MCP_TOKEN}', 'test-token', 'mcp')`);
}

function createJsonRpcRequest(body: unknown, token?: string) {
  return new Request('http://localhost/api/mcp', {
    method: 'POST',
    headers: {
      Accept: 'application/json, text/event-stream',
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
}

function createAppFetch() {
  return async (input: RequestInfo | URL, init?: RequestInit) => {
    const request =
      input instanceof Request
        ? new Request(input, init)
        : new Request(typeof input === 'string' ? input : input.toString(), init);

    return app.fetch(request, env, createExecutionContext());
  };
}

async function createClient() {
  const client = new Client({
    name: 'moneyjar-mcp-test-client',
    version: '1.0.0',
  });

  const transport = new StreamableHTTPClientTransport(
    new URL('http://localhost/api/mcp'),
    {
      requestInit: {
        headers: {
          Authorization: `Bearer ${TEST_MCP_TOKEN}`,
        },
      },
      fetch: createAppFetch(),
    }
  );

  await client.connect(transport);
  return { client, transport };
}

// 使用 JWT token 访问 /api/transactions（该路由需要用户鉴权，不接受 MCP token）
async function createTransaction(body: unknown) {
  const request = new Request('http://localhost/api/transactions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${testJwtToken}`,
    },
    body: JSON.stringify(body),
  });

  return app.fetch(request, env, createExecutionContext());
}

beforeAll(async () => {
  await setupD1();
  await insertTestMcpToken();

  // 插入测试用户，供 JWT 鉴权使用
  await env.DB.prepare(
    `INSERT INTO users (id, email, google_id, plan, name) VALUES (?, ?, ?, 'free', 'MCP 测试用户')`
  ).bind(TEST_USER_ID, 'mcp-test@moneyjar.test', 'google-mcp-test-001').run();

  // 生成测试 JWT 并缓存
  testJwtToken = await signJwt(
    { sub: TEST_USER_ID, email: 'mcp-test@moneyjar.test', plan: 'free' },
    env.JWT_SECRET
  );
});

describe('MCP /api/mcp', () => {
  it('should reject requests without bearer token', async () => {
    const response = await app.fetch(
      createJsonRpcRequest({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2025-06-18',
          capabilities: {},
          clientInfo: {
            name: 'unauthorized-client',
            version: '1.0.0',
          },
        },
      }),
      env,
      createExecutionContext()
    );

    expect(response.status).toBe(401);
  });

  it('should discover tools through a real MCP client connection', async () => {
    const { client, transport } = await createClient();

    const result = await client.listTools();
    const toolNames = result.tools.map((tool) => tool.name);

    expect(toolNames).toContain('create_transaction');
    expect(toolNames).toContain('get_transaction');
    expect(toolNames).toContain('list_transactions');
    expect(toolNames).toContain('delete_transaction');
    expect(toolNames).toContain('get_balance_report');

    await client.close();
    await transport.close();
  });

  it('should create and fetch a transaction through MCP tools', async () => {
    const { client, transport } = await createClient();

    const createResult = await client.callTool({
      name: 'create_transaction',
      arguments: {
        type: 'expense',
        amount: 18.5,
        category: '咖啡',
        note: '拿铁',
      },
    });

    const created = createResult.structuredContent as {
      id: number;
      amount: number;
      category: string;
    };

    expect(created.amount).toBe(18.5);
    expect(created.category).toBe('咖啡');

    const getResult = await client.callTool({
      name: 'get_transaction',
      arguments: {
        id: created.id,
      },
    });

    const fetched = getResult.structuredContent as { id: number; category: string };
    expect(fetched.id).toBe(created.id);
    expect(fetched.category).toBe('咖啡');

    await client.close();
    await transport.close();
  });

  it('should cap list_transactions to the default recent size', async () => {
    // 通过 JWT 鉴权的 /api/transactions 路由批量插入测试数据
    for (let index = 0; index < 25; index += 1) {
      await createTransaction({
        type: 'expense',
        amount: index + 1,
        category: `测试分类${index}`,
        note: `测试备注${index}`,
      });
    }

    const { client, transport } = await createClient();
    const listResult = await client.callTool({
      name: 'list_transactions',
      arguments: {},
    });

    const payload = listResult.structuredContent as {
      items: Array<{ id: number }>;
      limit: number;
    };

    expect(payload.limit).toBe(20);
    expect(payload.items).toHaveLength(20);

    await client.close();
    await transport.close();
  });

  it('should return a monthly balance report through MCP', async () => {
    // 获取当前月份第一天，确保交易记录落在当前月份内
    const now = new Date();
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];

    await createTransaction({
      type: 'income',
      amount: 5000,
      category: '工资',
      note: '月薪',
      created_at: firstOfMonth + 'T00:00:00.000Z',
    });

    await createTransaction({
      type: 'expense',
      amount: 100,
      category: '餐饮',
      note: '午饭',
      created_at: firstOfMonth + 'T12:00:00.000Z',
    });

    const { client, transport } = await createClient();
    const result = await client.callTool({
      name: 'get_balance_report',
      arguments: {
        period: 'month',
      },
    });

    const report = result.structuredContent as {
      income: number;
      expense: number;
      balance: number;
      count: number;
    };

    expect(report.income).toBeGreaterThanOrEqual(5000);
    expect(report.expense).toBeGreaterThan(0);
    expect(report.balance).toBe(report.income - report.expense);
    expect(report.count).toBeGreaterThan(0);

    await client.close();
    await transport.close();
  });
});
