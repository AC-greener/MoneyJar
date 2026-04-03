import { drizzle } from 'drizzle-orm/d1';
import { TransactionRepository } from '../repositories/transaction.repository';
import type { CreateTransactionInput } from '../types/transaction';
import type { Plan } from '../types/user';

// Free 用户每月最大交易条数限制
const FREE_MONTHLY_LIMIT = 50;

/**
 * 自定义配额超出错误，携带错误码和限额信息，供路由层解析并返回结构化响应
 */
export class QuotaExceededError extends Error {
  readonly code = 'QUOTA_EXCEEDED';
  readonly limit: number;

  constructor(limit: number) {
    super(`超出月度记账配额限制：${limit} 条`);
    this.limit = limit;
  }
}

function getWeekBounds() {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return {
    // 与 SQLite CURRENT_TIMESTAMP 格式（YYYY-MM-DD HH:MM:SS）保持一致
    start: monday.toISOString().split('T')[0] + ' 00:00:00',
    end: sunday.toISOString().split('T')[0] + ' 23:59:59',
  };
}

function getMonthBounds() {
  const now = new Date();
  // 与 SQLite CURRENT_TIMESTAMP 格式（YYYY-MM-DD HH:MM:SS）保持一致
  const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  return {
    start: startDate.toISOString().split('T')[0] + ' 00:00:00',
    end: endDate.toISOString().split('T')[0] + ' 23:59:59',
  };
}

export class TransactionService {
  private repo: TransactionRepository;

  constructor(db: ReturnType<typeof drizzle>) {
    this.repo = new TransactionRepository(db);
  }

  /**
   * 检查用户本月配额是否超限（仅对 Free 用户生效）
   * @throws QuotaExceededError 超出限额时抛出
   */
  async checkMonthlyQuota(userId: string, plan: Plan): Promise<void> {
    // Pro 用户无限制，直接跳过
    if (plan === 'pro') return;

    const count = await this.repo.countMonthlyByUserId(userId);
    if (count >= FREE_MONTHLY_LIMIT) {
      throw new QuotaExceededError(FREE_MONTHLY_LIMIT);
    }
  }

  /**
   * 创建交易记录。如果传入用户信息，则先检查配额再写入
   * @param data 交易数据
   * @param userId 可选用户 ID，传入时注入到记录并检查配额
   * @param plan 可选用户计划，与 userId 配合使用
   */
  async create(data: CreateTransactionInput, userId?: string, plan?: Plan) {
    // 有用户上下文时先检查月度配额
    if (userId && plan) {
      await this.checkMonthlyQuota(userId, plan);
    }

    // 构造写入数据，若有 userId 则注入
    const insertData = userId ? { ...data, userId } : data;
    return this.repo.create(insertData);
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

  /**
   * 根据用户身份和会员计划返回交易列表
   * Free 用户：仅返回最近 90 天的记录
   * Pro 用户：返回全量历史记录
   */
  async listByUser(userId: string, plan: Plan) {
    if (plan === 'pro') {
      return this.repo.getAllByUserId(userId);
    }
    return this.repo.getRecentByUserId(userId);
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

  /**
   * 按用户过滤的本周统计汇总
   */
  async getWeeklyTotalByUser(userId: string) {
    const { start, end } = getWeekBounds();
    const transactions = await this.repo.getByPeriodAndUserId(userId, start, end);
    return this.calculateTotals(transactions);
  }

  /**
   * 按用户过滤的本月统计汇总
   */
  async getMonthlyTotalByUser(userId: string) {
    const { start, end } = getMonthBounds();
    const transactions = await this.repo.getByPeriodAndUserId(userId, start, end);
    return this.calculateTotals(transactions);
  }

  async getBalanceReport(period: 'week' | 'month') {
    if (period === 'week') {
      return this.getWeeklyTotal();
    }

    return this.getMonthlyTotal();
  }

  async softDelete(id: number) {
    return this.repo.softDelete(id);
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
