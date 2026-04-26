import { beforeAll, describe, expect, it } from 'vitest';
import { drizzle } from 'drizzle-orm/d1';
import { TransactionService, QuotaExceededError } from '../../src/services/transaction.service';
import {
  seedTransaction,
  seedUser,
  setupIntegrationDb,
  testEnv,
} from '../helpers/integration';

function sqliteTimestamp(date: Date) {
  return date.toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '');
}

describe('TransactionService', () => {
  let service: TransactionService;

  beforeAll(async () => {
    await setupIntegrationDb('transaction-service-unit-setup');
    service = new TransactionService(drizzle(testEnv.DB));
  });

  it('enforces the free monthly quota and lets pro users bypass it', async () => {
    const freeUser = await seedUser();
    const proUser = await seedUser({ plan: 'pro' });

    for (let index = 0; index < 50; index += 1) {
      await seedTransaction({
        userId: freeUser.id,
        type: 'expense',
        amount: index + 1,
        category: '配额测试',
      });
      await seedTransaction({
        userId: proUser.id,
        type: 'expense',
        amount: index + 1,
        category: '配额测试',
      });
    }

    await expect(
      service.create({ type: 'expense', amount: 1, category: '配额测试' }, freeUser.id, 'free')
    ).rejects.toBeInstanceOf(QuotaExceededError);

    await expect(
      service.create({ type: 'expense', amount: 1, category: '配额测试' }, proUser.id, 'pro')
    ).resolves.toMatchObject({ userId: proUser.id, amount: 1 });
  });

  it('filters free users to recent transactions and returns full history for pro users', async () => {
    const user = await seedUser();
    const oldDate = sqliteTimestamp(new Date(Date.now() - 120 * 24 * 60 * 60 * 1000));

    await seedTransaction({
      userId: user.id,
      type: 'expense',
      amount: 12,
      category: '近期',
    });
    await seedTransaction({
      userId: user.id,
      type: 'expense',
      amount: 99,
      category: '历史',
      createdAt: oldDate,
    });

    const freeList = await service.listByUser(user.id, 'free');
    const proList = await service.listByUser(user.id, 'pro');

    expect(freeList.map((item) => item.category)).toContain('近期');
    expect(freeList.map((item) => item.category)).not.toContain('历史');
    expect(proList.map((item) => item.category)).toEqual(expect.arrayContaining(['近期', '历史']));
  });

  it('aggregates user monthly summaries with category totals', async () => {
    const user = await seedUser();

    await seedTransaction({
      userId: user.id,
      type: 'income',
      amount: 5000,
      category: '工资',
    });
    await seedTransaction({
      userId: user.id,
      type: 'expense',
      amount: 25,
      category: '餐饮',
    });
    await seedTransaction({
      userId: user.id,
      type: 'expense',
      amount: 15,
      category: '餐饮',
    });

    const summary = await service.getSummaryByUser(user.id, 'month');

    expect(summary.income).toBe(5000);
    expect(summary.expense).toBe(40);
    expect(summary.total).toBe(4960);
    expect(summary.transactions).toHaveLength(3);
    expect(summary.byCategory).toMatchObject({ '餐饮': 40 });
  });

  it('excludes soft-deleted transactions from direct reads', async () => {
    const created = await service.create({
      type: 'expense',
      amount: 20,
      category: '误记',
    });

    await service.softDelete(created.id);

    await expect(service.getById(created.id)).resolves.toBeUndefined();
  });
});
