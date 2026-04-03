import type { Context, Next } from 'hono';
import { verifyJwt } from '../services/auth.service';
import type { JwtPayload } from '../types/auth';

// 扩展 Hono 的 ContextVariableMap，使 c.var.user 拥有正确的 TypeScript 类型
declare module 'hono' {
  interface ContextVariableMap {
    user: JwtPayload;
  }
}

/**
 * 用户 JWT 鉴权中间件工厂函数。
 * 从请求头 Authorization: Bearer <token> 中提取并验证 JWT，
 * 验证通过后将解析结果注入 c.var.user，供后续路由处理函数使用。
 */
export function createUserAuthMiddleware() {
  return async (c: Context<{ Bindings: CloudflareBindings }>, next: Next) => {
    const authHeader = c.req.header('Authorization');

    // 检查 Authorization 头是否存在且格式正确
    if (!authHeader?.startsWith('Bearer ')) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    // 提取 token 字符串（去掉 "Bearer " 前缀）
    const token = authHeader.slice('Bearer '.length).trim();
    const jwtSecret = c.env.JWT_SECRET;

    // 验证 JWT 签名及有效期
    const payload = await verifyJwt(token, jwtSecret);
    if (!payload) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    // 将解析后的 JWT payload 注入 Hono 上下文变量，供路由层使用
    c.set('user', payload);
    await next();
  };
}
