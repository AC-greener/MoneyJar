# 002 - cloudflare same-domain deploy

## Summary

为 MoneyJar 增加一份 Cloudflare 同域部署实施计划。前端 `frontend/` 继续部署到 Cloudflare Pages，后端 `server/` 继续部署为独立 Cloudflare Worker。正式环境统一使用 `https://yourapp.com/*` 作为入口，其中 `https://yourapp.com/api/*` 交给 Worker 处理，其余路径继续由 Pages 托管静态资源与 SPA 页面。

## Key Changes

### Cloudflare domain and routing

- 将 `yourapp.com` 绑定到前端 Pages 项目，作为默认站点入口。
- 为后端 Worker 增加 `yourapp.com/api/*` 路由，只接管 API 请求。
- 保留 Worker 默认的 `workers.dev` 域名作为调试和回退入口，不作为正式前端访问地址。
- 确保 Pages 的 SPA 回退生效，让 `/record`、`/stats`、`/settings` 这类前端路由都能回到 `index.html`，避免刷新后出现 404。

### Frontend API base URL strategy

- 前端生产环境默认改为同域访问 `/api/*`，不再依赖单独的后端域名。
- 本地开发环境继续保留 `VITE_API_BASE_URL=http://localhost:8787` 的约定，用于和本地 `wrangler dev` 联调。
- 更新 [`frontend/src/api/client.ts`](/Users/tongtong/AndroidStudioProjects/MoneyJar/frontend/src/api/client.ts) 对应的环境变量说明，明确“开发环境可配置独立基址，生产环境默认同域”的策略。
- 不修改现有 API path 形态，继续使用 `/api/auth/*`、`/api/transactions/*`、`/api/mcp`。

### Backend CORS and domain policy

- 收紧普通业务 API 的 CORS 策略，不再把 `moneyjar-frontend.pages.dev` 视为正式生产入口。
- 保留本地开发域名白名单，例如 `http://localhost:5173` 和 `http://localhost:3000`，用于本地分域联调。
- 生产同域访问下，普通业务 API 不应继续依赖跨域放行才能工作。
- `"/api/mcp"` 继续维持独立的 CORS 配置，避免影响远程 MCP 客户端接入。

### Deployment flow

- 继续使用 [`frontend/wrangler.jsonc`](/Users/tongtong/AndroidStudioProjects/MoneyJar/frontend/wrangler.jsonc) 部署 Pages。
- 继续使用 [`server/wrangler.jsonc`](/Users/tongtong/AndroidStudioProjects/MoneyJar/server/wrangler.jsonc) 部署 Worker。
- 正式发布顺序固定为：
  1. 先部署 Worker
  2. 再部署 Pages
- staging 环境采用相同模式，在同一个 staging 主机名下让 `/api/*` 交给 staging Worker，其余路径交给 staging Pages。

## Public Interfaces

- 对外 API path 不变，只调整入口域名和前端访问策略。
- 保留现有认证接口：
  - `POST /api/auth/google`
  - `POST /api/auth/test-token`
  - `POST /api/auth/refresh`
  - `POST /api/auth/logout`
  - `GET /api/auth/me`
- 保留现有交易接口：
  - `POST /api/transactions`
  - `GET /api/transactions`
  - `GET /api/transactions/:id`
  - `DELETE /api/transactions/:id`
- 保留现有 MCP 入口：
  - `ALL /api/mcp`

## Test Plan

- 验证本地开发模式下，前端仍可通过 `VITE_API_BASE_URL=http://localhost:8787` 访问本地 Worker。
- 验证正式环境首页 `https://yourapp.com/` 可以正常返回前端页面。
- 验证 `https://yourapp.com/record`、`https://yourapp.com/stats`、`https://yourapp.com/settings` 在浏览器刷新后不会 404。
- 验证前端登录、刷新 token、获取用户信息、交易增删查全部走 `https://yourapp.com/api/*`。
- 验证浏览器控制台中没有普通业务 API 的 CORS 报错。
- 验证 `https://yourapp.com/api/*` 请求实际命中 Worker，而不是 Pages 静态资源。
- 验证 `workers.dev` 地址仍可用于单独调试后端。

## Assumptions

- 不切换到 Cloudflare Pages Functions，继续保持“Pages 托管前端 + 独立 Worker 托管 API”的拆分方式。
- 不修改当前前后端目录结构。
- 生产环境默认使用相对路径访问 API。
- 采用单主域名方案，而不是单独拆分 `api.yourapp.com` 这类 API 子域。
- 本文档作为实施计划使用，不替代长期架构文档。
