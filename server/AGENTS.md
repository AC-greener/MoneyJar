# server/AGENTS.md

MoneyJar Server 是运行在 Cloudflare Workers 上的 Hono.js 边缘服务端，负责 API、Google OAuth、D1 数据访问、MCP 工具和 Voice AI 语义解析。

## 目录地图

```text
src/
  index.ts                 # Workers 入口，只做 app 组装、路由注册、Bindings 声明
  types/                   # Zod Schema + TypeScript 类型，底层契约
  db/schema.ts             # Drizzle ORM 表结构
  repositories/            # D1 CRUD，只做数据读写
  services/                # 业务逻辑、认证、AI 调用编排
  middlewares/             # auth、错误处理、日志、MCP token
  routes/                  # Hono 路由，只协调 HTTP 输入输出
test/
  helpers/                 # 集成测试 D1 schema / seed helper
  fixtures/                # 共享测试数据
  integration/             # HTTP 集成测试，Hono testClient
  unit/                    # service / repository 单元测试
drizzle/                   # drizzle-kit 生成迁移，避免手工改生成文件
plans/                     # 服务端局部计划
```

## 技术约束

- 运行时是 Cloudflare Workers；禁止使用 Node.js 专属 API。
- 框架是 Hono.js；路由只做请求解析、调用 service、返回响应。
- 数据库是 Cloudflare D1 + Drizzle ORM；D1 查询必须通过 Drizzle。
- API 入参、AI 输出、跨端响应必须使用 Zod 校验。
- TypeScript 禁止使用 `any` 和 `as unknown as` 规避类型系统。
- 代码注释使用中文；必要时写解释原因，不写重复代码含义的注释。

## 分层规则

```text
types -> db -> repositories -> services -> routes
```

- `src/index.ts` 不写业务逻辑，只注册中间件和路由。
- `routes/` 不直接访问 repositories，必须经过 services。
- `repositories/` 不写业务规则，只封装 Drizzle 查询和持久化细节。
- `services/` 负责业务判断、事务语义、AI fallback、认证流程编排。
- 修改 `types/`、`db/schema.ts`、public service/repository 接口时，同步检查全部调用点和测试。

## 常用命令

```bash
pnpm dev                 # wrangler dev
pnpm typecheck           # tsc --noEmit
pnpm test                # vitest run
pnpm test:coverage       # vitest run --coverage
pnpm test:watch          # vitest
pnpm db:generate         # 生成 Drizzle 迁移
pnpm db:migrate          # 应用迁移
pnpm db:push             # 推送 schema
pnpm cf-typegen          # 生成 Cloudflare Bindings 类型
pnpm deploy              # 生产部署
pnpm deploy:staging      # staging 部署
```

## 测试门禁

- 完成服务端改动前至少运行 `pnpm typecheck && pnpm test`。
- 修改 schema、repository、service、route 时补或更新对应测试。
- 集成测试使用 Vitest + `@cloudflare/vitest-pool-workers`，尽量覆盖真实 Workers runtime 行为。
- 集成测试必须复用 `test/helpers/integration.ts` 的 D1 schema 和 seed helper，避免复制建表 SQL。
- 覆盖率使用 `@vitest/coverage-istanbul`；不要换回依赖 `node:inspector` 的 V8 coverage provider。
- 如果测试因环境限制无法运行，交付时说明原因、替代验证和剩余风险。

## API 与错误处理

- 所有 API 入参先 Zod parse，再进入 service。
- Zod 错误使用 `parsed.error.issues`，不要使用不存在的 `.errors`。
- HTTP 错误响应保持结构化，避免直接泄露内部异常。
- 认证、MCP token、日志记录等横切逻辑优先放在 `middlewares/`。
- 新增端点时同步检查前端/Android DTO 和根目录 OpenSpec/计划文档。

## OAuth 认证

- `GET /api/auth/google/start`：开始 Google OAuth，生成 state 并重定向。
- `GET /api/auth/google/callback`：处理 Google 回调，生成 exchange code。
- `POST /api/auth/exchange`：前端用 exchange code 兑换 tokens。
- `oauth_states` 10 分钟过期，一次性使用，用于 CSRF 防护。
- `login_exchange_tokens` 5 分钟过期，一次性使用。
- `return_to` 只允许相对路径，避免 Open Redirect。
- 相关文件：`src/repositories/oauth.repository.ts`、`src/services/auth.service.ts`、`src/routes/auth.route.ts`。

## Voice AI

- Voice AI 的 `submit` 是“提交解析并判定”，不保证直接入库。
- 结果可能是 `ready_to_commit`、`needs_confirmation`、`failed`。
- Workers AI 不可用、超时或输出无法通过 Zod 时，必须保留 heuristic parser fallback。
- 词表扩充优先补分类名词和场景词，不要依赖宽泛动词或整句模板。
- 改 Voice AI 前先看根目录 `docs/dev-tips.md` 和 archived retrospective。

## MCP

- Endpoint：`/api/mcp`
- 协议：HTTP + SSE
- 工具：`create_transaction`、`get_balance_report`
- 安全：仅允许携带有效 `MCP-Token` 的请求。

## 当前重点

- Google OAuth 已引入 `oauth_states`、`login_exchange_tokens`，变更时同步检查前端 callback 流程。
- `openspec/changes/improve-server-test-quality/` 仍是测试结构调整的重要参考。
- Vectorize 尚未实现；自然语言查账和财务建议在实现前仍应基于 D1 SQL 聚合。
