import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { AuthService } from '../services/auth.service';
import {
  GoogleLoginRequestSchema,
  RefreshRequestSchema,
  LogoutRequestSchema,
} from '../types/auth';
import { createUserAuthMiddleware } from '../middlewares/user-auth';

export const authRoute = new Hono<{ Bindings: CloudflareBindings }>();

/**
 * POST /api/auth/google
 * Google OAuth 登录：验证 Google ID Token，返回 access_token + refresh_token + 用户信息
 */
authRoute.post('/google', async (c) => {
  const body = await c.req.json();
  const parsed = GoogleLoginRequestSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.issues }, 400);
  }

  const db = drizzle(c.env.DB);
  const service = new AuthService(db);

  try {
    const result = await service.loginWithGoogle(
      parsed.data.id_token,
      c.env.JWT_SECRET,
      c.env.GOOGLE_CLIENT_ID,
    );

    return c.json(
      {
        access_token: result.accessToken,
        refresh_token: result.refreshToken,
        user: {
          id: result.user.id,
          email: result.user.email,
          name: result.user.name,
          avatarUrl: result.user.avatarUrl,
          plan: result.user.plan,
        },
      },
      200,
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'UNKNOWN_ERROR';
    if (msg === 'INVALID_GOOGLE_TOKEN') {
      return c.json({ error: 'Google Token 无效' }, 401);
    }
    throw err;
  }
});

/**
 * POST /api/auth/refresh
 * 使用 refresh_token 换取新的 access_token（refresh_token 本身不轮换）
 */
authRoute.post('/refresh', async (c) => {
  const body = await c.req.json();
  const parsed = RefreshRequestSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.issues }, 400);
  }

  const db = drizzle(c.env.DB);
  const service = new AuthService(db);

  try {
    const result = await service.refreshAccessToken(
      parsed.data.refresh_token,
      c.env.JWT_SECRET,
    );
    return c.json({ access_token: result.accessToken }, 200);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'UNKNOWN_ERROR';
    if (['INVALID_REFRESH_TOKEN', 'TOKEN_REVOKED', 'TOKEN_EXPIRED'].includes(msg)) {
      return c.json({ error: '无效的 refresh token' }, 401);
    }
    throw err;
  }
});

/**
 * POST /api/auth/logout
 * 登出：软吊销 refresh_token，后续使用该 token 换取 access_token 将失败
 */
authRoute.post('/logout', async (c) => {
  const body = await c.req.json();
  const parsed = LogoutRequestSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.issues }, 400);
  }

  const db = drizzle(c.env.DB);
  const service = new AuthService(db);
  await service.logout(parsed.data.refresh_token);
  return c.json({ message: '已登出' }, 200);
});

/**
 * GET /api/auth/me
 * 获取当前登录用户的详细信息（需要有效的 Bearer JWT）
 */
authRoute
  .use('/me', createUserAuthMiddleware())
  .get('/me', async (c) => {
    // 从 JWT 中间件注入的 payload 取得用户 UUID
    const userPayload = c.var.user;
    const db = drizzle(c.env.DB);
    const service = new AuthService(db);

    const user = await service.getUserById(userPayload.sub);
    if (!user) {
      return c.json({ error: '用户不存在' }, 404);
    }

    return c.json({
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      plan: user.plan,
    });
  });
