import { sql } from 'drizzle-orm';
import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

export const transactions = sqliteTable('transactions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  type: text('type', { length: 20 }).notNull(), // 'income' | 'expense'
  amount: real('amount').notNull(),
  category: text('category', { length: 50 }).notNull(),
  note: text('note', { length: 256 }),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
});
