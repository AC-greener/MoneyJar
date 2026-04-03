import { drizzle } from 'drizzle-orm/d1';
import { eq } from 'drizzle-orm';
import { featureFlags } from '../db/schema';
import type { Plan } from '../types/user';

// 会员计划等级映射（数值越大权限越高）
const PLAN_LEVELS: Record<Plan, number> = {
  free: 0,
  pro: 1,
};

/**
 * 功能开关服务：基于 feature_flags 表控制功能按会员计划开放
 */
export class FeatureService {
  constructor(private db: ReturnType<typeof drizzle>) {}

  /**
   * 检查指定功能是否对指定会员计划开放
   * 安全原则：功能不存在时默认拒绝，全局关闭时直接拒绝
   * @param featureKey 功能标识符，如 'ai_voice'
   * @param userPlan 用户当前会员计划
   * @returns true 表示可以使用，false 表示不可用
   */
  async isFeatureEnabled(featureKey: string, userPlan: Plan): Promise<boolean> {
    const flag = await this.db
      .select()
      .from(featureFlags)
      .where(eq(featureFlags.featureKey, featureKey))
      .get();

    // 功能不存在时默认拒绝（安全原则：默认关闭）
    if (!flag) return false;

    // 全局关闭时直接拒绝（可用于紧急关闭功能）
    if (!flag.enabled) return false;

    // 检查用户计划等级是否满足最低要求
    return PLAN_LEVELS[userPlan] >= PLAN_LEVELS[flag.minPlan as Plan];
  }
}
