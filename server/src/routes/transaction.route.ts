import { Hono, type Context } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { TransactionService, QuotaExceededError } from '../services/transaction.service';
import {
  CreateTransactionSchema,
  TransactionResponseSchema,
  PeriodQuerySchema,
} from '../types/transaction';
import { createUserAuthMiddleware } from '../middlewares/user-auth';

export const transactionRoute = new Hono<{ Bindings: CloudflareBindings }>();

// 所有交易路由均需 JWT 鉴权
transactionRoute.use('/*', createUserAuthMiddleware());

// 辅助函数：创建交易处理器
async function handleCreate(c: Context) {
  const db = drizzle(c.env.DB);
  const service = new TransactionService(db);
  const body = await c.req.json();

  const parsed = CreateTransactionSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.issues, requestId: c.get('requestId') }, 400);
  }

  const user = c.var.user;
  const userId = user?.sub;
  const plan = user?.plan;

  try {
    const result = await service.create(parsed.data, userId, plan);
    return c.json(TransactionResponseSchema.parse(result), 201);
  } catch (err) {
    if (err instanceof QuotaExceededError) {
      return c.json({ error: 'QUOTA_EXCEEDED', limit: err.limit, requestId: c.get('requestId') }, 403);
    }
    throw err;
  }
}

// 辅助函数：获取列表或汇总处理器
async function handleList(c: Context) {
  const db = drizzle(c.env.DB);
  const service = new TransactionService(db);

  const queryParsed = PeriodQuerySchema.safeParse(c.req.query());
  if (!queryParsed.success) {
    return c.json({ error: queryParsed.error.issues }, 400);
  }
  const query = queryParsed.data;

  const user = c.var.user;
  const userId = user?.sub;
  const plan = user?.plan;

  let data;
  if (query.period === 'week') {
    data = userId ? await service.getWeeklyTotalByUser(userId) : await service.getWeeklyTotal();
  } else if (query.period === 'month') {
    data = userId ? await service.getMonthlyTotalByUser(userId) : await service.getMonthlyTotal();
  } else {
    data = userId && plan
      ? await service.listByUser(userId, plan)
      : await service.list();
  }

  return c.json(data);
}

// 创建交易
transactionRoute.post('/', handleCreate);

// 获取交易列表或汇总
transactionRoute.get('/', handleList);

// 获取单个交易
transactionRoute.get('/:id', async (c) => {
  const db = drizzle(c.env.DB);
  const service = new TransactionService(db);
  const id = Number(c.req.param('id'));

  if (isNaN(id)) {
    return c.json({ error: 'Invalid id', requestId: c.get('requestId') }, 400);
  }

  const result = await service.getById(id);
  if (!result) {
    return c.json({ error: 'Transaction not found', requestId: c.get('requestId') }, 404);
  }

  if (result.userId && result.userId !== c.var.user?.sub) {
    return c.json({ error: 'Transaction not found', requestId: c.get('requestId') }, 404);
  }

  return c.json(TransactionResponseSchema.parse(result));
});

// 删除交易
transactionRoute.delete('/:id', async (c) => {
  const db = drizzle(c.env.DB);
  const service = new TransactionService(db);
  const id = Number(c.req.param('id'));

  if (isNaN(id)) {
    return c.json({ error: 'Invalid id', requestId: c.get('requestId') }, 400);
  }

  const existing = await service.getById(id);
  if (!existing) {
    return c.json({ error: 'Transaction not found', requestId: c.get('requestId') }, 404);
  }

  if (existing.userId && existing.userId !== c.var.user?.sub) {
    return c.json({ error: 'Transaction not found', requestId: c.get('requestId') }, 404);
  }

  const result = await service.softDelete(id);
  if (!result) {
    return c.json({ error: 'Transaction not found', requestId: c.get('requestId') }, 404);
  }

  return c.json({ message: 'Transaction deleted' });
});
