import { drizzle } from 'drizzle-orm/d1';
import { eq, and, gte, lte, desc, isNull, isNotNull, count } from 'drizzle-orm';
import { transactions } from '../db/schema';
import type { CreateTransactionInput } from '../types/transaction';

export class TransactionRepository {
  constructor(private db: ReturnType<typeof drizzle>) {}

  /**
   * 将 Date 对象转为 SQLite CURRENT_TIMESTAMP 兼容格式（YYYY-MM-DD HH:MM:SS），
   * 保证与数据库存储的字符串在字典序比较时一致
   */
  private toSQLiteTimestamp(date: Date): string {
    return date.toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '');
  }

  async create(data: CreateTransactionInput) {
    return this.db.insert(transactions).values(data).returning().get();
  }

  async getById(id: number) {
    return this.db.select().from(transactions).where(and(eq(transactions.id, id), isNull(transactions.deletedAt))).get();
  }

  async getAll() {
    return this.db.select().from(transactions).where(isNull(transactions.deletedAt)).orderBy(desc(transactions.createdAt)).all();
  }

  async getRecent(limit: number) {
    return this.db.select().from(transactions).where(isNull(transactions.deletedAt)).orderBy(desc(transactions.createdAt)).limit(limit).all();
  }

  async getByPeriod(startDate: string, endDate: string) {
    return this.db
      .select()
      .from(transactions)
      .where(and(gte(transactions.createdAt, startDate), lte(transactions.createdAt, endDate), isNull(transactions.deletedAt)))
      .orderBy(desc(transactions.createdAt))
      .all();
  }

  async softDelete(id: number) {
    // 软删除时写入 SQLite 兼容格式的时间戳
    return this.db.update(transactions).set({ deletedAt: this.toSQLiteTimestamp(new Date()) }).where(eq(transactions.id, id)).returning().get();
  }

  async getDeleted() {
    return this.db.select().from(transactions).where(isNotNull(transactions.deletedAt)).orderBy(desc(transactions.createdAt)).all();
  }

  /**
   * 查询用户本月的交易总数（用于配额检查）
   */
  async countMonthlyByUserId(userId: string): Promise<number> {
    // 获取本月第一天和最后一天，使用 SQLite CURRENT_TIMESTAMP 兼容格式
    const now = new Date();
    const monthStart = this.toSQLiteTimestamp(new Date(now.getFullYear(), now.getMonth(), 1));
    const monthEnd = this.toSQLiteTimestamp(new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999));

    const result = await this.db
      .select({ count: count() })
      .from(transactions)
      .where(and(
        eq(transactions.userId, userId),
        gte(transactions.createdAt, monthStart),
        lte(transactions.createdAt, monthEnd),
        isNull(transactions.deletedAt),
      ))
      .get();

    return result?.count ?? 0;
  }

  /**
   * 查询用户所有未删除的交易（带用户过滤，Pro 用户全量历史）
   */
  async getAllByUserId(userId: string) {
    return this.db.select().from(transactions)
      .where(and(eq(transactions.userId, userId), isNull(transactions.deletedAt)))
      .orderBy(desc(transactions.createdAt))
      .all();
  }

  /**
   * 查询用户最近 90 天的交易（Free 用户历史数据限制）
   */
  async getRecentByUserId(userId: string) {
    // 使用 SQLite CURRENT_TIMESTAMP 兼容格式，保证字典序比较正确
    const ninetyDaysAgo = this.toSQLiteTimestamp(new Date(Date.now() - 90 * 24 * 60 * 60 * 1000));
    return this.db.select().from(transactions)
      .where(and(
        eq(transactions.userId, userId),
        gte(transactions.createdAt, ninetyDaysAgo),
        isNull(transactions.deletedAt),
      ))
      .orderBy(desc(transactions.createdAt))
      .all();
  }

  /**
   * 查询用户指定周期内的交易（用于统计，带用户过滤）
   */
  async getByPeriodAndUserId(userId: string, startDate: string, endDate: string) {
    return this.db.select().from(transactions)
      .where(and(
        eq(transactions.userId, userId),
        gte(transactions.createdAt, startDate),
        lte(transactions.createdAt, endDate),
        isNull(transactions.deletedAt),
      ))
      .orderBy(desc(transactions.createdAt))
      .all();
  }
}
