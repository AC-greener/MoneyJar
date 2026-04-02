# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

------

# MoneyJar Server — Agent Guide (V2.0)

## 项目概述

**MoneyJar** 是一款智能记账应用的服务端，运行于 Cloudflare Workers 边缘网络。

- **核心理念**：瘦客户端 + 边缘 AI。Android 端只负责语音采集与界面展示，复杂的语义解析和业务逻辑全部在服务端处理。
- **交互主链路**：Android 语音识别 → 文本发送至服务端 → Workers AI 语义解析 → 结构化写入 D1。

------

## 知识库索引 (重要)

在执行任何任务前，请先阅读以下文档：

1. **需求场景**：`./docs/requirements/01_MVP_PRD.md`（包含语音、离线、周报三大场景）。
2. **技术架构**：`./docs/architecture/SYSTEM_TAD.md`（定义了前后端协议与 AI 逻辑）。
3. **开发路线图**：`./docs/ROADMAP.md`（四阶段开发顺序与每阶段验收标准）。
4. **数据库操作**：`./docs/DATABASE.md`（Schema、迁移命令、开发流程说明）。
5. **执行计划**：`./plans/`（所有复杂改动必须先在此建立步骤文档）。

------

## 技术栈与约束

### 服务端 (Serverless Edge)

- **运行时**：Cloudflare Workers（禁止使用 Node.js 专属 API）。
- **框架**：Hono.js，参考文档：https://hono.dev/llms.txt。
- **AI 推理**：**Cloudflare Workers AI**，通过 `c.env.AI` binding 调用。
  - 语义解析模型：`@cf/meta/llama-3.3-70b-instruct-fp8-fast`。
  - 必须通过 Zod Schema 对 AI 输出进行结构化校验，确保字段类型安全。
- **数据库**：Cloudflare D1（SQLite）+ Drizzle ORM，通过 `c.env.DB` binding 访问。
- **Schema 管理**：使用 `drizzle-kit` 生成迁移文件，禁止手动修改 `drizzle/` 目录下的文件。
- **输入校验**：所有 API 入参必须使用 Zod 校验，不得信任原始请求数据。

### Zod 使用规范

Zod 错误对象的正确属性：
```typescript
const parsed = MySchema.safeParse(data);
if (!parsed.success) {
  // ✅ 正确：使用 .issues 获取错误详情
  return c.json({ error: parsed.error.issues }, 400);
  // ❌ 错误：ZodError 没有 .errors 属性
}
```

常用 Zod API：
- `schema.parse(data)` - 解析失败会抛异常
- `schema.safeParse(data)` - 返回 `{ success: true, data }` 或 `{ success: false, error }`
- `error.issues` - 获取所有验证错误（是数组）
- `error.message` - 人类可读的单个错误消息

------

## 常用工程命令

| **任务**             | **命令**                    |
| -------------------- | --------------------------- |
| **本地开发**         | `pnpm dev`                  |
| **生产部署**         | `pnpm deploy`               |
| **类型检查**         | `pnpm typecheck`            |
| **生成迁移文件**     | `pnpm db:generate`          |
| **应用迁移**         | `pnpm db:migrate`           |
| **直接推送（开发用）** | `pnpm db:push`            |
| **刷新 CF 类型**     | `pnpm cf-typegen`           |
| **运行测试**         | `pnpm test`                 |

------

## AI 协作规范

1. **Plan First**：涉及新 API 端点或数据库 Schema 变更时，必须先在 `/plans` 创建步骤文档再编码。
2. **计划文件要求**：每次制定计划后，必须将完整计划写入 `plans/XXX-{feature-name}.md`，文件名使用序号和功能名称。不得只在脑海中规划，必须形成文档。
3. **AI 输出约束**：调用 Workers AI 时，必须在 Prompt 中明确要求返回 JSON，并用 Zod 解析结果，不得直接使用 AI 原始字符串输出。
4. **类型安全**：服务端 JSON 返回结构必须与 Android 端 Kotlin Data Class 严格一致，变更时需同步通知。
5. **错误处理**：AI 推理可能超时或返回格式错误，必须有 fallback 处理逻辑，向客户端返回明确的错误码。

------

## TypeScript 收尾门禁

所有 TypeScript 任务都必须遵循“先对齐类型，再写实现，结束前过类型检查”的流程，禁止把 TS 报错留到人工收尾阶段。

### 开发前检查

- 开工前必须先阅读相关 `src/types/`、`src/db/schema.ts`、service/repository 接口和对应测试，确认类型来源后再编码。
- 默认使用单向类型流：`schema -> inferred type -> service/repository -> route`，禁止在多个层重复手写一套相同类型。
- 若任务会新增字段、修改返回结构或调整函数签名，必须先识别受影响的调用链，再开始改代码。

### 实现过程约束

- 新增字段时，必须同步更新 schema、推导类型、实现代码和测试，禁止只改其中一处。
- 类型转换只允许集中在边界层（HTTP 入参、数据库映射、第三方响应适配），业务逻辑内部应尽量消费已校验的类型。
- 禁止使用 `any`、`as unknown as`、忽略报错式写法或临时类型断言来掩盖问题，除非计划文档明确允许且说明原因。
- 修改 public interface、Zod Schema、Drizzle Schema 或 service 返回值时，必须同步检查所有调用点和测试。

### 完成前门禁

- 任务完成前必须运行 `pnpm typecheck`，若存在 TypeScript 报错，禁止宣告完成。
- 若仓库本身已有 TS 报错，必须明确区分“本次引入问题”和“原有遗留问题”，不得把基线不绿的状态伪装为任务完成。
- Claude Code 项目级 `Stop` hook 会在结束前自动执行 `pnpm typecheck`；如果检查失败，Claude 必须继续修复后再结束本轮任务。

------

## 分层架构规范 (Agent-First)

架构采用**严格单向分层**，每层只能依赖下方的层，禁止跨层或反向依赖。

```
types → db → repositories → services → routes
```

| 层次 | 目录 | 职责 | 允许依赖 |
| --- | --- | --- | --- |
| **Types** | `src/types/` | Zod Schema + TypeScript 类型定义 | 无（最底层） |
| **DB** | `src/db/` | Drizzle ORM 表结构定义 | types |
| **Repositories** | `src/repositories/` | D1 数据库 CRUD，无业务逻辑 | db |
| **Services** | `src/services/` | 业务逻辑、AI 调用编排 | repositories, types |
| **Middlewares** | `src/middlewares/` | Hono 中间件（auth、错误处理、日志） | types |
| **Routes** | `src/routes/` | Hono 路由、入参校验、响应格式化 | services, types |
| **Entry** | `src/index.ts` | 路由注册、中间件挂载、Bindings 声明 | routes, middlewares |

**横切关注点**（auth、错误处理、日志）统一放在 `src/middlewares/`，通过 `index.ts` 全局挂载，不得散落在 routes 或 services 中。

### 黄金原则（机械性规则）

- 禁止在 `routes/` 中直接调用 `repositories/`，必须经过 `services/`。
- 禁止在 `repositories/` 中写业务判断逻辑，只做数据读写。
- 禁止在 `index.ts` 中写任何业务代码，只做注册和挂载。
- AI 输出必须经过 `types/` 中定义的 Zod Schema 解析，禁止直接使用原始字符串。
- 所有 D1 查询必须经过 Drizzle ORM，禁止拼接原始 SQL 字符串。
- **所有代码注释必须使用中文**，不得使用英文注释。

------

## 核心目录结构

```
src/
├── index.ts              # 应用入口，仅做路由注册和 Bindings 声明
├── types/                # Zod Schema + 类型（最底层，无任何依赖）
├── db/                   # Drizzle ORM 表结构（只依赖 types）
│   └── schema.ts
├── repositories/         # 数据访问层（只依赖 db）
├── services/             # 业务逻辑层（只依赖 repositories + types）
├── middlewares/          # Hono 中间件（auth、错误处理、日志，只依赖 types）
└── routes/               # Hono 路由层（只依赖 services + types）
test/
├── integration/          # HTTP 级别集成测试（测试 routes 端点）
├── unit/                 # 单元测试（测试 services / repositories）
└── fixtures/             # 共享 mock 数据
drizzle/                  # 自动生成的迁移文件，禁止手动修改
plans/                    # 复杂任务执行计划
docs/                     # 需求与架构文档
```

> 各目录当前为空（含 `.gitkeep`），按需新增文件时须遵循分层架构规范。

------

## 核心领域模型 (DDD)

架构遵循领域驱动设计，将业务逻辑拆分为2大核心领域：

- **Transaction（交易）**：核心记账引擎，处理收入、支出、转账原子操作。
- **Budget（预算）**：限额设定、超支预警及周期性财务计划。
- **Analytics（分析）**：数据聚合、报表生成及 AI 财务趋势预测。

**扩展性策略**：统计图表、外汇转换等附加模块需与核心交易引擎解耦，通过 Feature Toggle 动态开启。

------

## MCP (Model Context Protocol) 适配层

服务端暴露 MCP 兼容接口，支持 AI Agent 直接操作账本。

- **协议**：基于 HTTP 的 SSE (Server-Sent Events)。
- **Endpoint**：`/api/mcp`。
- **暴露工具**：
  - `create_transaction(amount, category, note)`：AI 直接执行记账。
  - `get_balance_report(period)`：返回结构化财务摘要。
- **安全**：仅允许携带 `MCP-Token` 的请求连接，Token 通过 Workers 环境变量注入。

------

## 规划中的功能 (Future Roadmap)

以下功能**尚未实现**，但在设计新功能时需避免与其产生架构冲突。

### Cloudflare Vectorize — 语义增强层

当以下功能开发时，引入 **Cloudflare Vectorize** 向量数据库，与 D1 并存：

**1. 自然语言查账**

用户可用口语提问，如"上个月我在哪花了最多钱"、"帮我看看我的奶茶支出"。

- 实现方案：RAG 模式——将历史 Transaction 记录向量化存入 Vectorize，查询时检索相关记录后拼入 Prompt，由 Workers AI 生成自然语言回答。
- Binding 名称（预留）：`VECTORIZE`

**2. 个性化财务建议**

基于用户历史消费习惯，主动推送财务洞察，如"你本月餐饮支出比上月高 40%"。

- 实现方案：对消费模式做语义聚类，结合 Workers AI 生成个性化建议文本。

**注意**：在此之前，所有查账需求通过 D1 SQL 聚合查询实现，禁止提前引入 Vectorize 增加复杂度。

------

## 测试与质量保障

### 测试框架

**Vitest + `@cloudflare/vitest-pool-workers`**

测试运行在真实的 Workers 运行时（非 Node.js），D1、AI 等 binding 行为与生产环境一致。

### 目录规范

- `test/integration/` — HTTP 级别集成测试，使用 Hono `testClient` 模拟请求，验证路由响应和 Zod 校验。
- `test/unit/` — 单元测试，重点覆盖 services 业务逻辑和 AI 解析结果断言。
- `test/fixtures/` — 共享 mock 数据，禁止在各测试文件中重复定义相同的测试数据。

### 命名规范

测试文件与源文件对应，后缀改为 `.test.ts`：

```
src/services/transaction.service.ts  →  test/unit/transaction.service.test.ts
src/routes/transaction.route.ts      →  test/integration/transaction.test.ts
```

### 强制规则

- 所有新功能必须包含对应测试，禁止提交无测试覆盖的业务逻辑。
- 修改现有逻辑时，必须同步修复受影响的旧测试。

### Agent 自动化流程

- 宣布任务完成前，必须按顺序运行以下检查并汇报结果：
  1. `pnpm typecheck`
  2. 与本次改动相关的测试
  3. 如任务涉及格式或规范调整，再运行对应 lint / format 检查
- 测试未通过时，禁止继续推进新功能，必须优先修复。
- `pnpm typecheck` 未通过时，禁止宣告任务完成，必须优先修复类型错误或明确说明基线遗留问题。
