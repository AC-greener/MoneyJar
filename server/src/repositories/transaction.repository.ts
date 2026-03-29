import { drizzle } from 'drizzle-orm/d1';
import { eq, and, gte, lte, desc } from 'drizzle-orm';
import { transactions } from '../db/schema';
import type { CreateTransactionInput } from '../types/transaction';

export class TransactionRepository {
  constructor(private db: ReturnType<typeof drizzle>) {}

  async create(data: CreateTransactionInput) {
    return this.db.insert(transactions).values(data).returning().get();
  }

  async getById(id: number) {
    return this.db.select().from(transactions).where(eq(transactions.id, id)).get();
  }

  async getAll() {
    return this.db.select().from(transactions).orderBy(desc(transactions.createdAt)).all();
  }

  async getRecent(limit: number) {
    return this.db.select().from(transactions).orderBy(desc(transactions.createdAt)).limit(limit).all();
  }

  async getByPeriod(startDate: string, endDate: string) {
    return this.db
      .select()
      .from(transactions)
      .where(and(gte(transactions.createdAt, startDate), lte(transactions.createdAt, endDate)))
      .orderBy(desc(transactions.createdAt))
      .all();
  }

  async delete(id: number) {
    return this.db.delete(transactions).where(eq(transactions.id, id)).returning().get();
  }
}
