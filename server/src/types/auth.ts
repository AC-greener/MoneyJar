import { z } from 'zod';
import { PlanSchema, PublicUserSchema } from './user';

// JWT Payload 结构（access token 中携带的声明）
export const JwtPayloadSchema = z.object({
  sub: z.string().uuid(),        // 用户 UUID，对应 users.id
  email: z.string().email(),     // 用户邮箱
  plan: PlanSchema,              // 当前会员计划
  iat: z.number(),               // 签发时间（Unix 时间戳，秒）
  exp: z.number(),               // 过期时间（Unix 时间戳，秒）
});

// Google OAuth 登录请求体结构
export const GoogleLoginRequestSchema = z.object({
  id_token: z.string().min(1),   // Android Google Sign-In SDK 获取的 Google ID Token
});

// 登录成功响应结构（包含 access token、refresh token 及用户基本信息）
export const LoginResponseSchema = z.object({
  access_token: z.string(),      // 短效 JWT，用于 API 鉴权（1 小时有效期）
  refresh_token: z.string(),     // 长效令牌，用于换取新 access token（30 天有效期）
  user: PublicUserSchema,        // 公开用户信息（id/email/name/avatarUrl/plan）
});

// Refresh Token 请求体结构（续签 access token）
export const RefreshRequestSchema = z.object({
  refresh_token: z.string().min(1),
});

// Logout 请求体结构（吊销 refresh token）
export const LogoutRequestSchema = z.object({
  refresh_token: z.string().min(1),
});

// Google OAuth 开始授权 - Query 参数
export const GoogleStartQuerySchema = z.object({
  return_to: z.string().optional().default('/'), // 登录后跳转地址
});

// Exchange Code 兑换请求体
export const ExchangeCodeSchema = z.object({
  code: z.string().min(1), // 一次性交换码
});

// Exchange 成功响应结构
export const ExchangeResponseSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  user: PublicUserSchema,
});

export type JwtPayload = z.infer<typeof JwtPayloadSchema>;
export type GoogleLoginRequest = z.infer<typeof GoogleLoginRequestSchema>;
export type LoginResponse = z.infer<typeof LoginResponseSchema>;
export type RefreshRequest = z.infer<typeof RefreshRequestSchema>;
export type LogoutRequest = z.infer<typeof LogoutRequestSchema>;
export type GoogleStartQuery = z.infer<typeof GoogleStartQuerySchema>;
export type ExchangeCodeRequest = z.infer<typeof ExchangeCodeSchema>;
export type ExchangeResponse = z.infer<typeof ExchangeResponseSchema>;
