import type { Context, Next } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { McpAuthHeaderSchema } from '../types/mcp';
import { ApiTokenRepository } from '../repositories/api-token.repository';

function createMcpUnauthorizedResponse(c: Context) {
  return c.json(
    {
      jsonrpc: '2.0',
      error: {
        code: -32001,
        message: 'Unauthorized',
      },
      id: null,
    },
    401
  );
}

function createApiUnauthorizedResponse(c: Context) {
  return c.json({ error: 'Unauthorized' }, 401);
}

export function createMcpAuthMiddleware() {
  return async (c: Context<{ Bindings: CloudflareBindings }>, next: Next) => {
    const authHeader = c.req.header('Authorization');
    const parsed = McpAuthHeaderSchema.safeParse(authHeader);

    if (!parsed.success) {
      return createMcpUnauthorizedResponse(c);
    }

    const token = parsed.data.slice('Bearer '.length).trim();
    if (!token) {
      return createMcpUnauthorizedResponse(c);
    }

    // 从数据库查询 token
    const db = drizzle(c.env.DB);
    const apiTokenRepo = new ApiTokenRepository(db);
    const apiToken = await apiTokenRepo.findByToken(token);

    // 验证 token 存在且类型为 mcp
    if (!apiToken || apiToken.type !== 'mcp') {
      return createMcpUnauthorizedResponse(c);
    }

    await next();
  };
}

export function createApiAuthMiddleware() {
  return async (c: Context<{ Bindings: CloudflareBindings }>, next: Next) => {
    const authHeader = c.req.header('Authorization');
    const parsed = McpAuthHeaderSchema.safeParse(authHeader);

    if (!parsed.success) {
      return createApiUnauthorizedResponse(c);
    }

    const token = parsed.data.slice('Bearer '.length).trim();
    if (!token) {
      return createApiUnauthorizedResponse(c);
    }

    // 从数据库查询 token
    const db = drizzle(c.env.DB);
    const apiTokenRepo = new ApiTokenRepository(db);
    const apiToken = await apiTokenRepo.findByToken(token);

    // API token 不限制类型，只要存在即可
    if (!apiToken) {
      return createApiUnauthorizedResponse(c);
    }

    await next();
  };
}
