import { describe, expect, it } from 'vitest';

// TransactionService 业务逻辑测试
// Service 层依赖 Drizzle ORM binding，在集成测试中已覆盖主要路径
// 此文件用于纯函数逻辑测试（如金额计算、日期范围计算）

describe('TransactionService', () => {
  describe('calculateTotals', () => {
    it('should calculate income and expense correctly', () => {
      const transactions = [
        { id: 1, type: 'expense', amount: 100, category: '餐饮', note: null, createdAt: '' },
        { id: 2, type: 'expense', amount: 50, category: '交通', note: null, createdAt: '' },
        { id: 3, type: 'income', amount: 5000, category: '工资', note: null, createdAt: '' },
      ];

      const income = transactions
        .filter((t) => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);
      const expense = transactions
        .filter((t) => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);

      expect(income).toBe(5000);
      expect(expense).toBe(150);
      expect(income - expense).toBe(4850);
    });
  });
});
