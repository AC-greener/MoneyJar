# AGENTS.md

MoneyJar 是一个智能记账项目：Android 客户端负责本地优先的记账体验，Cloudflare Workers 服务端负责 API、认证和 AI 语义解析，React 前端用于 Web 管理后台。

## 项目地图

```text
android/                      # Android App, Kotlin + Jetpack Compose
  app/src/main/java/com/example/moneyjar/
    auth/                     # Google 登录、Token 管理
    data/
      local/                  # Room Database / DAO
      model/                  # 本地数据模型
      remote/                 # Retrofit API / DTO
      repository/             # Repository 实现
      sync/                   # 同步相关逻辑
      voice/                  # Voice AI 数据源与编排
    ui/
      app/                    # App 状态与 ViewModel
      components/             # Compose 通用组件
      navigation/             # 导航
      screens/                # 页面
      theme/                  # Material3 主题
  gradle/libs.versions.toml   # Android 依赖版本统一入口

server/                       # Hono.js + Cloudflare Workers 服务端
  src/types/                  # Zod Schema + TypeScript 类型
  src/db/schema.ts            # Drizzle ORM 表结构
  src/repositories/           # D1 数据读写
  src/services/               # 业务逻辑与 AI 编排
  src/routes/                 # Hono 路由
  test/                       # Vitest / Workers runtime 测试

frontend/                     # React 19 + Vite Web 管理后台
docs/                         # 需求、架构、开发提醒
docs/plans/                   # 复杂改动计划文档
openspec/                     # OpenSpec 变更与规格
specs/002-google-login/       # Specify 生成的 Google 登录规格
backup/                       # 历史/临时备份材料
```

子项目细节优先看：
- 服务端：[server/AGENTS.md](/Users/tongtong/AndroidStudioProjects/MoneyJar/server/AGENTS.md)
- 前端：[frontend/AGENTS.md](/Users/tongtong/AndroidStudioProjects/MoneyJar/frontend/AGENTS.md)
- 通用提醒：[docs/dev-tips.md](/Users/tongtong/AndroidStudioProjects/MoneyJar/docs/dev-tips.md)

## 技术约束

| 范围 | 技术 | 约束 |
|------|------|------|
| Android UI | Kotlin + Jetpack Compose + Material3 | Min SDK 24, Target SDK 36 |
| Android 网络 | Retrofit 2 + OkHttp 4 | OkHttp 超时保持 30s 语义 |
| Android 存储 | Room + DataStore | Room 是 D1 的本地镜像与离线缓存 |
| Android 依赖 | Version Catalog | 禁止在 `build.gradle.kts` 硬编码依赖版本 |
| Server Runtime | Cloudflare Workers + Hono.js | 禁止 Node.js 专属 API |
| Server DB | Cloudflare D1 + Drizzle ORM | 迁移用 `drizzle-kit`，不要手改生成迁移 |
| AI | Workers AI / heuristic fallback | AI 输出必须经过 Zod 校验 |
| Frontend | React 19 + Vite + Tailwind v4 | API 响应使用 Zod 运行时校验 |

## 协作规则

1. 先读现有结构和相关文档，再改代码；不要按旧目录假设实现。
2. OpenSpec 路径必须写全：使用 `openspec/changes/...` 或 `openspec/specs/...`，不要只写 `changes/...`。
3. 涉及 Retrofit 接口、服务端 API、Drizzle Schema、跨端 JSON DTO、OAuth 流程时，先写计划或 OpenSpec，再实现。
4. 大改动按 phase 拆分；每个 phase 应能独立测试，完成后再进入下一阶段。
5. Android 端保持瘦逻辑：负责采集、展示、确认与缓存；语义解析交给服务端。
6. Android Data Class、TypeScript 类型、Zod Schema、Drizzle Schema 改动必须同步检查调用点和测试。
7. 服务端遵守单向依赖：`types -> db -> repositories -> services -> routes`；routes 不直接访问 repositories。
8. 新增/修改 public API、认证、同步或持久化逻辑时，必须补对应测试。
9. 工作区可能有未提交改动；不要回滚或覆盖与当前任务无关的用户改动。

## Voice AI 注意事项

- `submit` 表示“提交解析并判定”，不保证直接入库。
- 服务端可能返回 `ready_to_commit`、`needs_confirmation`、`failed`；确认弹窗通常是预期行为。
- Workers AI 不可用或返回异常时，必须保留 heuristic parser fallback。
- 扩充词表优先补分类名词和场景词，例如 `面`、`米线`、`包子`；不要主要依赖宽泛动词或整句模板。
- Web Speech API 只是文本输入增强层；手输、编辑、提交能力必须始终可用。
- 复盘见：[voice-ai retrospective](/Users/tongtong/AndroidStudioProjects/MoneyJar/openspec/changes/archive/2026-04-26-voice-ai-text-first-entry/retrospective.md)

## 常用命令

```bash
# Android
cd android && ./gradlew build
cd android && ./gradlew test
cd android && ./gradlew connectedAndroidTest
cd android && ./gradlew installDebug

# Server
cd server && pnpm dev
cd server && pnpm typecheck
cd server && pnpm test
cd server && pnpm db:generate
cd server && pnpm db:migrate
cd server && pnpm deploy

# Frontend
cd frontend && npm run dev
cd frontend && npm run build
cd frontend && npm run lint
cd frontend && npm test
```

## 测试门禁

- Android ViewModel / Repository / DTO 改动：运行 `cd android && ./gradlew test`。
- Android Compose UI 改动：优先补 `androidTest`，可运行时执行 `cd android && ./gradlew connectedAndroidTest`。
- Server routes/services/repositories/types/schema 改动：运行 `cd server && pnpm typecheck && pnpm test`。
- Frontend API/store/component 改动：运行 `cd frontend && npm run lint && npm test`。
- 如果环境限制导致测试无法运行，必须在交付说明中写明原因、已做的替代验证和剩余风险。

## 关键文档

- MVP PRD：[docs/requirements/01_MVP_PRD.md](/Users/tongtong/AndroidStudioProjects/MoneyJar/docs/requirements/01_MVP_PRD.md)
- 系统架构：[docs/architecture/SYSTEM_TAD.md](/Users/tongtong/AndroidStudioProjects/MoneyJar/docs/architecture/SYSTEM_TAD.md)
- API 草稿：[docs/api-doc.md](/Users/tongtong/AndroidStudioProjects/MoneyJar/docs/api-doc.md)
- Google 登录计划：[docs/google-login-plan.md](/Users/tongtong/AndroidStudioProjects/MoneyJar/docs/google-login-plan.md)
- 登录流程：[docs/login-process.md](/Users/tongtong/AndroidStudioProjects/MoneyJar/docs/login-process.md)
- OpenSpec 配置：[openspec/config.yaml](/Users/tongtong/AndroidStudioProjects/MoneyJar/openspec/config.yaml)

## 当前重点

- `002-google-login` 已引入 Google OAuth、`oauth_states`、`login_exchange_tokens`，相关规格在 `specs/002-google-login/`。
- Voice AI text-first entry 已归档，但 Android 侧仍有后续实现痕迹；改动前先对照 OpenSpec 和 retrospective。
- Server 测试质量改进仍在 `openspec/changes/improve-server-test-quality/` 下，处理测试结构时优先参考该变更。
