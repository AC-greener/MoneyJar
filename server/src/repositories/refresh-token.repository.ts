import { drizzle } from 'drizzle-orm/d1';
import { eq, and, lt } from 'drizzle-orm';
import { refreshTokens } from '../db/schema';

// 刷新令牌数据访问层：只做数据库 CRUD，不包含任何业务判断逻辑
export class RefreshTokenRepository {
  constructor(private db: ReturnType<typeof drizzle>) {}

  // 创建新的 refresh token 记录，id 使用 Web Crypto API 生成 UUID
  async create(userId: string, token: string, expiresAt: string) {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    return this.db
      .insert(refreshTokens)
      .values({
        id,
        userId,
        token,
        expiresAt,
        createdAt: now,
        revoked: false,
      })
      .returning()
      .get();
  }

  // 根据 token 字符串查找令牌记录（包含关联的 userId 等信息）
  async findByToken(token: string) {
    return this.db
      .select()
      .from(refreshTokens)
      .where(eq(refreshTokens.token, token))
      .get();
  }

  // 将指定 token 的 revoked 标记设为 true（软吊销，不物理删除）
  async revoke(token: string) {
    return this.db
      .update(refreshTokens)
      .set({ revoked: true })
      .where(eq(refreshTokens.token, token))
      .returning()
      .get();
  }

  // 清理指定用户的所有过期令牌（expiresAt 早于当前时间的记录）
  async deleteExpiredByUserId(userId: string) {
    const now = new Date().toISOString();

    return this.db
      .delete(refreshTokens)
      .where(
        and(
          eq(refreshTokens.userId, userId),
          lt(refreshTokens.expiresAt, now),
        ),
      )
      .returning()
      .all();
  }
}
