# frontend/AGENTS.md

MoneyJar Frontend 是 React Web 管理后台，用于登录、交易录入、语音文本输入增强、数据列表、统计图表和设置管理。

## 目录地图

```text
src/
  App.tsx                  # 路由与页面装配
  api/                     # Axios client 与 API 调用
  components/
    charts/                # Recharts 图表
    common/                # Button、Input、Modal、ErrorBoundary 等通用组件
    expense/               # 记账输入
    settings/              # 设置页组件
    transaction/           # 交易列表、确认弹窗
    voice/                 # 语音输入 UI
  hooks/                   # 自定义 hooks
  pages/
    RecordPage/            # 记录页
    SettingsPage/          # 设置页
    StatsPage/             # 统计页
    CallbackPage.tsx       # OAuth callback
  stores/                  # Zustand stores
  tests/                   # Vitest + Testing Library 测试
  types/                   # API / Speech 类型
  utils/                   # 格式化与校验工具
tests/
  unit/                    # 单元测试占位/补充
  component/               # 组件测试占位/补充
  e2e/                     # Playwright e2e
```

## 技术约束

- 技术栈：TypeScript 5.x、React 19、Vite 8、Tailwind CSS v4、React Router v7。
- 状态管理：Zustand；表单：React Hook Form + Zod；图表：Recharts；日期：Day.js。
- API 层使用 Axios，baseURL 配置在 `src/api/client.ts`。
- 所有 API 响应必须经过 Zod 运行时校验，再进入 store 或 UI。
- TypeScript 保持严格类型，避免 `any`、宽泛断言和未校验的后端响应。
- UI 改动沿用现有组件风格，不引入新的设计系统，除非任务明确要求。

## 常用命令

```bash
npm run dev              # Vite dev server
npm run build            # tsc -b && vite build
npm run lint             # typecheck app/test + eslint
npm test                 # vitest
npm run test:ui          # Vitest UI
npm run test:coverage    # coverage
npm run preview          # vite preview
npm run deploy           # build + wrangler pages deploy
```

## API 与数据流

- `src/api/client.ts` 统一处理 baseURL、错误和拦截器。
- API 模块只负责请求、响应校验和轻量转换；复杂业务状态放在 stores。
- stores 负责异步 action、加载状态、错误状态和页面共享状态。
- 页面组件负责组合布局和调用 store；通用组件保持可复用和低业务耦合。
- 修改服务端 JSON 结构时，同步更新 `src/types/`、Zod schema、API 测试和相关 store 测试。

## OAuth 登录

- 登录入口：`src/components/common/LoginButton.tsx`。
- 开始登录：跳转 `/api/auth/google/start?return_to=当前路径`。
- 回调页面：`src/pages/CallbackPage.tsx` 读取 `exchange_code`。
- 兑换 token：`src/api/auth.ts` 的 `exchangeOAuthCode()`。
- 状态落点：`src/stores/authStore.ts` 的 `completeOAuthLogin()`。
- `return_to` 应保持相对路径语义，前端不要扩大服务端 Open Redirect 面。

## Voice 输入

- Web Speech API 只是文本输入增强层；手动输入必须始终可用。
- 识别结果必须允许用户编辑后再提交。
- 语音输入失败、浏览器不支持或权限拒绝时，UI 应退回可输入状态。
- `submit` 不等于直接入库；如果后端返回 `needs_confirmation`，展示确认流程是预期行为。
- 相关文件：`src/components/voice/VoiceInput.tsx`、`src/hooks/useVoiceInput.ts`、`src/stores/voiceInputStore.ts`。

## 测试门禁

- 完成前至少运行 `npm run lint && npm test`。
- 修改路由、构建配置或跨模块类型时运行 `npm run build`。
- API 改动补 `src/tests/api/`；store 改动补 `src/tests/stores/`；hook 改动补 `src/tests/hooks/`。
- UI 组件改动优先使用 Testing Library 覆盖状态、交互和错误展示。
- OAuth、页面导航、语音输入等浏览器流程改动，应补 Playwright e2e 或说明手动验证步骤。
- 如果测试因环境限制无法运行，交付时说明原因、替代验证和剩余风险。

## UI 规则

- 保持移动优先，底部导航与现有页面信息架构一致。
- 表单需要清晰的 loading、disabled、error 和 empty 状态。
- 图表必须处理空数据、加载中和异常状态。
- 不用页面内大段说明文字解释功能；让控件、状态和文案自然表达用途。
- 不新增纯装饰性复杂视觉，优先保证记账流程清晰、可编辑、可恢复。

## 当前重点

- Google OAuth 已接入，前端 callback 流程必须和服务端 exchange code 一次性语义一致。
- Voice text-first entry 是近期重点，改动前先看根目录 `docs/dev-tips.md` 和 archived retrospective。
- 前端是文本输入增强层，不应把 Web Speech API 当成唯一入口。
