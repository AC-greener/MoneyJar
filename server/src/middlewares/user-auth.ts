import type { Context, Next } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { jwt } from 'hono/jwt';
import type { JwtPayload } from '../types/auth';
import { JwtPayloadSchema } from '../types/auth';

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
    const verifyJwtMiddleware = jwt({
      secret: c.env.JWT_SECRET,
      alg: 'HS256',
    });

    try {
      await verifyJwtMiddleware(c, async () => {});
    } catch (err) {
      if (err instanceof HTTPException) {
        return c.json({ error: 'Unauthorized' }, 401);
      }
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const parsed = JwtPayloadSchema.safeParse(c.get('jwtPayload'));
    if (!parsed.success) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    c.set('user', parsed.data);
    await next();
  };
}
