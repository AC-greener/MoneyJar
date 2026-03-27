import { Hono } from "hono";
import { drizzle } from "drizzle-orm/d1";
import { posts } from './db/schema';


// 2. 将类型传给 Hono 实例
const app = new Hono<{ Bindings: CloudflareBindings }>();

app
  .get("/test", async (c) => {
    // 3. 通过 c.env 获取绑定
    const response = await c.env.AI.run(
      "@cf/meta/llama-3.1-8b-instruct" as any,
      {
        prompt: "What is the origin of the phrase Hello, World",
      }
    );

    return c.json(response); // Hono 有内置的 c.json()，比 JSON.stringify 更好用
  })
  .get("/posts", async (c) => {
    const db = drizzle(c.env.DB);
    const result = await db.select().from(posts).all();
    return c.json(result);
  });

export default app;
