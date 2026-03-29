import { Hono } from "hono";
import { requestId } from "hono/request-id";
import { cors } from "hono/cors";
import { mcpRoute } from "./routes/mcp.route";
import { transactionRoute } from "./routes/transaction.route";
import { createLoggerMiddleware } from "./middlewares/logger";
import { createErrorHandler } from "./middlewares/error-handler";

// 2. 将类型传给 Hono 实例
const app = new Hono<{ Bindings: CloudflareBindings }>();

// Add request-id middleware
app.use(requestId());

// Add logger middleware
app.use(createLoggerMiddleware());

app.use(
  "/api/mcp",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "DELETE", "OPTIONS"],
    allowHeaders: ["Authorization", "Content-Type", "Accept", "Mcp-Protocol-Version", "Mcp-Session-Id", "Last-Event-ID"],
    exposeHeaders: ["Mcp-Session-Id"],
  })
);

// Global error handler
app.onError(createErrorHandler());

app
  .get("/", async (c) => {
    return c.json({
      say: 'hello'
    });
  })

// Register transaction routes
app.route("/api/transactions", transactionRoute);
app.route("/api/mcp", mcpRoute);

export default {
  fetch: app.fetch,
  scheduled: async (event: any, env: CloudflareBindings, ctx: ExecutionContext) => {
    const { cleanupOldLogs } = await import('./services/retention.service');
    const result = await cleanupOldLogs(env);
    console.log(`[Retention] Deleted ${result.deleted} old log entries`);
  },
};
