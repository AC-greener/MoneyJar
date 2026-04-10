/**
 * Cloudflare Workers 环境变量类型扩展
 *
 * 注意：敏感变量（JWT_SECRET, GOOGLE_CLIENT_SECRET, TEST_AUTH_TOKEN）通过
 * wrangler secret put 命令注入，不存在于 wrangler.jsonc 的 vars 中。
 * 此处通过类型声明确保 TypeScript 编译通过。
 *
 * 这个文件与 worker-configuration.d.ts 互补，添加 Wrangler 无法自动推断的变量。
 */

interface CloudflareSecretEnv {
  JWT_SECRET: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  GOOGLE_REDIRECT_URI: string;
  TEST_AUTH_TOKEN: string;
}

// 扩展 CloudflareBindings 以包含这些 secret
declare global {
  interface CloudflareBindings extends CloudflareSecretEnv {}
}

export {};
