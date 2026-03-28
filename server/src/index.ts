import { Hono } from "hono";
import { transactionRoute } from "./routes/transaction.route";

// 2. 将类型传给 Hono 实例
const app = new Hono<{ Bindings: CloudflareBindings }>();

app
  .get("/", async (c) => {
    return c.json({
      say: 'hello'
    });
  })

// 注册交易路由
app.route("/api/transactions", transactionRoute);

export default app;
