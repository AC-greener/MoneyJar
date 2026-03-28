import { drizzle } from 'drizzle-orm/d1';
import { LogRepository } from '../repositories/log.repository';

/**
 * 日志服务层（Service）
 *
 * 职责：
 * - 封装 Repository 层，提供业务逻辑层面的接口
 * - 初始化并持有 Repository 实例（依赖注入）
 * - 在后续扩展中，可在此层添加缓存、日志聚合等业务逻辑
 *
 * 层级关系：
 * LogService → LogRepository → Drizzle ORM → D1 Database
 */
export class LogService {
  private repo: LogRepository;

  constructor(env: CloudflareBindings) {
    // 初始化 Drizzle ORM 实例，传入 D1 Database binding
    const db = drizzle(env.DB);
    // 初始化 Repository，持有数据库连接
    this.repo = new LogRepository(db);
  }

  /**
   * 创建请求日志
   *
   * 透传至 Repository，实际上是写入 D1 数据库
   *
   * @param data - 包含所有日志字段的数据对象
   */
  async createLog(data: {
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
    return this.repo.create(data);
  }

  /**
   * 根据 ID 获取单条日志
   *
   * 透传至 Repository，用于查询特定请求的日志记录
   *
   * @param id - 日志 ID（即请求的 requestId）
   */
  async getLogById(id: string) {
    return this.repo.getById(id);
  }
}
