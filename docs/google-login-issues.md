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
