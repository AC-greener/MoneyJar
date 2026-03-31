import { drizzle } from 'drizzle-orm/d1';
import { eq, and, gte, lte, desc, isNull, isNotNull } from 'drizzle-orm';
import { transactions } from '../db/schema';
import type { CreateTransactionInput } from '../types/transaction';

export class TransactionRepository {
  constructor(private db: ReturnType<typeof drizzle>) {}

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
    return this.db.update(transactions).set({ deletedAt: new Date().toISOString() }).where(eq(transactions.id, id)).returning().get();
  }

  async getDeleted() {
    return this.db.select().from(transactions).where(isNotNull(transactions.deletedAt)).orderBy(desc(transactions.createdAt)).all();
  }
}
