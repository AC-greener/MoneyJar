# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

------

# 🤖 MoneyJar Project Agent Guide (V1.0)

## 🌟 项目概述

**MoneyJar** 是一款使用 Kotlin 和 Jetpack Compose 构建的智能记账 Android 应用。

- **核心理念**：瘦客户端（Android）+ 边缘 AI（Hono.js）。
- **交互愿景**：通过语音 (ML Kit) 与图像识别，实现“开口即记”的无感财务管理。

------

## 📚 知识库索引 (重要)

在执行任何任务前，请先阅读以下文档：

1. **需求场景**：`./docs/requirements/01_MVP_PRD.md` (包含语音、离线、周报三大场景)。
2. **技术架构**：`./docs/architecture/SYSTEM_TAD.md` (定义了前后端协议与 AI SDK 逻辑)。
3. **执行计划**：`./plans/` (所有复杂改动必须先在此建立步骤文档)。

------

## 🛠️ 技术栈与约束

### 📱 Android 客户端

- **语言与 UI**：Kotlin + Jetpack Compose (Material3)。
- **系统配置**：Min SDK 24, **Target SDK 36**。启用 `enableEdgeToEdge()`。
- **网络层**：必须使用 **Retrofit 2 + OkHttp 4**。
- **存储层**：Room Database（作为云端 D1 的本地镜像）。
- **语音方案**：**ML Kit Speech Recognition (v16.1.3)**。
  - 识别器需指定 `zh-CN`。
  - 必须处理 `RECORD_AUDIO` 运行时权限。
- **依赖管理**：严格使用 `gradle/libs.versions.toml`，禁止在 `build.gradle.kts` 中硬编码版本号。

### 🌐 服务端 (Serverless)

- **框架**：Hono.js：https://hono.dev/llms.txt。
- **AI 编排**：Vercel AI SDK (Google Gemini 1.5)。
- **数据库**：Cloudflare D1 + Drizzle ORM。

------

## 💻 常用工程命令

当需要进行构建、测试或安装时，请使用以下命令：

| **任务**            | **命令**                               |
| ------------------- | -------------------------------------- |
| **构建项目**        | `./gradlew build`                      |
| **安装 Debug APK**  | `./gradlew installDebug`               |
| **运行单元测试**    | `./gradlew test`                       |
| **运行特定测试**    | `./gradlew test --tests "类名.方法名"` |
| **真机/模拟器测试** | `./gradlew connectedAndroidTest`       |
| **生成 Release 包** | `./gradlew assembleRelease`            |
| **清理工程**        | `./gradlew clean`                      |

------

## 🔄 AI 协作规范

1. **Plan First**：在编写代码前，请先口述你的逻辑或在 `/plans` 创建文档，尤其是涉及 Retrofit 接口与后端 Hono 联调时。
2. **瘦逻辑原则**：Android 端只负责采集（语音转文字）和展示。复杂的语义解析（金额提取、分类）必须交给服务端的 Vercel AI SDK 处理。
3. **类型安全**：确保 Android 的 Data Class 与服务端的 JSON 返回结构严格一致。
4. **错误处理**：必须考虑 AI 解析延迟（建议 OkHttp 超时设为 30s）及无网络下的本地 Room 缓存逻辑。

------

## 📂 核心目录索引

- `app/src/main/java/.../`：业务代码。
- `ui/theme/`：Compose 主题、颜色与动态色彩配置。
- `gradle/libs.versions.toml`：版本控制中心。

## 核心领域模型 (DDD & Scalability)

为了防止功能增加导致的系统臃肿，架构遵循 **领域驱动设计 (DDD)** 模式，将业务逻辑拆分为四大核心领域：

- **Account (账户)**：管理现金、银行卡、信用卡等资产状态及余额。
- **Transaction (交易)**：核心记账引擎，处理收入、支出、转账等原子操作。
- **Budget (预算)**：负责限额设定、超支预警及周期性财务计划。
- **Analytics (分析)**：负责数据聚合、报表生成及 AI 财务趋势预测。

### 扩展性策略：

- **插件化/功能开关 (Feature Toggles)**：统计图表、外汇转换、摄影器材折旧等模块需与核心交易引擎解耦，支持通过配置动态开启。
- **多端抽象**：Repository 层与 Network 层采用平台无关化设计，为未来迁移至 Kotlin Multiplatform (KMP) 预留接口。

## MCP (Model Context Protocol) 适配层

为了实现 AI Agent 生态的互操作性，服务端需暴露 MCP 兼容接口。

### 传输规范

- **协议**: 基于 HTTP 的 SSE (Server-Sent Events)。
- **Endpoint**: `/api/mcp`。

### 暴露的工具 (Tools)

- `create_transaction(amount, category, note)`: 允许 AI 直接执行记账动作。
- `get_balance_report(period)`: 返回结构化的财务摘要，供 AI 进行二次分析。

### 安全策略

- **MCP-Token**: 仅允许携带特定私密 Token 的 MCP Host（如 Claude Desktop）进行连接。
- 

## 🧪 测试与质量保障 (Testing Requirements)

### 强制性规则
- **全覆盖原则**：所有新开发的功能（Android 端或 Hono 端）必须包含对应的测试用例。禁止提交没有测试支撑的业务逻辑改动。
- **同步更新**：修改现有逻辑时，必须同步修复受影响的旧测试用例。

### 测试分类规范
- **Android 端**:
    - **Unit Tests**: 放置在 `app/src/test/`。重点测试 ViewModel 的 State 转换和 Repository 的逻辑。
    - **Compose UI Tests**: 放置在 `app/src/androidTest/`。使用 Compose Test Rule 验证核心交互（如记账按钮点击）。
- **Hono 服务端**:
    - **Integration Tests**: 模拟 HTTP 请求，验证 Zod Schema 校验和 D1 数据库的 CRUD 操作。
    - **AI Logic Tests**: 针对 Prompt 解析结果进行断言，确保金额、分类等字段提取准确。

### Agent 自动化流程 (Workflow)
- **验证指令**: 在宣布任务完成前，Agent 必须主动运行 `./gradlew test` (Android) 或 `npm test` (Hono) 并汇报结果。
- **红色报警**: 如果测试未通过，Agent 必须优先修复测试，禁止继续推进新功能。

