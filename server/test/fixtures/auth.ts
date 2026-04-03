import { signJwt } from '../../src/services/auth.service';

/**
 * 创建测试用 JWT（无需 Google OAuth，直接签发）
 */
export async function createTestJwt(
  env: { JWT_SECRET: string },
  plan: 'free' | 'pro' = 'free',
  userId: string = 'test-user-00000000-0000-0000-0000-000000000001'
): Promise<string> {
  return signJwt(
    { sub: userId, email: 'test@moneyjar.test', plan },
    env.JWT_SECRET
  );
}

/**
 * 创建测试用认证头（返回 Bearer <token> 格式字符串）
 */
export async function createAuthHeader(
  env: { JWT_SECRET: string },
  plan: 'free' | 'pro' = 'free',
  userId?: string
): Promise<string> {
  const token = await createTestJwt(env, plan, userId);
  return `Bearer ${token}`;
}
