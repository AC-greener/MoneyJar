import { Hono, type Context } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { AuthService } from '../services/auth.service';
import {
  GoogleLoginRequestSchema,
  RefreshRequestSchema,
  LogoutRequestSchema,
  LoginResponseSchema,
  GoogleStartQuerySchema,
  ExchangeCodeSchema,
  ExchangeResponseSchema,
} from '../types/auth';
import { createUserAuthMiddleware } from '../middlewares/user-auth';

export const authRoute = new Hono<{ Bindings: CloudflareBindings }>();

function isTestTokenEnabled(env: string) {
  return env === 'development' || env === 'staging';
}

function hasValidTestAuth(c: Context<{ Bindings: CloudflareBindings }>) {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return false;
  }

  const token = authHeader.slice('Bearer '.length).trim();
  return token.length > 0 && token === c.env.TEST_AUTH_TOKEN;
}

/**
 * GET /api/auth/google/start
 * Google OAuth 授权起点：生成 state，重定向到 Google 授权页
 */
authRoute.get('/google/start', async (c) => {
  const query = c.req.query();
  const parsed = GoogleStartQuerySchema.safeParse(query);

  const returnTo = parsed.success ? parsed.data.return_to : '/';

  const db = drizzle(c.env.DB);
  const service = new AuthService(db);

  try {
    const { redirectUrl } = await service.startOAuth(returnTo);

    // 302 重定向到 Google 授权页
    return c.redirect(redirectUrl, 302);
  } catch (err) {
    console.error('OAuth start failed:', err);
    return c.json({ error: 'OAuth 授权启动失败' }, 500);
  }
});

/**
 * GET /api/auth/google/callback
 * Google OAuth 回调：校验 state，使用 code 换取 token，生成 exchange code
 */
authRoute.get('/google/callback', async (c) => {
  const query = c.req.query();
  const { code, state, error } = query;

  // 如果 Google 返回错误
  if (error) {
    console.error('Google OAuth error:', error);
    // 跳转到前端 callback 页面并携带错误码
    return c.redirect(`/auth/callback?error=${encodeURIComponent(error)}`, 302);
  }

  if (!code || !state) {
    return c.json({ error: '缺少 code 或 state 参数' }, 400);
  }

  const db = drizzle(c.env.DB);
  const service = new AuthService(db);

  try {
    const result = await service.handleGoogleCallback(
      code,
      state,
      c.env.JWT_SECRET,
      c.env.GOOGLE_CLIENT_ID || '',
      c.env.GOOGLE_CLIENT_SECRET || '',
      c.env.GOOGLE_REDIRECT_URI || '',
    );

    // 跳转到前端 callback 页面并携带 exchange code
    const callbackUrl = `/auth/callback?exchange_code=${encodeURIComponent(result.exchangeCode)}&return_to=${encodeURIComponent(result.returnTo)}`;
    return c.redirect(callbackUrl, 302);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'UNKNOWN_ERROR';
    console.error('OAuth callback failed:', msg);

    // 根据错误类型返回不同错误码
    let errorCode = 'OAUTH_FAILED';
    if (msg === 'INVALID_STATE') {
      errorCode = 'invalid_state';
    } else if (msg === 'GOOGLE_TOKEN_EXCHANGE_FAILED') {
      errorCode = 'google_token_exchange_failed';
    } else if (msg === 'INVALID_GOOGLE_TOKEN') {
      errorCode = 'invalid_google_token';
    }

    return c.redirect(`/auth/callback?error=${encodeURIComponent(errorCode)}`, 302);
  }
});

/**
 * POST /api/auth/exchange
 * 前端 callback 页面使用一次性 exchange code 换取正式 tokens
 */
authRoute.post('/exchange', async (c) => {
  const body = await c.req.json();
  const parsed = ExchangeCodeSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: parsed.error.issues }, 400);
  }

  const db = drizzle(c.env.DB);
  const service = new AuthService(db);

  try {
    const result = await service.exchangeCode(parsed.data.code);

    return c.json(
      ExchangeResponseSchema.parse({
        access_token: result.accessToken,
        refresh_token: result.refreshToken,
        user: {
          id: result.user.id,
          email: result.user.email,
          name: result.user.name,
          avatarUrl: result.user.avatarUrl,
          plan: result.user.plan,
        },
      }),
      200,
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'UNKNOWN_ERROR';
    if (msg === 'INVALID_EXCHANGE_CODE') {
      return c.json({ error: '无效的 exchange code' }, 401);
    }
    throw err;
  }
});

/**
 * POST /api/auth/google
 * Google OAuth 登录：验证 Google ID Token，返回 access_token + refresh_token + 用户信息
 * 注意：此端点为 Android 原生登录保留，Web 登录请使用 /google/start → /google/callback 流程
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
      c.env.GOOGLE_CLIENT_ID || '',
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
 * POST /api/auth/test-token
 * development/staging 调试入口：为固定测试用户签发 access_token + refresh_token
 */
authRoute.post('/test-token', async (c) => {
  if (!isTestTokenEnabled(c.env.ENVIRONMENT || '')) {
    return c.json({ error: 'Not found' }, 404);
  }

  if (!c.env.TEST_AUTH_TOKEN) {
    throw new Error('TEST_AUTH_TOKEN is not configured');
  }

  if (!hasValidTestAuth(c)) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const db = drizzle(c.env.DB);
  const service = new AuthService(db);
  const result = await service.issueTestTokens(c.env.JWT_SECRET);

  return c.json(
    LoginResponseSchema.parse({
      access_token: result.accessToken,
      refresh_token: result.refreshToken,
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        avatarUrl: result.user.avatarUrl,
        plan: result.user.plan,
      },
    }),
    200,
  );
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
