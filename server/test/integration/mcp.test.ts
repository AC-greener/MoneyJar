import { beforeAll, describe, expect, it } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { applyD1Migrations, createExecutionContext, env, type D1Migration } from 'cloudflare:test';
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

async function setupD1() {
  const migration: D1Migration = {
    name: '0001_add_mcp_support',
    queries: [CREATE_TRANSACTIONS_TABLE, CREATE_REQUEST_LOGS_TABLE],
  };
  await applyD1Migrations(env.DB, [migration]);
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
          Authorization: `Bearer ${env.MCP_TOKEN}`,
        },
      },
      fetch: createAppFetch(),
    }
  );

  await client.connect(transport);
  return { client, transport };
}

async function createTransaction(body: unknown) {
  const request = new Request('http://localhost/api/transactions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  return app.fetch(request, env, createExecutionContext());
}

beforeAll(async () => {
  await setupD1();
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
    await createTransaction({
      type: 'income',
      amount: 5000,
      category: '工资',
      note: '月薪',
    });

    await createTransaction({
      type: 'expense',
      amount: 100,
      category: '餐饮',
      note: '午饭',
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
