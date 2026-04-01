import { drizzle } from 'drizzle-orm/d1';
import { eq, and } from 'drizzle-orm';
import { apiTokens } from '../db/schema';
import type { CreateApiTokenInput, TokenType } from '../types/api-token';

export class ApiTokenRepository {
  constructor(private db: ReturnType<typeof drizzle>) {}

  /**
   * 根据 token 值查找记录
   */
  async findByToken(token: string) {
    return this.db.select().from(apiTokens).where(eq(apiTokens.token, token)).get();
  }

  /**
   * 根据 token 和类型查找记录
   */
  async findByTokenAndType(token: string, type: TokenType) {
    return this.db
      .select()
      .from(apiTokens)
      .where(and(eq(apiTokens.token, token), eq(apiTokens.type, type)))
      .get();
  }

  /**
   * 创建新的 API Token
   */
  async create(data: CreateApiTokenInput) {
    return this.db.insert(apiTokens).values(data).returning().get();
  }
}
