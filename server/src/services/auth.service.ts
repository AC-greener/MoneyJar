import { drizzle } from 'drizzle-orm/d1';
import { sign, verify } from 'hono/jwt';
import { jwtVerify, createRemoteJWKSet } from 'jose';
import { UserRepository } from '../repositories/user.repository';
import { RefreshTokenRepository } from '../repositories/refresh-token.repository';
import { OAuthStateRepository, LoginExchangeTokenRepository } from '../repositories/oauth.repository';
import { JwtPayloadSchema, type JwtPayload } from '../types/auth';

// Google OAuth 配置（仅用于 token 交换和用户信息获取，client_id 通过参数传入）
const GOOGLE_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_ENDPOINT = 'https://www.googleapis.com/oauth2/v2/userinfo';
const GOOGLE_JWKS_URI = 'https://www.googleapis.com/oauth2/v3/certs';

// ─────────────────────────────────────────────
// Google ID Token 生产级验证（使用 jose 库验签）
// ─────────────────────────────────────────────

/**
 * 生产级 Google ID Token 验证
 * 使用 jose 库的 jwtVerify 进行 RS256 签名校验
 */
export async function verifyGoogleIdToken(
  idToken: string,
  googleClientId: string,
): Promise<{ sub: string; email: string; name: string; picture: string } | null> {
  try {
    // 创建 Google JWKS（JSON Web Key Set）端点
    const JWKS = createRemoteJWKSet(new URL(GOOGLE_JWKS_URI));

    // 验证 JWT 签名、audience、issuer
    const { payload } = await jwtVerify(idToken, JWKS, {
      issuer: 'https://accounts.google.com',
      audience: googleClientId,
    });

    // 提取用户信息
    const sub = payload.sub as string;
    const email = payload.email as string;
    const name = (payload.name as string) || '';
    const picture = (payload.picture as string) || '';

    if (!sub || !email) {
      return null;
    }

    return { sub, email, name, picture };
  } catch (err) {
    console.error('Google ID Token verification failed:', err);
    return null;
  }
}

/**
 * 使用 authorization code 向 Google 换取 token
 * 用于 OAuth callback 流程
 */
export async function exchangeGoogleCode(
  code: string,
  googleClientId: string,
  googleClientSecret: string,
  googleRedirectUri: string,
): Promise<{ access_token: string; id_token: string; refresh_token?: string } | null> {
  console.log('[OAuth] Token exchange params:', {
    code: code ? `${code.slice(0, 20)}...` : 'null',
    clientId: googleClientId,
    redirectUri: googleRedirectUri,
  });

  try {
    const response = await fetch(GOOGLE_TOKEN_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: googleClientId,
        client_secret: googleClientSecret,
        redirect_uri: googleRedirectUri,
        grant_type: 'authorization_code',
      }),
    });

    console.log('[OAuth] Token exchange response status:', response.status);

    if (!response.ok) {
      const error = await response.text();
      console.error('[OAuth] Token exchange failed:', response.status, error);
      return null;
    }

    const data = await response.json() as {
      access_token: string;
      id_token: string;
      refresh_token?: string;
    };
    console.log('[OAuth] Token exchange success');
    return {
      access_token: data.access_token,
      id_token: data.id_token,
      refresh_token: data.refresh_token,
    };
  } catch (err) {
    console.error('[OAuth] Token exchange error:', err);
    return null;
  }
}

/**
 * 获取 Google 用户信息
 */
export async function getGoogleUserInfo(
  accessToken: string,
): Promise<{ sub: string; email: string; name: string; picture: string } | null> {
  try {
    const response = await fetch(GOOGLE_USERINFO_ENDPOINT, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────
// JWT 签发与验证（HS256，使用 Web Crypto API）
// ─────────────────────────────────────────────

/**
 * 签发 HS256 JWT Access Token，有效期 15 分钟
 */
export async function signJwt(
  payload: { sub: string; email: string; plan: string },
  secret: string,
): Promise<string> {
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + 15 * 60; // 有效期 15 分钟

  return sign(
    { ...payload, iat, exp },
    secret,
    'HS256',
  );
}

/**
 * 验证 HS256 JWT Access Token，验证通过返回 payload，否则返回 null
 */
export async function verifyJwt(
  token: string,
  secret: string,
): Promise<JwtPayload | null> {
  try {
    const rawPayload = await verify(token, secret, 'HS256');

    // 用 Zod Schema 做结构校验，确保字段类型安全
    const parsed = JwtPayloadSchema.safeParse(rawPayload);
    return parsed.success ? parsed.data : null;
  } catch {
    // 解析失败或签名异常均视为无效 token
    return null;
  }
}

// ─────────────────────────────────────────────
// AuthService 业务逻辑层
// ─────────────────────────────────────────────

export class AuthService {
  private userRepo: UserRepository;
  private refreshTokenRepo: RefreshTokenRepository;
  private oauthStateRepo: OAuthStateRepository;
  private exchangeTokenRepo: LoginExchangeTokenRepository;

  constructor(db: ReturnType<typeof drizzle>) {
    this.userRepo = new UserRepository(db);
    this.refreshTokenRepo = new RefreshTokenRepository(db);
    this.oauthStateRepo = new OAuthStateRepository(db);
    this.exchangeTokenRepo = new LoginExchangeTokenRepository(db);
  }

  /**
   * 开始 OAuth 授权流程
   * 1. 生成 state 并存储
   * 2. 返回 Google 授权 URL
   */
  async startOAuth(
    returnTo: string = '/',
    googleClientId: string,
    googleRedirectUri: string,
  ) {
    // 验证 return_to 是安全路径（只允许相对路径）
    if (!this.isSafeReturnTo(returnTo)) {
      returnTo = '/';
    }

    const { state, record } = await this.oauthStateRepo.create(returnTo);

    // 构建 Google 授权 URL
    const googleAuthUrl = this.buildGoogleAuthUrl(state, googleClientId, googleRedirectUri);

    return {
      state,
      redirectUrl: googleAuthUrl,
      returnTo: record.returnTo,
    };
  }

  /**
   * 处理 Google OAuth callback
   * 1. 校验 state
   * 2. 使用 code 向 Google 换取 token
   * 3. 验证 Google ID token
   * 4. Upsert 用户
   * 5. 签发 tokens
   * 6. 生成一次性 exchange code
   * 7. 标记 state 已使用
   */
  async handleGoogleCallback(
    code: string,
    state: string,
    jwtSecret: string,
    googleClientId: string,
    googleClientSecret: string,
    googleRedirectUri: string,
  ) {
    console.log('[OAuth] handleGoogleCallback called, state:', state ? `${state.slice(0, 20)}...` : 'null');

    // 第一步：校验 state
    const stateRecord = await this.oauthStateRepo.findValidByState(state);
    if (!stateRecord) {
      console.error('[OAuth] Invalid or expired state');
      throw new Error('INVALID_STATE');
    }
    console.log('[OAuth] State validated, returnTo:', stateRecord.returnTo);

    // 第二步：使用 code 向 Google 换取 token
    const tokenData = await exchangeGoogleCode(
      code,
      googleClientId,
      googleClientSecret,
      googleRedirectUri,
    );
    if (!tokenData) {
      console.error('[OAuth] Token exchange returned null');
      throw new Error('GOOGLE_TOKEN_EXCHANGE_FAILED');
    }

    // 第三步：验证 Google ID token（生产级验签）
    const googlePayload = await verifyGoogleIdToken(tokenData.id_token, googleClientId);
    if (!googlePayload) {
      console.error('[OAuth] Google ID token verification failed');
      throw new Error('INVALID_GOOGLE_TOKEN');
    }
    console.log('[OAuth] Google token verified, email:', googlePayload.email);

    // 第四步：Upsert 用户
    const user = await this.userRepo.upsertByGoogleId({
      googleId: googlePayload.sub,
      email: googlePayload.email,
      name: googlePayload.name || null,
      avatarUrl: googlePayload.picture || null,
    });

    // 第五步：签发 Access Token（15 分钟）
    const accessToken = await signJwt(
      { sub: user.id, email: user.email, plan: user.plan },
      jwtSecret,
    );

    // 第六步：生成并持久化 Refresh Token（30 天）
    const refreshToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    await this.refreshTokenRepo.create(user.id, refreshToken, expiresAt);

    // 第七步：生成一次性 exchange code
    const { code: exchangeCode } = await this.exchangeTokenRepo.create(
      user.id,
      accessToken,
      refreshToken,
    );

    // 第八步：标记 state 已使用
    await this.oauthStateRepo.markAsUsed(stateRecord.id);

    // 返回 exchange code 和跳转地址
    return {
      exchangeCode,
      returnTo: stateRecord.returnTo,
      user,
    };
  }

  /**
   * 兑换一次性 exchange code
   * 1. 校验 code
   * 2. 标记 code 已使用
   * 3. 返回 tokens 和用户信息
   */
  async exchangeCode(code: string) {
    const exchangeRecord = await this.exchangeTokenRepo.findValidByCode(code);
    if (!exchangeRecord) {
      throw new Error('INVALID_EXCHANGE_CODE');
    }

    // 标记 code 已使用
    await this.exchangeTokenRepo.markAsUsed(exchangeRecord.id);

    // 获取用户信息
    const user = await this.userRepo.findById(exchangeRecord.userId);
    if (!user) {
      throw new Error('USER_NOT_FOUND');
    }

    // ─────────────────────────────────────────
    // 修复：确保 refresh_token 存储到 refresh_tokens 表
    // handleGoogleCallback 可能已经存储过了（如果它比 exchangeCode 先执行完）
    // 因此使用 findByToken 检查，如果已存在则跳过
    // ─────────────────────────────────────────
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const existingToken = await this.refreshTokenRepo.findByToken(exchangeRecord.refreshToken);
    if (!existingToken) {
      await this.refreshTokenRepo.create(exchangeRecord.userId, exchangeRecord.refreshToken, expiresAt);
    }

    return {
      accessToken: exchangeRecord.accessToken,
      refreshToken: exchangeRecord.refreshToken,
      user,
    };
  }

  /**
   * 为 development/staging 的固定测试用户签发 Access Token + Refresh Token。
   * 若用户不存在则自动创建，存在则直接复用。
   */
  async issueTestTokens(jwtSecret: string) {
    const upsertedUser = await this.userRepo.upsertByGoogleId({
      googleId: 'moneyjar-test-user',
      email: 'staging-test@moneyjar.test',
      name: 'MoneyJar Test User',
      avatarUrl: null,
    });

    const testUser = upsertedUser.plan === 'free'
      ? upsertedUser
      : await this.userRepo.updatePlan(upsertedUser.id, 'free');

    await this.refreshTokenRepo.deleteExpiredByUserId(testUser.id);

    const accessToken = await signJwt(
      { sub: testUser.id, email: testUser.email, plan: testUser.plan },
      jwtSecret,
    );

    const refreshToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    await this.refreshTokenRepo.create(testUser.id, refreshToken, expiresAt);

    return { accessToken, refreshToken, user: testUser };
  }

  /**
   * Google 登录主流程：
   * 1. 验证 Google ID Token 合法性
   * 2. Upsert 用户记录（新用户注册 / 老用户更新信息）
   * 3. 签发 Access Token（15 分钟）+ Refresh Token（30 天）
   */
  async loginWithGoogle(
    idToken: string,
    jwtSecret: string,
    googleClientId: string,
  ) {
    // 第一步：验证 Google ID Token
    const googlePayload = await verifyGoogleIdToken(idToken, googleClientId);
    if (!googlePayload) throw new Error('INVALID_GOOGLE_TOKEN');

    // 第二步：Upsert 用户（新用户自动注册，老用户更新 profile）
    const user = await this.userRepo.upsertByGoogleId({
      googleId: googlePayload.sub,
      email: googlePayload.email,
      name: googlePayload.name || null,
      avatarUrl: googlePayload.picture || null,
    });

    // 第三步：签发短效 Access Token（15 分钟）
    const accessToken = await signJwt(
      { sub: user.id, email: user.email, plan: user.plan },
      jwtSecret,
    );

    // 第四步：生成并持久化长效 Refresh Token（30 天）
    const refreshToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    await this.refreshTokenRepo.create(user.id, refreshToken, expiresAt);

    return { accessToken, refreshToken, user };
  }

  /**
   * 使用 Refresh Token 换取新的 Access Token（实现 token 轮换）
   * - 吊销旧的 refresh token
   * - 签发新的 refresh token
   * - 返回新的 access token 和 refresh token
   */
  async refreshAccessToken(refreshToken: string, jwtSecret: string) {
    // 查找 refresh token 记录
    const tokenRecord = await this.refreshTokenRepo.findByToken(refreshToken);
    if (!tokenRecord) throw new Error('INVALID_REFRESH_TOKEN');

    // 检查是否已被吊销
    if (tokenRecord.revoked) throw new Error('TOKEN_REVOKED');

    // 检查是否已过期
    if (new Date(tokenRecord.expiresAt) < new Date()) throw new Error('TOKEN_EXPIRED');

    // 查找关联用户
    const user = await this.userRepo.findById(tokenRecord.userId);
    if (!user) throw new Error('USER_NOT_FOUND');

    // 吊销旧的 refresh token（实现轮换，防止 replay 攻击）
    await this.refreshTokenRepo.revoke(refreshToken);

    // 签发新的 Access Token
    const accessToken = await signJwt(
      { sub: user.id, email: user.email, plan: user.plan },
      jwtSecret,
    );

    // 签发新的 Refresh Token（30 天过期）
    const newRefreshToken = crypto.randomUUID();
    const refreshExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    await this.refreshTokenRepo.create(user.id, newRefreshToken, refreshExpiresAt);

    return { accessToken, refreshToken: newRefreshToken, user };
  }

  /**
   * 登出：软吊销 Refresh Token（不物理删除，保留审计记录）
   */
  async logout(refreshToken: string) {
    await this.refreshTokenRepo.revoke(refreshToken);
  }

  /**
   * 根据用户 UUID 查询用户详情（供 /api/auth/me 路由使用）
   */
  async getUserById(userId: string) {
    return this.userRepo.findById(userId);
  }

  // ─────────────────────────────────────────────
  // 私有辅助方法
  // ─────────────────────────────────────────────

  /**
   * 构建 Google 授权 URL
   */
  private buildGoogleAuthUrl(state: string, googleClientId: string, googleRedirectUri: string): string {
    // 从 googleRedirectUri 提取基础 URL
    const baseUrl = googleRedirectUri.replace('/api/auth/google/callback', '');

    const params = new URLSearchParams({
      client_id: googleClientId,
      redirect_uri: `${baseUrl}/api/auth/google/callback`,
      response_type: 'code',
      scope: 'openid email profile',
      state,
      access_type: 'offline',
      prompt: 'consent',
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  /**
   * Open Redirect 防护：验证 return_to 是否为安全路径
   * 只允许相对路径（以 / 开头）
   */
  private isSafeReturnTo(url: string): boolean {
    // 只允许相对路径
    if (!url.startsWith('/')) {
      return false;
    }
    // 禁止 javascript: 协议
    if (url.toLowerCase().includes('javascript:')) {
      return false;
    }
    return true;
  }
}
