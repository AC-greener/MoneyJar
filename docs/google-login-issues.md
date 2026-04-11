# Google OAuth 登录问题总结

## 问题列表

### 1. 环境变量命名不一致

**问题**：`.dev.vars` 中定义的是 `GOOGLE_CLIENT_ID`，但 `auth.route.ts` 代码使用的是 `c.env.OAUTH_GOOGLE_CLIENT_ID`，导致本地开发时 client_id 始终为空。

**解决**：统一命名为 `GOOGLE_CLIENT_ID`，修改相关文件：
- `.dev.vars`
- `src/types/cloudflare.d.ts`
- `src/types/env.ts`
- `src/routes/auth.route.ts`

**教训**：环境变量命名应保持一致，建议在文档中明确记录所有环境变量名称。

---

### 2. 生产环境 secrets 未设置

**问题**：部署到生产环境后，OAuth 返回 500 错误。日志显示 `clientId: "EMPTY"`。

**原因**：wrangler.jsonc 中的 vars 只是非敏感配置，敏感信息（如 `GOOGLE_CLIENT_ID`、`GOOGLE_CLIENT_SECRET`、`JWT_SECRET`）需要通过 `wrangler secret put` 命令单独注入。

**解决**：
```bash
wrangler secret put GOOGLE_CLIENT_ID --env ""
wrangler secret put GOOGLE_CLIENT_SECRET --env ""
wrangler secret put JWT_SECRET --env ""
```

**教训**：敏感变量必须通过 `wrangler secret put` 注入，不能放在 wrangler.jsonc 的 vars 中。

---

### 3. 数据库表缺少列

**问题**：OAuth callback 成功后，插入 `login_exchange_tokens` 表失败。错误信息：`insert into "login_exchange_tokens" ("id", "code", "user_id", "access_token", "refresh_token", ...)`

**原因**：远程 D1 数据库的表结构与代码 schema 不一致，缺少 `access_token` 和 `refresh_token` 列。

**解决**：执行 DDL 添加缺失的列：
```sql
ALTER TABLE login_exchange_tokens ADD COLUMN access_token TEXT NOT NULL;
ALTER TABLE login_exchange_tokens ADD COLUMN refresh_token TEXT NOT NULL;
```

**教训**：
- 每次修改 schema 后需要重新生成并应用迁移
- 本地验证后，远程数据库也需要同步更新

---

### 4. 数据库表未创建

**问题**：OAuth 流程报错 `insert into "oauth_states" ... failed`。

**原因**：远程 D1 数据库未执行迁移脚本，`oauth_states` 和 `login_exchange_tokens` 表不存在。

**解决**：在远程 D1 数据库执行建表语句：
```bash
pnpm wrangler d1 execute moneyjar --remote --command="
CREATE TABLE IF NOT EXISTS oauth_states (
  id TEXT PRIMARY KEY,
  state TEXT NOT NULL UNIQUE,
  return_to TEXT NOT NULL DEFAULT '/',
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used_at TEXT
);
CREATE TABLE IF NOT EXISTS login_exchange_tokens (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  user_id TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used_at TEXT,
  created_at TEXT NOT NULL
);
"
```

**教训**：部署前应确保数据库迁移脚本已执行。

---

### 5. Google OAuth Redirect URI 配置错误

**问题**：Google 授权页报错 `redirect_uri_mismatch`。

**原因**：
1. Google Cloud Console 的 OAuth Client 中配置了 `http://localhost:8787/...` 作为首个 redirect URI
2. Google OAuth 会使用列表中第一个 URI 作为默认回调地址
3. 实际请求的 URI 是 `https://moneyjar.zhutongtong.cn/api/auth/google/callback`，但列表首位是 localhost

**解决**：在 Google Cloud Console 中删除 `http://localhost:8787/...`，只保留生产环境的 URI：
```
https://moneyjar.zhutongtong.cn/api/auth/google/callback
```

**教训**：
- Google OAuth Client 的 redirect URIs 列表中，第一个 URI 会被用作默认回调
- 生产环境和开发环境的 redirect URI 必须分开配置，且生产 URI 应放在首位或单独一个
- 每次修改 Google Cloud Console 配置后，可能需要几分钟生效

---

### 6. wrangler.jsonc 覆盖远程配置

**问题**：执行 `wrangler deploy` 后，Cloudflare Dashboard 中配置的路由规则被覆盖。

**原因**：wrangler.jsonc 中的配置会完全替换远程配置，包括自定义路由、Cloudflare Access 保护等。

**解决**：
- 使用 `wrangler deploy --env ""` 明确指定部署到顶层环境
- 部署前检查配置差异（wrangler 会显示警告）
- 敏感配置通过环境变量或 secret 管理，不放在 wrangler.jsonc 中

**教训**：
- `pnpm wrangler deploy` 默认部署到当前环境，不带 `--env` 时可能覆盖生产配置
- 建议明确指定环境：`wrangler deploy --env production` 或 `wrangler deploy --env ""`

---

### 7. Cloudflare Pages 缓存导致自定义域名绑定旧部署

**问题**：新版本前端已部署，但 `moneyjar.zhutongtong.cn` 仍显示旧版本（没有登录按钮）。

**原因**：Cloudflare Pages 缓存了旧部署，自定义域名 `moneyjar.zhutongtong.cn` 仍然指向旧部署。

**解决**：
```bash
# 部署到 main 分支（团队约定 main 为生产分支）
pnpm wrangler pages deploy dist --project-name=moneyjar-frontend --branch=main

# 在 Cloudflare Dashboard 中：
# 1. 进入 Deployments 页面
# 2. 删除所有旧部署，只保留最新部署
# 3. 自定义域名会自动指向最新部署
```

**教训**：
- Cloudflare Pages 可以部署任意分支到生产域名，这是团队约定而非平台强制规则
- 部署前应清理旧部署，或使用 `--skip-caching` 选项
- 自定义域名绑定到特定部署，需要手动更新或删除旧部署

---

## 环境配置清单

### 开发环境 (.dev.vars)
```bash
JWT_SECRET=your-jwt-secret-at-least-32-characters-long
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:8787/api/auth/google/callback
TEST_AUTH_TOKEN=your-test-auth-token
ENVIRONMENT=development
APP_BASE_URL=http://localhost:5173
```

### 生产环境 secrets
```bash
wrangler secret put GOOGLE_CLIENT_ID --env ""
wrangler secret put GOOGLE_CLIENT_SECRET --env ""
wrangler secret put JWT_SECRET --env ""
```

### wrangler.jsonc 生产 vars
```json
{
  "vars": {
    "GOOGLE_REDIRECT_URI": "https://moneyjar.zhutongtong.cn/api/auth/google/callback",
    "APP_BASE_URL": "https://moneyjar.zhutongtong.cn"
  }
}
```

## Google Cloud Console 配置

在 OAuth 2.0 Client Credentials 中配置 Authorized redirect URIs：
```
https://moneyjar.zhutongtong.cn/api/auth/google/callback
```

**注意**：删除所有 localhost 相关的 URI，只保留生产环境的 URI。

## 数据库迁移

生产环境 D1 数据库需要执行以下建表语句：

```sql
CREATE TABLE IF NOT EXISTS oauth_states (
  id TEXT PRIMARY KEY,
  state TEXT NOT NULL UNIQUE,
  return_to TEXT NOT NULL DEFAULT '/',
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used_at TEXT
);

CREATE TABLE IF NOT EXISTS login_exchange_tokens (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  user_id TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used_at TEXT,
  created_at TEXT NOT NULL
);
```

如果表已存在但缺少列：
```sql
ALTER TABLE login_exchange_tokens ADD COLUMN access_token TEXT NOT NULL;
ALTER TABLE login_exchange_tokens ADD COLUMN refresh_token TEXT NOT NULL;
```

---

## 2026-04-11 新修复的问题

### 8. URL 路径重复拼接 `/api/api/transactions/`

**现象**：API 请求出现双重 `/api` 前缀，如 `/api/api/transactions/` 导致 404。

**根因**：`BASE_URL=/api`，但部分 API 调用已带了 `/api` 前缀。

**修复**：
- `frontend/src/api/auth.ts` - 移除了路径中多余的 `/api` 前缀
- `frontend/src/api/transaction.ts` - 移除了路径中多余的 `/api` 前缀

---

### 9. CallbackPage 无限循环调用

**现象**：页面卡在"正在完成 Google 授权，请稍候"，`/auth/exchange` 被无限重复调用。

**根因**：`CallbackPage.tsx` 缺少 `useRef` 防护，导致 `completeOAuthLogin` 被重复执行。

**修复**：
```typescript
const hasCalledRef = useRef(false)
useEffect(() => {
  if (hasCalledRef.current) return
  hasCalledRef.current = true
  // ... business logic
}, [searchParams])
```

---

### 10. 生产环境使用 localhost:8787

**现象**：登录后 API 请求发往 `http://localhost:8787/auth/exchange` 而不是生产服务器。

**根因**：`.env.production` 未设置 `VITE_API_BASE_URL`，前端使用了默认值。

**修复**：在 `frontend/.env.production` 中添加：
```
VITE_API_BASE_URL=/api
```

---

### 11. 刷新页面后 401 错误（refresh_token 未存储）

**现象**：登录成功后页面刷新出现 401 未授权错误。

**根因**：`exchangeCode()` 返回 refresh_token 给前端，但未存储到 `refresh_tokens` 表。

**修复**（`server/src/services/auth.service.ts`）：
```typescript
async exchangeCode(code: string) {
  // ... 验证逻辑 ...

  // 确保 refresh_token 存储到 refresh_tokens 表
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const existingToken = await this.refreshTokenRepo.findByToken(exchangeRecord.refreshToken);
  if (!existingToken) {
    await this.refreshTokenRepo.create(exchangeRecord.userId, exchangeRecord.refreshToken, expiresAt);
  }

  return { /* ... */ };
}
```

---

### 12. refreshAccessToken 未存储新的 refresh_token

**现象**：使用 refresh_token 刷新后，下次刷新仍然失败。

**根因**：服务器端实现了 refresh_token 轮换（撤销旧token，生成新token），但客户端只存储了新 access_token，丢弃了新的 refresh_token。

**修复**（`frontend/src/api/client.ts`）：
```typescript
const response = await axios.post<{ access_token: string; refresh_token?: string }>(/* ... */)
// 服务器端会轮换 refresh_token，需要存储新的
if (response.data.refresh_token) {
  setRefreshToken(response.data.refresh_token)
}
```

---

### 13. initialize 失败后无限重试

**现象**：refresh_token 无效时，`/auth/refresh` 被无限重复调用。

**根因**：`initialize()` 在 refresh 失败时没有设置 `isInitialized: true`，导致页面状态不变，持续重试。

**修复**（`frontend/src/stores/authStore.ts`）：
```typescript
} catch (err) {
  console.warn('Refresh token failed:', err)
  localStorage.removeItem('refresh_token')
  // 无论成功失败，都标记为已初始化，防止无限重试
  set({ user: null, isAuthenticated: false, isLoading: false, isInitialized: true })
  return
}
```

---

### 14. completeOAuthLogin 重复调用

**现象**：快速点击或页面状态异常时，`exchangeOAuthCode` 被多次调用。

**修复**：
```typescript
completeOAuthLogin: async (exchangeCode: string) => {
  const state = useAuthStore.getState()
  if (state.isLoading || state.isAuthenticated) return
  // ...
}
```

---

### 15. exchange 接口 500 错误（重复插入 token）

**现象**：登录时 `POST /api/auth/exchange` 返回 500 错误。

**根因**：`handleGoogleCallback` 已经将 refresh_token 存储到 `refresh_tokens` 表，`exchangeCode` 中再次插入时触发唯一约束冲突。

**修复**：插入前先检查 token 是否已存在：
```typescript
const existingToken = await this.refreshTokenRepo.findByToken(exchangeRecord.refreshToken);
if (!existingToken) {
  await this.refreshTokenRepo.create(exchangeRecord.userId, exchangeRecord.refreshToken, expiresAt);
}
```

---

## 登录流程架构

```
1. 用户点击登录 → GET /api/auth/google/start?return_to=当前页
2. Google 授权页 → 用户授权 → GET /api/auth/google/callback?code=xxx&state=xxx
3. 服务器 handleGoogleCallback:
   - 验证 Google token
   - Upsert 用户
   - 创建 access_token (15分钟)
   - 创建 refresh_token (30天) → 存储到 refresh_tokens 表
   - 创建一次性 exchange_code → 存储到 login_exchange_tokens 表
   - 重定向到 /auth/callback?exchange_code=xxx
4. 前端 CallbackPage:
   - 调用 POST /api/auth/exchange { code: xxx }
5. 服务器 exchangeCode:
   - 验证 exchange_code
   - 标记为已使用
   - 返回 access_token + refresh_token + 用户信息
   - (确保 refresh_token 存入 refresh_tokens 表)
6. 前端存储 tokens:
   - access_token → 内存 (apiClient 默认headers)
   - refresh_token → localStorage
7. 后续请求:
   - access_token 过期时自动调用 /api/auth/refresh
   - 服务器轮换 refresh_token (撤销旧的, 创建新的)
   - 前端存储新的 refresh_token
```

## 相关文件

### 前端
- `frontend/src/api/client.ts` - API 客户端，token 管理
- `frontend/src/api/auth.ts` - 认证相关 API 调用
- `frontend/src/pages/CallbackPage.tsx` - OAuth 回调页面
- `frontend/src/stores/authStore.ts` - 认证状态管理
- `frontend/.env.production` - 生产环境配置

### 后端
- `server/src/services/auth.service.ts` - 认证服务核心逻辑
- `server/src/repositories/refresh-token.repository.ts` - refresh_token CRUD
- `server/src/repositories/oauth.repository.ts` - OAuth state 和 exchange code CRUD
- `server/src/db/schema.ts` - 数据库表结构
