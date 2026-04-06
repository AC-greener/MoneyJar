import { Hono } from "hono";
import { requestId } from "hono/request-id";
import { cors } from "hono/cors";
import { mcpRoute } from "./routes/mcp.route";
import { transactionRoute } from "./routes/transaction.route";
import { authRoute } from "./routes/auth.route";
import { createLoggerMiddleware } from "./middlewares/logger";
import { createErrorHandler } from "./middlewares/error-handler";
// 2. 将类型传给 Hono 实例
const app = new Hono<{ Bindings: CloudflareBindings }>();

// 注册请求 ID 中间件
app.use(requestId());

// 注册日志中间件
app.use(createLoggerMiddleware());

// 全局 CORS 配置
app.use(cors({
  origin: ["https://moneyjar-frontend.pages.dev", "http://localhost:5173", "http://localhost:3000"],
  allowMethods: ["GET", "POST", "DELETE", "OPTIONS"],
  allowHeaders: ["Authorization", "Content-Type", "Accept"],
}));

app.use(
  "/api/mcp",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "DELETE", "OPTIONS"],
    allowHeaders: ["Authorization", "Content-Type", "Accept", "Mcp-Protocol-Version", "Mcp-Session-Id", "Last-Event-ID"],
    exposeHeaders: ["Mcp-Session-Id"],
  })
);

// 全局错误处理器
app.onError(createErrorHandler());

app
  .get("/", async (c) => {
    return c.json({
      say: 'hello'
    });
  })

// 开发模式调试路由：无需 Google OAuth，直接获取测试 JWT（仅 development 环境可用）
app.get('/api/dev/token', async (c) => {
  if (c.env.ENVIRONMENT !== 'development') {
    return c.json({ error: 'Not found' }, 404);
  }
  const plan = c.req.query('plan') === 'pro' ? 'pro' : 'free';
  const { signJwt } = await import('./services/auth.service');
  // 使用 RFC 4122 nil UUID（全零）- 这是 Zod uuid() 验证的唯一全零变体
  const token = await signJwt(
    { sub: '00000000-0000-0000-0000-000000000000', email: 'dev@moneyjar.test', plan },
    c.env.JWT_SECRET,
  );
  return c.json({ access_token: token });
});

// 注册认证路由（登录/登出/刷新/获取用户信息）
app.route("/api/auth", authRoute);

// 注册交易路由（鉴权已在 transactionRoute 内部挂载）
// 注意：Hono 对尾随斜杠敏感，需要分别处理带和不带尾随斜杠的路径
app.route("/api/transactions", transactionRoute);
app.route("/api/transactions/", transactionRoute);
app.route("/api/mcp", mcpRoute);

export default {
  fetch: app.fetch,
  scheduled: async (event: any, env: CloudflareBindings, ctx: ExecutionContext) => {
    const { cleanupOldLogs } = await import('./services/retention.service');
    const result = await cleanupOldLogs(env);
    console.log(`[Retention] Deleted ${result.deleted} old log entries`);
  },
};
