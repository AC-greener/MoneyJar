import { z } from 'zod';

// 会员计划枚举：free 为免费版，pro 为付费版
export const PlanSchema = z.enum(['free', 'pro']);
export type Plan = z.infer<typeof PlanSchema>;

// 用户完整数据结构（对应数据库 users 表）
export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  plan: PlanSchema,
  planStartedAt: z.string().nullable(),   // Pro 计划开始时间（ISO 字符串），免费版为 null
  planExpiresAt: z.string().nullable(),   // Pro 计划到期时间（ISO 字符串），永久有效或免费版为 null
  googleId: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// 公开返回给客户端的用户信息（去除 googleId 等敏感字段）
export const PublicUserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  plan: PlanSchema,
});

export type User = z.infer<typeof UserSchema>;
export type PublicUser = z.infer<typeof PublicUserSchema>;
