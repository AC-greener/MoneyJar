import { drizzle } from 'drizzle-orm/d1';
import { eq, and, lt } from 'drizzle-orm';
import { refreshTokens } from '../db/schema';

/**
 * Token 安全工具：存储 token 的哈希值而非原始值
 * 验证时比对 SHA-256 哈希，防止数据库泄露后 tokens 被直接滥用
 */
async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// 刷新令牌数据访问层：只做数据库 CRUD，不包含任何业务判断逻辑
export class RefreshTokenRepository {
  constructor(private db: ReturnType<typeof drizzle>) {}

  // 创建新的 refresh token 记录，存储 token 的哈希值而非原始值
  async create(userId: string, token: string, expiresAt: string) {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const tokenHash = await hashToken(token);

    return this.db
      .insert(refreshTokens)
      .values({
        id,
        userId,
        token: tokenHash, // 存储哈希值而非原始 token
        expiresAt,
        createdAt: now,
        revoked: false,
      })
      .returning()
      .get();
  }

  // 根据 token 字符串查找令牌记录（通过哈希值比对）
  async findByToken(token: string) {
    const tokenHash = await hashToken(token);
    return this.db
      .select()
      .from(refreshTokens)
      .where(eq(refreshTokens.token, tokenHash))
      .get();
  }

  // 将指定 token 的 revoked 标记设为 true（软吊销，不物理删除）
  async revoke(token: string) {
    const tokenHash = await hashToken(token);
    return this.db
      .update(refreshTokens)
      .set({ revoked: true })
      .where(eq(refreshTokens.token, tokenHash))
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
