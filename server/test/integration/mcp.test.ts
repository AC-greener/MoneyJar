import { beforeAll, describe, expect, it } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { createExecutionContext } from 'cloudflare:test';
import app from '../../src/index';
import {
  createBearerToken,
  seedApiToken,
  seedUser,
  setupIntegrationDb,
  workerEnv,
} from '../helpers/integration';

// 测试用的 MCP Token（用于 /api/mcp 路由）
const TEST_MCP_TOKEN = 'test-mcp-token-12345';

// 测试用户 ID（合法 UUID v4 格式，用于 /api/transactions 的 JWT 鉴权）
const TEST_USER_ID = 'f47ac10b-58cc-4372-a567-0e02b2c3d003';

// 测试用 JWT，在 beforeAll 中生成后缓存
let testJwtToken = '';

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

    return app.fetch(request, workerEnv(), createExecutionContext());
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

  return app.fetch(request, workerEnv(), createExecutionContext());
}

beforeAll(async () => {
  await setupIntegrationDb('mcp-test-setup');
  await seedApiToken({ token: TEST_MCP_TOKEN });

  const user = await seedUser({
    id: TEST_USER_ID,
    email: 'mcp-test@moneyjar.test',
    googleId: 'google-mcp-test-001',
    name: 'MCP 测试用户',
  });

  // 生成测试 JWT 并缓存
  testJwtToken = (await createBearerToken(user)).slice('Bearer '.length);
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
      workerEnv(),
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
