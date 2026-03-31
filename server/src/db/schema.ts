import { sql } from 'drizzle-orm';
import { sqliteTable, text, integer, real, index } from 'drizzle-orm/sqlite-core';

export const transactions = sqliteTable('transactions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  type: text('type', { length: 20 }).notNull(), // 'income' | 'expense'
  amount: real('amount').notNull(),
  category: text('category', { length: 50 }).notNull(),
  note: text('note', { length: 256 }),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  deletedAt: text('deleted_at'), // NULL = 未删除，ISO 时间戳 = 已删除
});

export const requestLogs = sqliteTable('request_logs', {
  id: text('id').primaryKey(),
  requestPath: text('request_path').notNull(),
  requestMethod: text('request_method').notNull(),
  statusCode: integer('status_code').notNull(),
  duration: integer('duration').notNull(),
  requestBody: text('request_body'),
  responseBody: text('response_body'),
  errorMessage: text('error_message'),
  clientIp: text('client_ip'),
  userAgent: text('user_agent'),
  timestamp: integer('timestamp', { mode: 'timestamp' }).notNull(),
  aiParsed: integer('ai_parsed', { mode: 'boolean' }),
  aiModel: text('ai_model'),
  aiProcessingTime: integer('ai_processing_time'),
}, (table) => ({
  idxRequestId: index('idx_request_id').on(table.id),
  idxTimestamp: index('idx_timestamp').on(table.timestamp),
  idxStatusCode: index('idx_status_code').on(table.statusCode),
  idxRequestPath: index('idx_request_path').on(table.requestPath),
}));
