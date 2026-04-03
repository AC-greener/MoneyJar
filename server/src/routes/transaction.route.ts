import { Hono } from 'hono';
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

transactionRoute
  .post('/', async (c) => {
    const db = drizzle(c.env.DB);
    const service = new TransactionService(db);
    const body = await c.req.json();

    const parsed = CreateTransactionSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: parsed.error.issues, requestId: c.get('requestId') }, 400);
    }

    // 从 JWT 中取得用户身份信息
    const user = c.var.user;
    const userId = user?.sub;
    const plan = user?.plan;

    try {
      // 传入用户上下文，服务层会自动检查配额并注入 userId
      const result = await service.create(parsed.data, userId, plan);
      return c.json(TransactionResponseSchema.parse(result), 201);
    } catch (err) {
      // 捕获配额超限错误，返回 403 及结构化错误信息
      if (err instanceof QuotaExceededError) {
        return c.json({ error: 'QUOTA_EXCEEDED', limit: err.limit, requestId: c.get('requestId') }, 403);
      }
      throw err;
    }
  })
  .get('/', async (c) => {
    const db = drizzle(c.env.DB);
    const service = new TransactionService(db);

    // 使用 safeParse 避免抛出未捕获异常，返回结构化错误
    const queryParsed = PeriodQuerySchema.safeParse(c.req.query());
    if (!queryParsed.success) {
      return c.json({ error: queryParsed.error.issues }, 400);
    }
    const query = queryParsed.data;

    // 从 JWT 中取得用户身份信息
    const user = c.var.user;
    const userId = user?.sub;
    const plan = user?.plan;

    let data;
    if (query.period === 'week') {
      // 有用户上下文时按用户过滤统计，否则返回全局统计
      data = userId ? await service.getWeeklyTotalByUser(userId) : await service.getWeeklyTotal();
    } else if (query.period === 'month') {
      data = userId ? await service.getMonthlyTotalByUser(userId) : await service.getMonthlyTotal();
    } else {
      // 无 period 参数时：有用户上下文则自动按计划过滤历史范围，否则返回全量
      data = userId && plan
        ? await service.listByUser(userId, plan)
        : await service.list();
    }

    return c.json(data);
  })
  .get('/:id', async (c) => {
    const db = drizzle(c.env.DB);
    const service = new TransactionService(db);
    const id = Number(c.req.param('id'));

    // 防御非数字 id（如 /abc）
    if (isNaN(id)) {
      return c.json({ error: 'Invalid id', requestId: c.get('requestId') }, 400);
    }

    const result = await service.getById(id);
    if (!result) {
      return c.json({ error: 'Transaction not found', requestId: c.get('requestId') }, 404);
    }

    // 校验交易归属（防止水平越权），返回 404 避免暴露资源存在性
    if (result.userId && result.userId !== c.var.user?.sub) {
      return c.json({ error: 'Transaction not found', requestId: c.get('requestId') }, 404);
    }

    return c.json(TransactionResponseSchema.parse(result));
  })
  .delete('/:id', async (c) => {
    const db = drizzle(c.env.DB);
    const service = new TransactionService(db);
    const id = Number(c.req.param('id'));

    // 防御非数字 id（如 /abc）
    if (isNaN(id)) {
      return c.json({ error: 'Invalid id', requestId: c.get('requestId') }, 400);
    }

    // 先查询记录，再校验归属，防止水平越权
    const existing = await service.getById(id);
    if (!existing) {
      return c.json({ error: 'Transaction not found', requestId: c.get('requestId') }, 404);
    }

    // 校验交易归属（防止水平越权），返回 404 避免暴露资源存在性
    if (existing.userId && existing.userId !== c.var.user?.sub) {
      return c.json({ error: 'Transaction not found', requestId: c.get('requestId') }, 404);
    }

    const result = await service.softDelete(id);
    if (!result) {
      return c.json({ error: 'Transaction not found', requestId: c.get('requestId') }, 404);
    }

    return c.json({ message: 'Transaction deleted' });
  });
