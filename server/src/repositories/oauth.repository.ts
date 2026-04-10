import { drizzle } from 'drizzle-orm/d1';
import { eq, isNull, and, gt } from 'drizzle-orm';
import { oauthStates, loginExchangeTokens } from '../db/schema';

// OAuth 状态数据访问层：只做数据库 CRUD，不包含任何业务判断逻辑
export class OAuthStateRepository {
  constructor(private db: ReturnType<typeof drizzle>) {}

  /**
   * 创建新的 OAuth state 记录
   * @param returnTo 登录成功后跳转地址
   * @returns 生成的 state 值和存储记录
   */
  async create(returnTo: string = '/'): Promise<{ state: string; record: typeof oauthStates.$inferSelect }> {
    const id = crypto.randomUUID();
    const state = crypto.randomUUID(); // 使用 UUID 作为 state 值
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10分钟后过期

    const record = await this.db
      .insert(oauthStates)
      .values({
        id,
        state,
        returnTo,
        createdAt: now,
        expiresAt,
        usedAt: null,
      })
      .returning()
      .get();

    return { state, record };
  }

  /**
   * 根据 state 值查找未过期的记录
   * @param state OAuth state 值
   * @returns 找到的记录或 undefined
   */
  async findValidByState(state: string) {
    const now = new Date().toISOString();

    return this.db
      .select()
      .from(oauthStates)
      .where(
        and(
          eq(oauthStates.state, state),
          isNull(oauthStates.usedAt), // 未使用
          gt(oauthStates.expiresAt, now), // 未过期
        ),
      )
      .get();
  }

  /**
   * 标记 state 为已使用
   * @param id oauth_states 记录 ID
   */
  async markAsUsed(id: string) {
    const now = new Date().toISOString();

    return await this.db
      .update(oauthStates)
      .set({ usedAt: now })
      .where(eq(oauthStates.id, id))
      .returning()
      .get();
  }
}

// Login Exchange Token 数据访问层：只做数据库 CRUD
export class LoginExchangeTokenRepository {
  constructor(private db: ReturnType<typeof drizzle>) {}

  /**
   * 创建一次性登录交换码
   * @param userId 用户 ID
   * @param accessToken 短期 JWT
   * @param refreshToken 长期 token
   * @returns 生成的交换码和存储记录
   */
  async create(
    userId: string,
    accessToken: string,
    refreshToken: string,
  ): Promise<{ code: string; record: typeof loginExchangeTokens.$inferSelect }> {
    const id = crypto.randomUUID();
    const code = crypto.randomUUID(); // 使用 UUID 作为一次性交换码
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5分钟后过期

    const record = await this.db
      .insert(loginExchangeTokens)
      .values({
        id,
        code,
        userId,
        accessToken,
        refreshToken,
        createdAt: now,
        expiresAt,
        usedAt: null,
      })
      .returning()
      .get();

    return { code, record };
  }

  /**
   * 根据 code 值查找未过期的记录
   * @param code 一次性交换码
   * @returns 找到的记录或 undefined
   */
  async findValidByCode(code: string) {
    const now = new Date().toISOString();

    return this.db
      .select()
      .from(loginExchangeTokens)
      .where(
        and(
          eq(loginExchangeTokens.code, code),
          isNull(loginExchangeTokens.usedAt), // 未使用
          gt(loginExchangeTokens.expiresAt, now), // 未过期
        ),
      )
      .get();
  }

  /**
   * 标记 exchange code 为已使用
   * @param id login_exchange_tokens 记录 ID
   */
  async markAsUsed(id: string) {
    const now = new Date().toISOString();

    return await this.db
      .update(loginExchangeTokens)
      .set({ usedAt: now })
      .where(eq(loginExchangeTokens.id, id))
      .returning()
      .get();
  }
}
