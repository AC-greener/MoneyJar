# Quickstart: Google OAuth Login Implementation

**Feature**: 002-google-login
**Date**: 2026-04-10

## 实施前置条件

### 1. Google Cloud Console 配置

在 Google Cloud Console 为你的 OAuth Client 添加 Authorized redirect URI：

```
Local:      http://localhost:8787/api/auth/google/callback
Staging:    https://staging-api.moneyjar.app/api/auth/google/callback
Production: https://api.moneyjar.app/api/auth/google/callback
```

### 2. 环境变量配置

**Server** (`server/wrangler.jsonc` 或 Cloudflare Dashboard):

```json
{
  "GOOGLE_CLIENT_ID": "your-client-id.apps.googleusercontent.com",
  "GOOGLE_CLIENT_SECRET": "your-client-secret",
  "GOOGLE_REDIRECT_URI": "https://your-domain.com/api/auth/google/callback",
  "JWT_SECRET": "your-jwt-secret-min-32-chars",
  "ENVIRONMENT": "development"
}
```

**Frontend** (`frontend/.env`):

```env
VITE_API_BASE_URL=https://api.example.com
VITE_APP_BASE_URL=http://localhost:5173
```

## 开发调试

### 启动服务端

```bash
cd server
pnpm install
pnpm dev
```

### 启动前端

```bash
cd frontend
npm install
npm run dev
```

### 完整登录流程测试

1. 访问前端 `http://localhost:5173`
2. 点击"使用 Google 登录"按钮
3. 页面跳转到 Google 授权页
4. 完成 Google 授权
5. 跳回前端 `/auth/callback?exchange_code=xxx`
6. 自动兑换 code，获取 tokens
7. 跳转到首页，已登录状态

### 查看 D1 数据 (Local)

```bash
cd server
pnpm wrangler d1 execute moneyjar-local --command="SELECT * FROM oauth_states"
pnpm wrangler d1 execute moneyjar-local --command="SELECT * FROM login_exchange_tokens"
```

## 常见问题

### Q: Google 授权页显示 "redirect_uri_mismatch"

A: 检查 Google Cloud Console 中的 Authorized redirect URI 是否与 `GOOGLE_REDIRECT_URI` 完全一致，包括协议和尾部斜杠。

### Q: exchange code 兑换失败

A: 检查:
1. code 是否过期（5分钟）
2. code 是否已使用（一次性）
3. 数据库是否正常写入

### Q: 前端 callback 页面空白

A: 检查:
1. `VITE_API_BASE_URL` 是否正确配置
2. 服务端是否正常运行
3. 浏览器控制台是否有错误

## 部署检查清单

- [ ] Google Cloud Console 配置了生产环境 redirect URI
- [ ] Cloudflare Workers 环境变量已设置 `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`
- [ ] D1 迁移已在生产 D1 执行
- [ ] 前端 `VITE_API_BASE_URL` 已更新为生产地址
