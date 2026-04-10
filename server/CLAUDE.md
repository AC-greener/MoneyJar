# MoneyJar Server — Agent Guide

**Hono.js 边缘服务端**，运行于 Cloudflare Workers。

## 技术栈

- **运行时**：Cloudflare Workers（禁止 Node.js 专属 API）
- **框架**：Hono.js（参考 https://hono.dev/llms.txt）
- **AI**：Cloudflare Workers AI (`@cf/meta/llama-3.3-70b-instruct-fp8-fast`)，必须用 Zod 校验输出
- **数据库**：Cloudflare D1（SQLite）+ Drizzle ORM
- **输入校验**：所有 API 入参必须使用 Zod

## 目录结构

```
src/
├── index.ts              # 入口，仅做路由注册和 Bindings 声明
├── types/                # Zod Schema + TypeScript 类型（最底层）
├── db/schema.ts          # Drizzle ORM 表结构
├── repositories/         # D1 CRUD（只依赖 db）
├── services/             # 业务逻辑 + AI 调用编排（只依赖 repositories + types）
├── middlewares/         # auth、错误处理、日志（只依赖 types）
└── routes/              # Hono 路由（只依赖 services + types）
test/
├── integration/          # HTTP 集成测试（Hono testClient）
├── unit/                 # 单元测试（services / repositories）
└── fixtures/             # 共享 mock 数据
drizzle/                  # 自动生成的迁移文件，禁止手动修改
```

## 常用命令

| 任务 | 命令 |
|------|------|
| 本地开发 | `pnpm dev` |
| 生产部署 | `pnpm deploy` |
| 类型检查 | `pnpm typecheck` |
| 生成迁移 | `pnpm db:generate` |
| 应用迁移 | `pnpm db:migrate` |
| 推送 Schema | `pnpm db:push` |
| 运行测试 | `pnpm test` |

## 分层架构（单向依赖）

```
types → db → repositories → services → routes
```

**黄金规则**：
- 禁止在 routes 直接调用 repositories，必须经过 services
- 禁止在 repositories 写业务逻辑，只做数据读写
- 禁止在 index.ts 写业务代码
- AI 输出必须经过 Zod Schema 校验
- 所有 D1 查询必须通过 Drizzle ORM
- **所有代码注释必须使用中文**

## Zod 使用要点

```typescript
// ✅ 正确：使用 .issues 获取错误
return c.json({ error: parsed.error.issues }, 400);
// ❌ 错误：ZodError 没有 .errors 属性
```

## TypeScript 门禁

- 开工前阅读 `src/types/`、`src/db/schema.ts`、service/repository 接口
- 修改 public interface、Zod Schema、Drizzle Schema 时必须同步检查调用点和测试
- **禁止使用 `any`、`as unknown as`**
- 完成任务前必须运行 `pnpm typecheck`，禁止 TS 报错留到人工收尾

## MCP 接口

- 协议：HTTP + SSE
- Endpoint：`/api/mcp`
- 工具：`create_transaction`、`get_balance_report`
- 安全：仅允许携带 `MCP-Token` 的请求

## 测试要求

- 使用 Vitest + `@cloudflare/vitest-pool-workers`（真实 Workers 运行时）
- 测试文件对应源文件：`src/services/x.ts` → `test/unit/x.test.ts`
- 所有新功能必须包含测试，禁止提交无测试覆盖的代码
- 完成任务前必须：1. `pnpm typecheck` 2. 相关测试 3. lint/format 检查

## 规划功能（避免架构冲突）

**Vectorize 向量数据库**（尚未实现）：
- 自然语言查账：RAG 模式向量化存储 Transaction
- 个性化财务建议：消费模式语义聚类

在此之前，所有查账通过 D1 SQL 聚合实现。
