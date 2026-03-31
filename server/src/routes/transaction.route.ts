import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { TransactionService } from '../services/transaction.service';
import {
  CreateTransactionSchema,
  TransactionResponseSchema,
  PeriodQuerySchema,
} from '../types/transaction';

export const transactionRoute = new Hono<{ Bindings: CloudflareBindings }>();

transactionRoute
  .post('/', async (c) => {
    const db = drizzle(c.env.DB);
    const service = new TransactionService(db);
    const body = await c.req.json();

    const parsed = CreateTransactionSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: parsed.error.issues, requestId: c.get('requestId') }, 400);
    }

    const result = await service.create(parsed.data);
    return c.json(TransactionResponseSchema.parse(result), 201);
  })
  .get('/', async (c) => {
    const db = drizzle(c.env.DB);
    const service = new TransactionService(db);

    const query = PeriodQuerySchema.parse(c.req.query());

    let data;
    if (query.period === 'week') {
      data = await service.getWeeklyTotal();
    } else if (query.period === 'month') {
      data = await service.getMonthlyTotal();
    } else {
      data = await service.list();
    }

    return c.json(data);
  })
  .get('/:id', async (c) => {
    const db = drizzle(c.env.DB);
    const service = new TransactionService(db);
    const id = Number(c.req.param('id'));

    const result = await service.getById(id);
    if (!result) {
      return c.json({ error: 'Transaction not found', requestId: c.get('requestId') }, 404);
    }

    return c.json(TransactionResponseSchema.parse(result));
  })
  .delete('/:id', async (c) => {
    const db = drizzle(c.env.DB);
    const service = new TransactionService(db);
    const id = Number(c.req.param('id'));

    const result = await service.softDelete(id);
    if (!result) {
      return c.json({ error: 'Transaction not found', requestId: c.get('requestId') }, 404);
    }

    return c.json({ message: 'Transaction deleted' });
  });
