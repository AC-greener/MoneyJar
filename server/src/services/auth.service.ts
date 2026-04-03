import { drizzle } from 'drizzle-orm/d1';
import { UserRepository } from '../repositories/user.repository';
import { RefreshTokenRepository } from '../repositories/refresh-token.repository';
import { JwtPayloadSchema, type JwtPayload } from '../types/auth';

// ─────────────────────────────────────────────
// Base64URL 编解码辅助函数（Web Crypto API 使用 ArrayBuffer，不能直接用 btoa/atob）
// ─────────────────────────────────────────────

/**
 * 将普通字符串编码为 Base64URL 格式（用于 JWT header / payload 段）
 */
function base64UrlEncode(data: string): string {
  return btoa(data)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * 将 ArrayBuffer 编码为 Base64URL 格式（用于 JWT 签名段）
 */
function base64UrlEncodeBuffer(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * 将 Base64URL 字符串解码为 ArrayBuffer（用于验证 JWT 签名）
 */
function base64UrlDecodeBuffer(base64url: string): ArrayBuffer {
  // 将 Base64URL 转回标准 Base64 格式
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  // 补齐 padding
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

// ─────────────────────────────────────────────
// Google ID Token 验证
// ─────────────────────────────────────────────

/**
 * 验证 Google ID Token 并提取用户信息。
 *
 * 注意：这是简化版本，仅验证 JWT payload 中的 aud/iss/exp 声明，
 * 跳过了 RS256 签名验证（完整生产实现需通过 Google 公钥进行验签）。
 * MVP 阶段先行使用此简化方案，后续可替换为完整 WebCrypto RS256 验证。
 */
export async function verifyGoogleIdToken(
  idToken: string,
  googleClientId: string,
): Promise<{ sub: string; email: string; name: string; picture: string } | null> {
  try {
    // 解析 JWT 三段结构
    const parts = idToken.split('.');
    if (parts.length !== 3) return null;

    // Base64URL 解码 payload 段
    const payloadStr = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
    const payload = JSON.parse(payloadStr);

    // 验证 audience：必须匹配我们的 Google Client ID
    if (payload.aud !== googleClientId) return null;

    // 验证 issuer：只接受 Google 官方颁发的 token
    if (!['accounts.google.com', 'https://accounts.google.com'].includes(payload.iss)) return null;

    // 验证过期时间：exp 必须大于当前时间（单位：秒）
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;

    return {
      sub: payload.sub,
      email: payload.email,
      name: payload.name || '',
      picture: payload.picture || '',
    };
  } catch {
    // JSON 解析失败、字段缺失等异常均视为无效 token
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
  const header = { alg: 'HS256', typ: 'JWT' };
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + 15 * 60; // 有效期 15 分钟

  const fullPayload = { ...payload, iat, exp };

  // 编码 header 和 payload 段
  const headerB64 = base64UrlEncode(JSON.stringify(header));
  const payloadB64 = base64UrlEncode(JSON.stringify(fullPayload));
  const message = `${headerB64}.${payloadB64}`;

  // 导入 HMAC-SHA256 密钥
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );

  // 生成签名
  const signatureBuffer = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(message),
  );
  const sigB64 = base64UrlEncodeBuffer(signatureBuffer);

  return `${message}.${sigB64}`;
}

/**
 * 验证 HS256 JWT Access Token，验证通过返回 payload，否则返回 null
 */
export async function verifyJwt(
  token: string,
  secret: string,
): Promise<JwtPayload | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    // 导入 HMAC-SHA256 密钥（用于验证）
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify'],
    );

    // 还原签名 ArrayBuffer
    const sigBuffer = base64UrlDecodeBuffer(parts[2]);

    // 验证签名
    const message = `${parts[0]}.${parts[1]}`;
    const valid = await crypto.subtle.verify(
      'HMAC',
      key,
      sigBuffer,
      new TextEncoder().encode(message),
    );
    if (!valid) return null;

    // 解码并解析 payload
    const payloadStr = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
    const rawPayload = JSON.parse(payloadStr);

    // 检查是否已过期
    if (rawPayload.exp < Math.floor(Date.now() / 1000)) return null;

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

  constructor(db: ReturnType<typeof drizzle>) {
    this.userRepo = new UserRepository(db);
    this.refreshTokenRepo = new RefreshTokenRepository(db);
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
   * 使用 Refresh Token 换取新的 Access Token
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

    // 签发新的 Access Token
    const accessToken = await signJwt(
      { sub: user.id, email: user.email, plan: user.plan },
      jwtSecret,
    );

    return { accessToken, user };
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
}
