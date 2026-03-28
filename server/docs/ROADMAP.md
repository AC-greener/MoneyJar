# MoneyJar Server — 开发路线图

## Phase 1：数据层基础

**目标**：建立真实的业务数据模型，替换测试用的 posts 表。

### 任务

- [ ] 重写 `src/db/schema.ts`，定义 `accounts` + `transactions` 表
- [ ] 运行 `pnpm db:generate` 生成迁移文件，`pnpm db:up` 应用到 D1
- [ ] 实现 Account CRUD：`GET /api/accounts`、`POST /api/accounts`
- [ ] 实现 Transaction CRUD：`GET /api/transactions`、`POST /api/transactions`
- [ ] 删除 `posts` 相关的所有代码

### 验收标准

- 可通过 `POST /api/accounts` 创建账户，`POST /api/transactions` 手动写入一笔交易
- D1 中数据持久化正常，字段类型与 Zod Schema 严格一致
- 所有端点有对应的 Integration Test

---

## Phase 1.5：日志基础设施

**目标**：记录 API 调用过程中产生的信息和错误，方便排查问题。

### 任务

- [x] 新增 `request_logs` 表（`src/db/schema.ts`）
- [x] 实现日志中间件 `src/middlewares/logger.ts`
- [x] 实现错误处理中间件 `src/middlewares/error-handler.ts`
- [x] 实现 `src/repositories/log.repository.ts`
- [x] 实现 `src/services/log.service.ts`
- [x] 配置 Cron Trigger 每天凌晨执行日志清理（`wrangler.jsonc`）
- [x] 实现 `src/services/retention.service.ts`
- [x] 所有端点响应包含 `requestId`，便于问题追溯

### 验收标准

- POST/PUT/DELETE 请求自动记录到 `request_logs` 表
- HTTP 状态码 >= 400 的响应自动记录
- GET 请求不记录（简单查询不包含 AI 运算）
- `/health` 和 `/favicon` 跳过日志记录
- 响应头包含 `X-Request-Id`
- 错误响应包含 `requestId`
- 日志保留 30 天后自动清理

---

## Phase 2：AI 语义解析（核心功能）

**目标**：打通"语音文本 → 结构化记账"的核心主链路。

### 任务

- [ ] 实现 `src/services/ai.service.ts`，封装 Workers AI 调用
- [ ] 实现 `POST /api/transactions/parse` 端点：接收语音识别文本，返回解析后的 `{ amount, type, category, note }`
- [ ] 对 AI 输出用 Zod Schema 强制校验，定义 fallback 错误响应
- [ ] 与 Android 端联调，验证"说话 → 解析 → 存储"全链路

### 验收标准

- 输入"今天买咖啡花了 38 块"，返回结构化 JSON，金额和分类字段正确
- AI 解析失败时（格式错误 / 超时），返回明确错误码，不崩溃
- 有 AI Logic Test 覆盖典型输入的解析结果断言

---

## Phase 3：补全业务领域

**目标**：实现 Budget 和 Analytics，完善核心记账闭环。

### 任务

- [ ] **Budget**：`GET /api/budgets`、`POST /api/budgets`，支持按分类设定限额
- [ ] **Analytics**：`GET /api/analytics/summary`，按时间段聚合收支数据
- [ ] **MCP 适配层**：实现 `GET /api/mcp`（SSE），暴露 `create_transaction`、`get_balance_report` 工具，配置 MCP-Token 鉴权

### 验收标准

- Budget 限额可正常读写
- Analytics summary 返回按分类汇总的支出金额
- MCP 端点可被 Claude Desktop 连接并成功调用工具

---

## Phase 4：身份认证（按需）

**触发条件**：需要支持多用户或面向公网开放时再实施，单人使用可跳过。

### 方案选项

- **Cloudflare Access**：零代码接入，适合个人或小团队，通过 CF 控制台配置即可
- **JWT 自实现**：适合需要细粒度权限控制的场景，在 `src/middlewares/` 中实现验证中间件

### 验收标准

- 未携带有效凭证的请求返回 `401`
- MCP-Token 鉴权与通用认证方案独立，互不干扰
