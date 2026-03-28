import { drizzle } from 'drizzle-orm/d1';
import { requestLogs } from '../db/schema';

/**
 * 敏感字段列表 - 这些字段的值在日志中会被替换为 [REDACTED]
 * 用于防止密码、Token、API Key 等敏感信息泄露
 */
const SENSITIVE_FIELDS = ['password', 'token', 'apikey', 'api_key', 'secret', 'authorization', 'cookie'];

/**
 * 判断请求是否应该被跳过（不记录日志）
 *
 * 跳过条件：
 * - OPTIONS 预检请求（CORS）
 * - favicon 图标请求
 * - 健康检查端点 /health
 */
const SHOULD_SKIP = (method: string, path: string) =>
  method === 'OPTIONS' ||
  path.includes('favicon') ||
  path.startsWith('/health');

/**
 * 判断请求是否应该被记录到数据库
 *
 * 记录条件（满足任一即可）：
 * - 修改性请求：POST、PUT、DELETE
 * - 异常响应：状态码 >= 400
 */
const SHOULD_LOG = (method: string, path: string, status: number) =>
  !SHOULD_SKIP(method, path) &&
  (['POST', 'PUT', 'DELETE'].includes(method) || status >= 400);

/**
 * 对请求/响应体进行脱敏处理
 *
 * 处理逻辑：
 * 1. 如果是字符串类型的 JSON，解析后对敏感字段替换为 [REDACTED]
 * 2. 普通字符串直接截断（防止过大）
 * 3. 非字符串类型转为字符串后截断
 * 4. 最终结果限制在 2000 字符以内
 *
 * @param body - 请求体或响应体
 * @returns 脱敏后的字符串，或 null（输入为 null/undefined）
 */
export function sanitizeBody(body: unknown): string | null {
  if (body === null || body === undefined) return null;
  if (typeof body === 'string') {
    try {
      const parsed = JSON.parse(body);
      // 非对象类型（如数字、布尔）直接转字符串
      if (typeof parsed !== 'object' || parsed === null) {
        return String(parsed);
      }
      // 对象类型：脱敏敏感字段
      const redacted: Record<string, unknown> = { ...parsed };
      for (const key of Object.keys(redacted)) {
        if (SENSITIVE_FIELDS.includes(key.toLowerCase())) {
          redacted[key] = '[REDACTED]';
        }
      }
      return JSON.stringify(redacted).slice(0, 2000);
    } catch {
      // JSON 解析失败，当作普通字符串处理
      return body.slice(0, 1000);
    }
  }
  // 非字符串类型
  if (typeof body !== 'object') return String(body);

  const redacted: Record<string, unknown> = { ...body as Record<string, unknown> };
  for (const key of Object.keys(redacted)) {
    if (SENSITIVE_FIELDS.includes(key.toLowerCase())) {
      redacted[key] = '[REDACTED]';
    }
  }
  return JSON.stringify(redacted).slice(0, 2000);
}

/**
 * 截断过长的响应体
 *
 * @param body - 响应体字符串
 * @param maxLength - 最大长度，默认 1000 字符
 * @returns 截断后的字符串，超长部分用 ...[truncated] 标识
 */
export function truncateResponse(body: string | null, maxLength = 1000): string | null {
  if (body === null) return null;
  if (body.length <= maxLength) return body;
  return body.slice(0, maxLength) + '...[truncated]';
}

/**
 * 异步写入日志到 D1 数据库
 *
 * 注意：此函数内部捕获异常，写入失败不会影响主请求流程
 * 使用 fire-and-forget 模式，避免阻塞响应
 *
 * @param data - 日志数据
 * @param env - Cloudflare Bindings（包含 DB）
 */
async function writeLog(
  data: {
    id: string;
    requestPath: string;
    requestMethod: string;
    statusCode: number;
    duration: number;
    requestBody: string | null;
    responseBody: string | null;
    errorMessage: string | null;
    clientIp: string | null;
    userAgent: string | null;
    aiParsed?: boolean;
    aiModel?: string;
    aiProcessingTime?: number;
  },
  env: CloudflareBindings
): Promise<void> {
  try {
    const db = drizzle(env.DB);
    await db.insert(requestLogs).values({
      id: data.id,
      requestPath: data.requestPath,
      requestMethod: data.requestMethod,
      statusCode: data.statusCode,
      duration: data.duration,
      requestBody: data.requestBody,
      responseBody: data.responseBody,
      errorMessage: data.errorMessage,
      clientIp: data.clientIp,
      userAgent: data.userAgent,
      timestamp: new Date(),
      aiParsed: data.aiParsed ?? null,
      aiModel: data.aiModel ?? null,
      aiProcessingTime: data.aiProcessingTime ?? null,
    });
  } catch (err) {
    // 写入失败仅打印日志，不影响主流程
    console.error(`[${data.id}] Failed to write log to DB:`, err);
  }
}

/**
 * 日志中间件工厂函数
 *
 * 核心机制 - Monkey Patch（猴子补丁）：
 * 在中间件中拦截 c.json 方法，捕获响应体内容和状态码。
 * 这是必要的，因为 Hono 的响应体在 next() 之后才能获取，
 * 且读取后会导致流被消费，无法再次读取。
 *
 * 记录时机：
 * - 在 finally 块中判断是否需要记录（避免重复）
 * - 使用 waitUntil 确保在响应发送后仍能完成异步写库
 *
 * @returns Hono 中间件处理函数
 */
export function createLoggerMiddleware() {
  return async (c: any, next: () => Promise<void>) => {
    const start = Date.now();
    // 获取请求 ID（如有）否则生成新的 UUID
    const requestId = c.get('requestId') || crypto.randomUUID();
    const method = c.req.method;
    const path = c.req.path;
    // 优先从 Cloudflare 获取真实 IP，其次从 X-Forwarded-For 获取
    const clientIp = c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For') || 'unknown';
    const userAgent = c.req.header('User-Agent') || 'unknown';

    let responseBody: string | null = null;
    let errorMessage: string | null = null;
    let status = 0;

    // Monkey Patch: 拦截 c.json 方法，捕获响应体
    const originalJson = c.json.bind(c);
    c.json = (body: any, statusCode?: number) => {
      status = statusCode ?? 200;
      responseBody = truncateResponse(JSON.stringify(body));
      return originalJson(body, statusCode);
    };

    try {
      await next();
      // next() 正常完成后，从响应对象获取状态码
      status = c.res.status;
    } catch (err) {
      // 捕获抛出的异常，记录错误信息后重新抛出
      errorMessage = err instanceof Error ? err.message : String(err);
      throw err;
    } finally {
      // 仅记录符合条件的请求
      if (SHOULD_LOG(method, path, status)) {
        const duration = Date.now() - start;
        const timestamp = new Date().toISOString();

        // 开发环境控制台输出
        console.log(`[${timestamp}] ${method} ${path} ${status} ${duration}ms - ${requestId}`);
        if (errorMessage) {
          console.error(`[${requestId}] Error:`, errorMessage);
        }

        // 注意：此处在 finally 中读取请求体，但请求体流在 next() 前已被消费
        // 因此 requestBody 固定为 null（实际路由需要从请求中读取）
        const logData = {
          id: requestId,
          requestPath: path,
          requestMethod: method,
          statusCode: status,
          duration,
          requestBody: null, // Body reading would consume the stream
          responseBody,
          errorMessage,
          clientIp,
          userAgent,
        };

        // 使用 waitUntil 确保日志写入在响应发送后继续执行
        // 在非 Workers 环境下（如测试）使用 Promise.catch 处理失败情况
        if (c.executionCtx && typeof c.executionCtx.waitUntil === 'function') {
          c.executionCtx.waitUntil(writeLog(logData, c.env));
        } else {
          // 测试环境降级处理
          writeLog(logData, c.env).catch((err) => {
            console.error(`[${requestId}] Failed to write log:`, err);
          });
        }
      }
    }
  };
}
