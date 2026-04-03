/// <reference types="node" />
import * as dotenv from 'dotenv';
import { defineConfig } from 'drizzle-kit';

// 优先读 .env.local（本地开发），然后回退到 .env（生产 CI）
dotenv.config({ path: '.env.local' });
dotenv.config();

export default defineConfig({
  out: './drizzle',
  schema: './src/db/schema.ts',
  dialect: 'sqlite',
  driver: 'd1-http',
  dbCredentials: {
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID!,
    databaseId: process.env.CLOUDFLARE_DATABASE_ID!,
    token: process.env.CLOUDFLARE_D1_TOKEN!,
  },
});
