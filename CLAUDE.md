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

- **框架**：Hono.js。
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

------

### 💡 下一步建议

现在你的项目已经有了完整的“大脑（AGENT.md）”和“地图（Docs）”。

**你想让我根据 `AGENT.md` 里的规范，帮你生成第一个 Plan 文档 `plans/001-setup-stt-and-retrofit.md` 吗？我们将先实现语音转文字并发送给后端。**
