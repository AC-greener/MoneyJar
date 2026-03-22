 **Vercel AI SDK 驱动版** 任务书：

---

# 🚀 项目：【钱罐子 / MoneyJar】全栈任务书 (V3 - Vercel AI 驱动版)

## 1. 核心架构：Server-Side AI 
* **Android (瘦客户端)**：仅负责录音转文字 (STT)、拍照预览、展示后端传回的结构化 JSON, 使用Retrofit 2 + OkHttp 4作为http请求
* **Vercel AI SDK (中间层)**：部署在服务端，负责编排 Prompt、调用 Gemini 模型、并将非结构化语言转换为标准账单字段。
* **统一协议**：所有端（Android/iOS/Web）均请求同一个 `/api/chat` 或 `/api/parse` 接口。
* **后端：**使用Hono.js：https://hono.dev/

---

## 2. 第一阶段：Android 端（数据采集层）
- [ ] **Task 2.1: 极简输入流实现**
    - 实现 **语音记账** 交互：调用 `ML Kit` 获取文字。
    - 【低优先级】实现 **拍照记账** 交互：调用 `CameraX` 获取图片 Base64。
- [ ] **Task 2.2: 后端交互层 (Retrofit)**
    - 定义 `ApiService` 接口，仅需一个 `POST /process` 动作，发送原始文本或图片给后端。
    - **瘦逻辑**：ViewModel 不解析字符串，只等待后端的 JSON 响应并直接刷新 Room 缓存。

---

## 3. 第二阶段：服务端（大脑层 - 使用 Vercel AI SDK）
- [ ] **Task 3.1: 搭建 AI 服务端环境**
    - 初始化 Hono.js项目，引入 `@ai-sdk/google` (用于调用 Gemini)。
- [ ] **Task 3.2: 语义解析逻辑 (generateObject)**
    - 使用 Vercel AI SDK 的 `generateObject` 功能，定义 `Zod` Schema（金额、分类、日期、备注）。
    - **逻辑说明**：接收前端传来的“大白话”，AI 自动校对并返回标准 JSON。
- [ ] **Task 3.3: 财务助手对话 (streamText)**
    - 实现聊天接口。用户问：“我这个月买相机镜头花了多少？”
    - **RAG 逻辑**：后端查询 D1 数据库，将结果喂给 Vercel AI SDK，由 AI 组织语言回传给安卓端。

---

## 4. 第三阶段：数据持久化 (Cloudflare D1)
- [ ] **Task 4.1: 后端自动入库**
    - 当 Vercel AI SDK 完成解析后，直接由后端执行 SQL 存入 Cloudflare D1，无需安卓端二次请求。
- [ ] **Task 4.2: 状态反馈**
    - 后端存入成功后，返回 `success` 状态和完整的 `record_id` 给安卓端进行本地 UI 确认。

---

## 5. 技术栈职责划分 (Update)
| 模块 | 技术选型 | 核心职责 |
| :--- | :--- | :--- |
| **Android Client** | Kotlin + Compose + Room | 采集语音/图片、显示后端计算好的图表、本地缓存。 |
| **Server Logic** | **Vercel AI SDK** (Core) | **Prompt 工程、模型调用、结构化数据提取、财务逻辑。** |
| **Infrastructure** | Cloudflare D1 + R2 | 账单数据存储、摄影照片/票据图片存储。 |
| **AI Model** | Gemini 1.5 Flash / Pro | 处理文本理解、图像识别 (OCR)。 |

---

## 6. 前后端 AI 通信协议示例 (JSON)

### 📤 Android 发送给 Server:
```json
{
  "type": "voice_text",
  "content": "昨天在路口买了两斤苹果 15 块钱",
  "timestamp": 1710834000
}
```

### 📥 Server (Vercel AI SDK) 返回给 Android:
```json
{
  "status": "success",
  "data": {
    "amount": 15.0,
    "category": "水果生鲜",
    "note": "两斤苹果",
    "is_auto_inserted": true
  }
}
```

