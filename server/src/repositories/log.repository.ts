import { drizzle } from 'drizzle-orm/d1';
import { eq } from 'drizzle-orm';
import { requestLogs } from '../db/schema';

/**
 * 日志数据访问层（Repository）
 *
 * 职责：封装所有对 request_logs 表的数据库操作
 *
 * 设计原则：
 * - 不包含任何业务逻辑，仅做数据读写
 * - 所有查询通过 Drizzle ORM 完成，禁止拼接原始 SQL
 * - 方法参数和返回值类型与 types/log.ts 中的 Schema 对齐
 */
export class LogRepository {
  constructor(private db: ReturnType<typeof drizzle>) {}

  /**
   * 插入一条新的请求日志
   *
   * 数据库操作：
   * - INSERT INTO request_logs VALUES (...)
   * - 自动生成 timestamp 字段
   * - 返回插入的完整记录
   *
   * @param data - 日志数据（不含 timestamp，由本方法自动添加）
   */
  async create(data: {
    id: string;
    requestPath: string;
    requestMethod: string;
    statusCode: number;
    duration: number;
    requestBody: string | null;
    responseBody: string | null;
    errorMessage: string | null;
    clientIp: string | null;
    userAgent: string | null;
    aiParsed?: boolean;
    aiModel?: string;
    aiProcessingTime?: number;
  }) {
    return this.db.insert(requestLogs).values({
      ...data,
      timestamp: new Date(),
    }).returning().get();
  }

  /**
   * 根据 ID 查询单条日志
   *
   * 数据库操作：
   * - SELECT * FROM request_logs WHERE id = ?
   *
   * @param id - 日志 ID（即请求的 requestId）
   * @returns 匹配的日志记录，或 undefined（未找到）
   */
  async getById(id: string) {
    return this.db
      .select()
      .from(requestLogs)
      .where(eq(requestLogs.id, id))
      .get();
  }
}
