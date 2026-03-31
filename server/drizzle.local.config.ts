import { defineConfig } from 'drizzle-kit';

// 本地开发配置，连接 wrangler dev 生成的本地 SQLite 文件
// 使用前需先运行 pnpm dev，让 wrangler 生成本地 D1 数据库文件
// 然后执行：ls .wrangler/state/v3/d1/miniflare-D1DatabaseObject/ 找到 hash 目录名
// 将下方路径中的 <hash> 替换为实际的目录名
export default defineConfig({
  out: './drizzle',
  schema: './src/db/schema.ts',
  dialect: 'sqlite',
  dbCredentials: {
    url: '.wrangler/state/v3/d1/miniflare-D1DatabaseObject/<hash>/db.sqlite',
  },
});
