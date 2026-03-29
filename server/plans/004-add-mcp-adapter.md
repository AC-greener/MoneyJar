# 004 - add mcp adapter

## Summary

为 MoneyJar 现有记账能力增加一个 remote HTTP MCP 接入层，让外部 AI 可以通过标准 MCP tools 直接完成记账、查询、删除和汇总。实现方式采用 `@hono/mcp` + `Streamable HTTP`，入口统一为 `ALL /api/mcp`，鉴权使用标准 `Authorization: Bearer <token>`，优先兼容 Cursor、Claude Code、Claude Desktop 等主流客户端。

## Key Changes

### MCP transport and routing

- 使用 `@hono/mcp` 官方包接入 MCP 协议，不手写底层 JSON-RPC transport。
- 采用 `StreamableHTTPTransport` 作为主传输协议，不把已废弃的 HTTP SSE transport 作为主路径。
- 路由统一放在 `ALL /api/mcp`，由同一个入口处理：
  - `POST`：MCP initialize、tools/list、tools/call 等请求
  - `GET`：保留给 Streamable HTTP 的流式响应和事件推送能力
  - `DELETE`：仅在协议需要时用于会话终止
- MCP 层只做协议适配，不直接复用 REST 路由做 HTTP-to-HTTP 转发。

### Authentication and config

- 鉴权使用标准 `Authorization: Bearer <token>`。
- 新增 Worker 环境变量 `MCP_TOKEN`。
- MCP route 在进入 transport 之前先做 token 校验，鉴权失败直接返回明确错误。
- CORS 为 `/api/mcp` 单独放行，保证远程 MCP 客户端可以正常连通。

### Tool surface

- 暴露以下 tools：
  - `create_transaction`
  - `get_transaction`
  - `list_transactions`
  - `delete_transaction`
  - `get_balance_report`
- 每个 tool 都提供对 AI 友好的 description，描述要能直接帮助模型理解“什么时候调用这个工具”。
- 所有 tool 入参都使用 Zod schema 校验，不信任外部 AI 传入的原始 payload。

### List behavior and safety

- `list_transactions` 不能在不传参数时返回无限制全量数据。
- 默认返回最近 `20` 条交易。
- `limit` 支持显式传入，但最大值限制为 `100`，超出按上限收敛或拒绝。
- 返回结果按 `createdAt` 倒序，避免 MCP 客户端一次拉取过多历史数据。
- `period` 继续沿用现有 `week | month` 语义；`period` 与 `limit` 的组合规则在 schema 中明确固定。

### Service and repository reuse

- 复用现有 `TransactionService`，MCP 层不重复写数据库操作逻辑。
- 仓储层补充“最近 N 条交易”能力，给 `list_transactions` 使用。
- 统计类工具复用现有周/月聚合逻辑，避免出现两套口径。

### Error handling

- 缺少 token、token 格式错误、token 不匹配时返回明确的 401 类错误。
- tool 入参校验失败时返回结构化错误，方便 MCP 客户端展示。
- 找不到记录时返回清晰的“未找到”类 tool error，不抛裸异常给客户端。
- 记录基础日志，便于排查 Claude Desktop、Cursor、MCP Inspector 的接入问题。

### Workspace updates

- 在应用入口注册 MCP 路由。
- 更新 `wrangler.jsonc` 和生成后的 Worker 类型声明，补上 `MCP_TOKEN` binding。
- 更新测试配置，让 Vitest Workers 在本地可跑，不依赖远程 Cloudflare 登录。

## Implementation Steps

1. 安装 `@hono/mcp` 与 `@modelcontextprotocol/sdk` 依赖。
2. 新增 `src/types/mcp.ts`，集中放置：
   - Bearer Token header schema
   - MCP tool 入参 schema
   - `DEFAULT_MCP_LIST_LIMIT`
   - `MAX_MCP_LIST_LIMIT`
3. 给 `TransactionRepository` 增加 `getRecent(limit)`。
4. 给 `TransactionService` 增加：
   - `listRecent(limit)`
   - `getBalanceReport(period)`
5. 新增 `src/middlewares/mcp-auth.ts`，只负责 Bearer Token 鉴权。
6. 新增 `src/routes/mcp.route.ts`：
   - 创建 MCP server
   - 注册 tools
   - 通过 `StreamableHTTPTransport` 处理请求
7. 在 `src/index.ts` 里挂载 `/api/mcp`，并补充 CORS。
8. 在 `wrangler.jsonc` 中新增 `MCP_TOKEN`。
9. 更新 `worker-configuration.d.ts`。
10. 新增集成测试和 schema 单测。
11. 执行 `pnpm cf-typegen` 和 `pnpm test` 验证结果。

## Public Interfaces

- 新增 HTTP 路由
  - `ALL /api/mcp`
- 新增 MCP tools
  - `create_transaction({ type, amount, category, note? })`
  - `get_transaction({ id })`
  - `list_transactions({ period?, limit? })`
  - `delete_transaction({ id })`
  - `get_balance_report({ period })`
- 新增配置
  - `MCP_TOKEN`
  - `Authorization: Bearer <token>`

## Test Plan

### Unit tests

- 校验 `McpListTransactionsSchema` 的默认值和上限。
- 校验 Bearer Token 鉴权分支。
- 校验 MCP tool 的参数映射逻辑和错误返回逻辑。

### Integration tests

- `ALL /api/mcp` 在正确 Bearer Token 下可以完成 initialize、tool discovery 和 tool call。
- 缺少或错误 Bearer Token 时直接拒绝访问。
- `create_transaction` 能成功写入 D1。
- `get_transaction` 和 `delete_transaction` 与现有 REST 行为一致。
- `get_balance_report` 与现有周/月统计结果一致。
- `list_transactions` 不传 `period` 时只返回默认条数，且 obey `limit` 上限。

### End-to-end verification

- 使用 MCP Inspector 实际连接远程 `/api/mcp`。
- 使用 Claude Desktop、Claude Code 或 Cursor 至少一个真实客户端验证工具发现和调用。
- 验证：
  - tool discovery 正常
  - `create_transaction` 正常
  - `list_transactions` 正常
  - `get_balance_report` 正常
  - 鉴权失败、参数错误、记录不存在时客户端能看到明确错误
- 使用 MCP Inspector 调试时，重点确认：
  - 远程 `Streamable HTTP` 地址能成功连接
  - `Authorization: Bearer <token>` 可以通过 Inspector 正确传递
  - `tools/list` 能列出全部 tools
  - `tools/call` 的返回内容与 `curl`/SDK 测试一致

### Manual debugging notes

- 如果 Inspector 连接失败，优先检查：
  - `/api/mcp` 是否已在本地或远程服务上启动
  - `MCP_TOKEN` 是否与请求头里的 Bearer Token 一致
  - 请求头是否包含 `Accept: application/json, text/event-stream`
  - Cloudflare Workers 本地测试是否使用了最新的 `worker-configuration.d.ts`
- 需要保留一份可复制的 Inspector 调试步骤，放在 `docs/test-example.md`，方便后续手动复现。

## Assumptions

- 目标客户端支持 remote HTTP MCP，这是本方案成立的前提。
- 本项目采用 `Streamable HTTP` 作为唯一主传输协议。
- HTTP SSE transport 只作为兼容背景存在，不作为主实现。
- 第一版不实现更新交易能力，只暴露新增、查询、删除和汇总相关工具。
- Bearer Token 是 MVP 鉴权方案，优先满足主流 MCP 客户端的预期。
- MCP 层不做 HTTP-to-HTTP 转发，而是直接调用内部 service，减少协议转换和错误处理复杂度。
