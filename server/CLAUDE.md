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
3. **执行计划**：`./plans/`（所有复杂改动必须先在此建立步骤文档）。

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

------

## 常用工程命令

| **任务**         | **命令**                    |
| ---------------- | --------------------------- |
| **本地开发**     | `pnpm dev`                  |
| **生产部署**     | `pnpm deploy`               |
| **生成迁移文件** | `pnpm db:generate`          |
| **应用迁移**     | `pnpm db:up`                |
| **刷新 CF 类型** | `pnpm cf-typegen`           |
| **运行测试**     | `pnpm test`                 |

------

## AI 协作规范

1. **Plan First**：涉及新 API 端点或数据库 Schema 变更时，必须先在 `/plans` 创建步骤文档再编码。
2. **AI 输出约束**：调用 Workers AI 时，必须在 Prompt 中明确要求返回 JSON，并用 Zod 解析结果，不得直接使用 AI 原始字符串输出。
3. **类型安全**：服务端 JSON 返回结构必须与 Android 端 Kotlin Data Class 严格一致，变更时需同步通知。
4. **错误处理**：AI 推理可能超时或返回格式错误，必须有 fallback 处理逻辑，向客户端返回明确的错误码。

------

## 核心目录索引

```
src/
├── index.ts          # 应用入口，路由注册
└── db/
    └── schema.ts     # Drizzle ORM Schema 定义（所有表结构改动入口）
drizzle/              # 自动生成的迁移文件，禁止手动修改
plans/                # 复杂任务的执行计划文档
docs/                 # 需求与架构文档
```

------

## 核心领域模型 (DDD)

架构遵循领域驱动设计，将业务逻辑拆分为四大核心领域：

- **Account（账户）**：现金、银行卡、信用卡等资产状态及余额管理。
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

## 测试与质量保障

### 强制规则

- 所有新功能必须包含对应测试，禁止提交无测试覆盖的业务逻辑。
- 修改现有逻辑时，必须同步修复受影响的旧测试。

### 测试分类

- **Integration Tests**：模拟 HTTP 请求，验证 Zod Schema 校验和 D1 的 CRUD 操作。
- **AI Logic Tests**：对 Prompt 解析结果进行断言，确保金额、分类字段提取准确。

### Agent 自动化流程

- 宣布任务完成前，必须运行 `pnpm test` 并汇报结果。
- 测试未通过时，禁止继续推进新功能，必须优先修复。
