# CLAUDE.md

**MoneyJar** — 智能记账 Android 应用（Kotlin + Jetpack Compose）+ 边缘 AI 服务端（Hono.js）。

## 项目结构

```
android/                     # Android 应用（Kotlin + Jetpack Compose）
├── app/
│   └── src/main/java/com/example/moneyjar/
│       ├── MainActivity.kt          # 应用入口
│       ├── data/                    # Repository、Room Entity、Retrofit API
│       │   ├── local/              # Room Database、DAO
│       │   ├── remote/             # Retrofit Service、DTO
│       │   └── repository/         # Repository 实现
│       ├── domain/                  # DDD 领域层
│       │   ├── model/              # 领域模型（Account/Transaction/Budget/Analytics）
│       │   └── repository/         # Repository 接口
│       ├── ui/                      # Compose UI
│       │   ├── theme/              # Theme、Color、Type
│       │   ├── screens/            # 页面（Home/Stats/Settings 等）
│       │   └── components/         # 通用组件
│       └── voice/                   # ML Kit 语音识别
├── build.gradle.kts
├── settings.gradle.kts
└── gradle/

server/                      # Hono.js 边缘服务端
frontend/                    # React Web 管理后台（独立项目）
docs/                        # 需求与架构文档
plans/                       # 复杂改动执行计划
.github/                     # CI/CD 配置
```

## 技术栈约束

| 组件 | 技术 | 约束 |
|------|------|------|
| Android UI | Kotlin + Jetpack Compose (Material3) | Min SDK 24, Target SDK 36 |
| 网络层 | Retrofit 2 + OkHttp 4 | OkHttp 超时 30s |
| 存储层 | Room Database | 作为 D1 本地镜像 |
| 语音 | ML Kit Speech Recognition | 识别器指定 `zh-CN` |
| 服务端 | Hono.js + Cloudflare Workers | 禁止使用 Node.js 专属 API |
| AI | Vercel AI SDK / Workers AI | 必须用 Zod 校验输出 |
| 数据库 | Cloudflare D1 + Drizzle ORM | 迁移用 `drizzle-kit` |
| 依赖管理 | `gradle/libs.versions.toml` | **禁止在 build.gradle.kts 硬编码版本号** |

## 常用命令

```bash
# Android
cd android && ./gradlew build              # 构建项目
cd android && ./gradlew installDebug       # 安装 Debug APK
cd android && ./gradlew test               # 运行单元测试
cd android && ./gradlew connectedAndroidTest # 真机/模拟器测试
cd android && ./gradlew assembleRelease    # 生成 Release 包

# Server
cd server && pnpm dev        # 本地开发
cd server && pnpm deploy     # 生产部署
cd server && pnpm db:push    # 推送 D1 Schema
cd server && pnpm test       # 运行测试

# Frontend
cd frontend && npm run dev   # 开发服务器
```

## AI 协作规范

1. **Plan First**：涉及 Retrofit 接口或 Schema 变更时，必须先在 `plans/` 创建步骤文档
2. **瘦逻辑原则**：Android 端只负责语音采集和展示，语义解析交给服务端 AI
3. **类型安全**：Android Data Class 必须与服务端 JSON 结构严格一致
4. **错误处理**：OkHttp 超时设为 30s，考虑无网络下的 Room 缓存

## 测试要求

- **Android Unit Tests**: `android/app/src/test/`，重点测试 ViewModel State 和 Repository
- **Android UI Tests**: `android/app/src/androidTest/`，使用 Compose Test Rule
- **Server Integration Tests**: `test/integration/`，使用 Vitest + Hono testClient
- 任务完成前必须运行测试并确保通过

## 关键文档

- 需求场景：`docs/requirements/01_MVP_PRD.md`
- 技术架构：`docs/architecture/SYSTEM_TAD.md`
- 服务端详细规范：`server/CLAUDE.md`
- 前端详细规范：`frontend/CLAUDE.md`
- 数据库操作：`docs/DATABASE.md`

## Active Technologies
- TypeScript 5.x (服务端), React 19 (前端) | Kotlin (Android - 不在此功能范围) + Hono.js, Drizzle ORM, Zod, jose, Cloudflare Workers, Vitest, React Router v7 (002-google-login)
- Cloudflare D1 (SQLite) - 新增 `oauth_states`、`login_exchange_tokens` 表 (002-google-login)

## Recent Changes
- 002-google-login: Added TypeScript 5.x (服务端), React 19 (前端) | Kotlin (Android - 不在此功能范围) + Hono.js, Drizzle ORM, Zod, jose, Cloudflare Workers, Vitest, React Router v7
