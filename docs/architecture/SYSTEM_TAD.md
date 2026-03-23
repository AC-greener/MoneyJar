# 🏗️ 【钱罐子 / MoneyJar】技术架构文档 (TAD)

## 1. 架构总览 (High-Level Architecture)

本项目采用 **“瘦客户端 (Thin Client) + 边缘计算 (Edge Computing)”** 架构。核心业务逻辑（尤其是 AI 处理）集中在服务端，客户端保持轻量，确保多端一致性并降低设备功耗。

- **Android 端**：基于 Jetpack Compose 的 UI 渲染层与数据采集层。
- **Hono.js 服务端**：部署在边缘环境（Vercel/Cloudflare），负责 AI 编排与业务路由。
- **AI 引擎**：Vercel AI SDK 驱动的 Gemini 1.5 系列模型。
- **数据层**：Cloudflare D1 (关系型数据库) + R2 (对象存储)。

------

## 2. 客户端架构 (Android Client)

客户端遵循 **MVVM + Repository** 模式，强调离线优先（Offline-First）。

### 2.1 核心组件

- **UI Layer**: 使用 Jetpack Compose，配合 Material 3 规范实现响应式布局。
- **Networking**: **Retrofit 2 + OkHttp 4**。配置 30s 响应超时以适配 AI 解析耗时。
- **Local Persistence**: **Room Database**。作为云端 D1 数据库的本地镜像，支持断网写入。
- **Sensors/ML**: 集成 Google ML Kit 实现本地文本转语音 (STT)，减少原始音频上传的带宽消耗。

### 2.2 数据同步逻辑

- 账单数据通过 `sync_status` 字段标记（0: 待同步, 1: 已同步）。
- 网络恢复后，通过 `WorkManager` 触发增量同步。

------

## 3. 服务端架构 (Hono.js Server)

服务端作为系统的“智能中枢”，处理所有非结构化请求。

### 3.1 AI 处理链路 (Vercel AI SDK)

- **语义解析 (`/api/parse`)**: 接收原始文本，利用 `generateObject` 强制 AI 输出符合 Zod Schema 的结构化账单对象。
- **财务助手 (`/api/chat`)**: 利用 `streamText` 实现流式对话，通过 RAG 模式查询 D1 数据并生成财务分析。
- **模型选型**: 默认使用 **Gemini 1.5 Flash**（平衡速度与成本），复杂分析使用 Gemini 1.5 Pro。

### 3.2 存储方案

- **关系型数据**: Cloudflare D1 (SQLite-based)，使用 **Drizzle ORM** 进行类型安全的数据库操作。
- **多媒体资产**: 拍摄的票据图片存储于 Cloudflare R2。

------

## 4. 通信协议规范 (API Contracts)

### 4.1 认证与鉴权

- 预留 JWT (JSON Web Token) 接口，所有请求需在 Header 携带 `Authorization: Bearer <token>`。

### 4.2 统一记账接口示例

- **Endpoint**: `POST /api/record`

- **请求体 (Request)**:

  JSON

  ```
  {
    "type": "voice_text" | "image_url",
    "content": "昨天买镜头花了 5000",
    "metadata": { "lat": 0.0, "lng": 0.0 }
  }
  ```

- **响应体 (Response)**:

  JSON

  ```
  {
    "status": "success",
    "data": {
      "record_id": "uuid",
      "amount": 5000.0,
      "category": "数码摄影",
      "note": "A7M4 镜头",
      "timestamp": 1710834000
    }
  }
  ```

------

## 5. 安全与性能考量

- **安全性**: API Key 存储在 Vercel/Cloudflare 环境变量中，绝不暴露给客户端。
- **限流**: 服务端实现 Rate Limiting，防止 AI API 被异常调用导致超支。
- **性能**: 图像上传前在 Android 端进行压缩处理；AI 解析结果在服务端进行 Schema 校验后再入库。

------

## 6. 需求场景覆盖 (Traceability)

- **场景 A (语音记账)**: 依赖 `ML Kit (Client)` -> `Retrofit` -> `Hono.js + AI SDK (Server)` -> `D1`。
- **场景 B (离线记账)**: 依赖 `Room (Client)` -> `WorkManager` 异步推送 -> `Hono.js`。
- **场景 C (汇总查看)**: 依赖 `Hono.js` 聚合 SQL 查询 -> `Retrofit` -> `Compose UI`。

------

### 💡 如何使用此文档

你可以将此文档放入 `/docs/architecture/`。每当你开启一个新的代码模块（比如写 Retrofit 封装或写 Hono 路由）时，直接发给 AI 并说：

> “请查阅 `SYSTEM_TAD.md` 中的**第 3 节和第 4 节**，按照定义的协议规范和技术栈，帮我生成 Hono.js 的记账解析路由代码。”

**这套架构现在非常清晰了。需要我帮你针对其中的“数据同步逻辑”或“AI 提示词工程”写一份更细化的子文档吗？**