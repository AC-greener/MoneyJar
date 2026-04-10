/**
 * Cloudflare Workers 环境变量类型扩展
 *
 * 注意：敏感变量（JWT_SECRET, GOOGLE_CLIENT_SECRET, TEST_AUTH_TOKEN）通过
 * wrangler secret put 命令注入，不存在于 wrangler.jsonc 的 vars 中。
 * 此处通过类型声明确保 TypeScript 编译通过。
 */

declare module '@cloudflare/workers-types' {
  interface Env {
    JWT_SECRET: string;
    GOOGLE_CLIENT_ID: string;
    GOOGLE_CLIENT_SECRET: string;
    GOOGLE_REDIRECT_URI: string;
    TEST_AUTH_TOKEN: string;
  }
}
