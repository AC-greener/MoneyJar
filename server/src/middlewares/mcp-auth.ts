import type { Context, Next } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { McpAuthHeaderSchema } from '../types/mcp';
import { ApiTokenRepository } from '../repositories/api-token.repository';

function createUnauthorizedResponse(c: Context) {
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

export function createMcpAuthMiddleware() {
  return async (c: Context<{ Bindings: CloudflareBindings }>, next: Next) => {
    const authHeader = c.req.header('Authorization');
    const parsed = McpAuthHeaderSchema.safeParse(authHeader);

    if (!parsed.success) {
      return createUnauthorizedResponse(c);
    }

    const token = parsed.data.slice('Bearer '.length).trim();
    if (!token) {
      return createUnauthorizedResponse(c);
    }

    // 从数据库查询 token
    const db = drizzle(c.env.DB);
    const apiTokenRepo = new ApiTokenRepository(db);
    const apiToken = await apiTokenRepo.findByToken(token);

    // 验证 token 存在且类型为 mcp
    if (!apiToken || apiToken.type !== 'mcp') {
      return createUnauthorizedResponse(c);
    }

    await next();
  };
}
