import { z } from 'zod';

// Token 类型枚举
export const TokenTypeSchema = z.enum(['mcp', 'app']);
export type TokenType = z.infer<typeof TokenTypeSchema>;

// API Token 创建 schema
export const CreateApiTokenSchema = z.object({
  token: z.string().min(1),
  name: z.string().min(1).max(100),
  type: TokenTypeSchema,
  expiresAt: z.string().optional(),
});

// API Token 数据库记录 schema
export const ApiTokenSchema = z.object({
  id: z.number(),
  token: z.string(),
  name: z.string(),
  type: TokenTypeSchema,
  createdAt: z.string(),
  expiresAt: z.string().nullable(),
});

export type CreateApiTokenInput = z.infer<typeof CreateApiTokenSchema>;
export type ApiToken = z.infer<typeof ApiTokenSchema>;
