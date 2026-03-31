import { StreamableHTTPTransport } from '@hono/mcp';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { drizzle } from 'drizzle-orm/d1';
import { Hono } from 'hono';
import { createMcpAuthMiddleware } from '../middlewares/mcp-auth';
import { TransactionService } from '../services/transaction.service';
import {
  McpBalanceReportSchema,
  McpCreateTransactionSchema,
  McpListTransactionsSchema,
  McpTransactionIdSchema,
} from '../types/mcp';
import { TransactionResponseSchema } from '../types/transaction';

let bindings: CloudflareBindings | null = null;
let mcpServer: McpServer | null = null;
let transport: StreamableHTTPTransport | null = null;

function createTextContent(text: string) {
  return [{ type: 'text' as const, text }];
}

function createToolError(message: string) {
  return {
    content: createTextContent(message),
    isError: true,
  };
}

function createTransactionService(env: CloudflareBindings) {
  return new TransactionService(drizzle(env.DB));
}

function getBindings() {
  if (!bindings) {
    throw new Error('MCP bindings have not been initialized');
  }

  return bindings;
}

function createMcpServer() {
  const mcpServer = new McpServer({
    name: 'moneyjar-mcp',
    version: '1.0.0',
  });

  mcpServer.registerTool(
    'create_transaction',
    {
      description: '记录一笔收入或支出。用于用户说“记一下”、“花了多少钱”、“收到工资”等场景。',
      inputSchema: McpCreateTransactionSchema,
    },
    async (args) => {
      const service = createTransactionService(getBindings());
      const created = await service.create(args);
      const transaction = TransactionResponseSchema.parse(created);

      return {
        content: createTextContent(`已记录${transaction.type === 'expense' ? '支出' : '收入'} ${transaction.amount} 元，分类为 ${transaction.category}。`),
        structuredContent: transaction,
      };
    }
  );

  mcpServer.registerTool(
    'get_transaction',
    {
      description: '查询单笔交易详情。用于用户指定某条记录或需要核对一笔账时。',
      inputSchema: McpTransactionIdSchema,
    },
    async (args) => {
      const service = createTransactionService(getBindings());
      const transaction = await service.getById(args.id);

      if (!transaction) {
        return createToolError('未找到对应的交易记录。');
      }

      const parsed = TransactionResponseSchema.parse(transaction);
      return {
        content: createTextContent(`已找到交易 #${parsed.id}，金额 ${parsed.amount} 元，分类 ${parsed.category}。`),
        structuredContent: parsed,
      };
    }
  );

  mcpServer.registerTool(
    'list_transactions',
    {
      description: '查询最近交易或某个周期内的交易。用于查看最近账单、回顾消费、快速核对流水等场景。',
      inputSchema: McpListTransactionsSchema,
    },
    async (args) => {
      const service = createTransactionService(getBindings());

      if (args.period) {
        const summary = await service.getBalanceReport(args.period);
        return {
          content: createTextContent(`已返回${args.period === 'week' ? '本周' : '本月'}汇总，共 ${summary.count} 笔交易。`),
          structuredContent: summary,
        };
      }

      const transactions = await service.listRecent(args.limit);
      const parsed = TransactionResponseSchema.array().parse(transactions);
      return {
        content: createTextContent(`已返回最近 ${parsed.length} 条交易记录。`),
        structuredContent: {
          items: parsed,
          limit: args.limit,
        },
      };
    }
  );

  mcpServer.registerTool(
    'delete_transaction',
    {
      description: '删除一笔错误记录。仅在用户明确表示要删除或撤销记账时使用。',
      inputSchema: McpTransactionIdSchema,
    },
    async (args) => {
      const service = createTransactionService(getBindings());
      const deleted = await service.softDelete(args.id);

      if (!deleted) {
        return createToolError('未找到需要删除的交易记录。');
      }

      const parsed = TransactionResponseSchema.parse(deleted);
      return {
        content: createTextContent(`已删除交易 #${parsed.id}。`),
        structuredContent: parsed,
      };
    }
  );

  mcpServer.registerTool(
    'get_balance_report',
    {
      description: '获取周或月的收入、支出、结余汇总。用于“本周花了多少”“这个月结余多少”等场景。',
      inputSchema: McpBalanceReportSchema,
    },
    async (args) => {
      const service = createTransactionService(getBindings());
      const summary = await service.getBalanceReport(args.period);

      return {
        content: createTextContent(`已返回${args.period === 'week' ? '本周' : '本月'}汇总：收入 ${summary.income} 元，支出 ${summary.expense} 元。`),
        structuredContent: summary,
      };
    }
  );

  return mcpServer;
}

export const mcpRoute = new Hono<{ Bindings: CloudflareBindings }>();

mcpRoute.use('*', createMcpAuthMiddleware());

mcpRoute.all('/', async (c) => {
  bindings = c.env;

  if (!mcpServer || !transport) {
    mcpServer = createMcpServer();
    transport = new StreamableHTTPTransport({
      enableJsonResponse: true,
    });
    await mcpServer.connect(transport);
  }

  return transport.handleRequest(c);
});
