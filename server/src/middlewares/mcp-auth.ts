import type { Context, Next } from 'hono';
import { McpAuthHeaderSchema } from '../types/mcp';

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
    if (!token || token !== c.env.MCP_TOKEN) {
      return createUnauthorizedResponse(c);
    }

    await next();
  };
}
