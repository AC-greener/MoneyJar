import { drizzle } from 'drizzle-orm/d1';
import { TransactionRepository } from '../repositories/transaction.repository';
import type { CreateTransactionInput } from '../types/transaction';

function getWeekBounds() {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return {
    start: monday.toISOString().split('T')[0],
    end: sunday.toISOString().split('T')[0],
  };
}

function getMonthBounds() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
  return { start, end };
}

export class TransactionService {
  private repo: TransactionRepository;

  constructor(db: ReturnType<typeof drizzle>) {
    this.repo = new TransactionRepository(db);
  }

  async create(data: CreateTransactionInput) {
    return this.repo.create(data);
  }

  async getById(id: number) {
    return this.repo.getById(id);
  }

  async list() {
    return this.repo.getAll();
  }

  async listRecent(limit: number) {
    return this.repo.getRecent(limit);
  }

  async getWeeklyTotal() {
    const { start, end } = getWeekBounds();
    const transactions = await this.repo.getByPeriod(start, end);
    return this.calculateTotals(transactions);
  }

  async getMonthlyTotal() {
    const { start, end } = getMonthBounds();
    const transactions = await this.repo.getByPeriod(start, end);
    return this.calculateTotals(transactions);
  }

  async getBalanceReport(period: 'week' | 'month') {
    if (period === 'week') {
      return this.getWeeklyTotal();
    }

    return this.getMonthlyTotal();
  }

  async delete(id: number) {
    return this.repo.delete(id);
  }

  private calculateTotals(transactions: { type: string; amount: number }[]) {
    const income = transactions
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    const expense = transactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    return {
      income,
      expense,
      balance: income - expense,
      count: transactions.length,
    };
  }
}
