# Research: MoneyJar 语音记账 H5 前端

**Date**: 2026-04-05
**Feature**: 001-voice-expense-tracking

## 技术选型研究

### React 19 + TypeScript

**Decision**: 采用 React 19 + TypeScript

**Rationale**:
- 用户明确指定的技术栈
- TypeScript 提供完整类型检查，减少运行时错误
- React 19 支持新特性（Server Components, Actions API）

**Alternatives Considered**:
- Vue 3: 社区稍小，但学习曲线平缓
- Svelte: 编译时优化，但生态较新

### Vite 6

**Decision**: 采用 Vite 6

**Rationale**:
- 用户指定
- 极快的开发服务器启动和 HMR
- 内置 TypeScript 和 CSS 支持
- 生产环境 Rollup 打包优化

**Alternatives Considered**:
- webpack: 配置复杂，构建速度慢
- CRA: 已停止维护

### Tailwind CSS v4

**Decision**: 采用 Tailwind CSS v4

**Rationale**:
- 用户指定
- 原子化 CSS，零样式冲突
- JIT 模式，按需生成 CSS
- 移动端优先的响应式设计

**Alternatives Considered**:
- CSS Modules: 需要手动处理类名
- Styled Components: 运行时样式，有性能开销

### 状态管理 - Zustand

**Decision**: 采用 Zustand

**Rationale**:
- 轻量级（~1KB）
- 简单直观的 API
- 支持 React DevTools
- 足够应付本项目复杂度

**Alternatives Considered**:
- Redux Toolkit: 过于复杂，适合大型应用
- Jotai: 原子化状态，API 类似但较新

### 表单处理 - React Hook Form + Zod

**Decision**: 采用 React Hook Form + Zod

**Rationale**:
- 用户指定
- 非受控组件性能优
- Zod 运行时校验与 TypeScript 静态类型结合
- 错误处理统一

**Alternatives Considered**:
- Formik: 较老，性能较差
- React Hook Form 单独: 缺少类型安全的校验

### 图表可视化 - Recharts

**Decision**: 采用 Recharts

**Rationale**:
- 用户指定
- React 原生，基于 D3
- 组件化，易于定制
- 活跃维护

**Alternatives Considered**:
- Chart.js: 更通用但 React 封装不完美
- Apache ECharts: 功能强大但包体积大

## 后端 API 集成研究

### API Base URL

**Decision**: 通过环境变量配置

**配置方式**:
```env
VITE_API_BASE_URL=http://localhost:8787
VITE_API_PREFIX=/api
```

**Rationale**:
- 开发/生产环境区分
- 便于对接不同后端实例

### 认证流程

**Decision**: Bearer Token (JWT)

**流程**:
1. 登录获取 `access_token` + `refresh_token`
2. 请求时 Header 携带 `Authorization: Bearer <access_token>`
3. `access_token` 过期时用 `refresh_token` 换取新 Token

**Token 存储**:
- `access_token`: memory (不持久化)
- `refresh_token`: localStorage (需加密或使用 httpOnly cookie)

### 错误处理

**Decision**: 统一错误处理拦截器

**实现**:
- Axios 响应拦截器统一处理 401/403/500
- 401 时自动触发 refresh token 流程
- 用户友好错误提示

### CORS 配置

**Decision**: 由于前后端均部署于 Cloudflare（Pages + Workers），可共享 `.cloudflare.com` 域名

**配置方式**:
- 后端 Workers 配置 CORS 允许 Cloudflare Pages 域名
- 开发环境: `localhost:5173`
- 生产环境: `https://<project>.pages.dev`

## 语音输入技术研究

### Web Speech API

**Decision**: 使用浏览器原生 Web Speech API

**支持性**:
- Chrome/Edge: 完全支持
- Safari: 部分支持
- Firefox: 不支持

**备选方案**: 第三方语音识别服务（如 Vosk.js, Whisper Web）

### 多语言支持

**Decision**: 以中文为主，支持多语言扩展

**实现方式**:
- Web Speech API 的 `lang` 参数
- LLM 服务端处理多语言理解

## 离线支持研究

### 方案选择

**Decision**: localStorage + Service Worker

**Rationale**:
- 简单够用，无需额外基础设施
- Service Worker 缓存静态资源
- localStorage 暂存未同步交易

**同步策略**:
- 网络恢复后自动同步
- 冲突处理：以后端时间戳为准

## 项目规范研究

### ESLint + Prettier

**Decision**: 采用 ESLint 9 + Prettier

**配置**:
```js
// eslint.config.js
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default [
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
];
```

### 路径别名

**Decision**: `@/` 映射 `src/`

**配置**:
```json
// tsconfig.json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  }
}
```

### 环境变量

**Decision**: Vite 方式 `.env` 文件

**命名规范**:
```env
VITE_API_BASE_URL=http://localhost:8787
VITE_ENABLE_MOCK_API=false
```

**Cloudflare Pages 部署**:
- 部署平台: Cloudflare Pages
- 构建命令: `pnpm build`
- 输出目录: `dist`
- 环境变量通过 Cloudflare Pages 控制台配置
- 预览部署: `https://<project>.pages.dev`
