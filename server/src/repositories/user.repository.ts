import { drizzle } from 'drizzle-orm/d1';
import { eq } from 'drizzle-orm';
import { users } from '../db/schema';

// 用户数据访问层：只做数据库 CRUD，不包含任何业务判断逻辑
export class UserRepository {
  constructor(private db: ReturnType<typeof drizzle>) {}

  // 根据 UUID 查找用户，不存在时返回 undefined
  async findById(id: string) {
    return this.db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .get();
  }

  // 根据 Google OAuth sub 字段查找用户，不存在时返回 undefined
  async findByGoogleId(googleId: string) {
    return this.db
      .select()
      .from(users)
      .where(eq(users.googleId, googleId))
      .get();
  }

  // 根据 googleId 执行 upsert：不存在则插入，存在则更新 email/name/avatarUrl 和 updatedAt
  async upsertByGoogleId(data: {
    googleId: string;
    email: string;
    name: string | null;
    avatarUrl: string | null;
  }) {
    const now = new Date().toISOString();
    const id = crypto.randomUUID();

    return this.db
      .insert(users)
      .values({
        id,
        googleId: data.googleId,
        email: data.email,
        name: data.name,
        avatarUrl: data.avatarUrl,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        // 以 googleId 唯一索引作为冲突检测目标
        target: users.googleId,
        set: {
          email: data.email,
          name: data.name,
          avatarUrl: data.avatarUrl,
          updatedAt: now,
        },
      })
      .returning()
      .get();
  }

  // 更新用户会员计划及计划时间（planStartedAt/planExpiresAt 可选，不传则不更新）
  async updatePlan(
    id: string,
    plan: 'free' | 'pro',
    planStartedAt?: string,
    planExpiresAt?: string,
  ) {
    const now = new Date().toISOString();

    return this.db
      .update(users)
      .set({
        plan,
        planStartedAt: planStartedAt ?? null,
        planExpiresAt: planExpiresAt ?? null,
        updatedAt: now,
      })
      .where(eq(users.id, id))
      .returning()
      .get();
  }
}
