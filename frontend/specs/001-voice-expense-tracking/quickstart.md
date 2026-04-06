# Quickstart: MoneyJar H5 前端开发

**Date**: 2026-04-05
**Feature**: 001-voice-expense-tracking

## 环境要求

- Node.js >= 18.0.0
- pnpm >= 8.0.0
- 后端服务运行于 `http://localhost:8787`（或配置自定义地址）

## 开发环境启动

### 1. 安装依赖

```bash
cd /Users/tongtong/AndroidStudioProjects/MoneyJar/frontend
pnpm install
```

### 2. 配置环境变量

```bash
cp .env.example .env.local
```

编辑 `.env.local`:

```env
# API 配置
VITE_API_BASE_URL=http://localhost:8787
VITE_API_PREFIX=/api

# 开发环境认证 Token（从后端 .dev.vars 获取）
VITE_TEST_TOKEN=your-test-token-from-backend

# 功能开关
VITE_ENABLE_MOCK_API=false
VITE_ENABLE_VOICE_DEBUG=false
```

### 开发环境登录

开发环境使用 `test-token` 端点获取 Token，无需 Google OAuth:

1. 从后端获取 `TEST_AUTH_TOKEN`（在 `/server/.dev.vars` 中）
2. 前端调用 `/api/auth/test-token` 即可获得 Token

### 3. 启动开发服务器

```bash
pnpm dev
```

访问 `http://localhost:5173`

### 4. 运行测试

```bash
# 运行所有测试
pnpm test

# 监听模式运行测试
pnpm test:watch

# 生成覆盖率报告
pnpm test:coverage
```

### 5. 代码检查

```bash
# ESLint 检查
pnpm lint

# 自动修复
pnpm lint:fix

# Prettier 检查
pnpm format

# 完整检查（lint + typecheck）
pnpm check
```

## 生产构建

```bash
# 构建生产版本
pnpm build

# 预览生产构建
pnpm preview

# 构建分析
pnpm build --mode production
```

## 项目结构

```
frontend/
├── src/
│   ├── api/           # API 请求封装
│   ├── components/   # React 组件
│   ├── pages/        # 页面组件
│   ├── stores/       # Zustand 状态
│   ├── hooks/        # 自定义 Hooks
│   ├── types/        # TypeScript 类型
│   ├── utils/        # 工具函数
│   └── App.tsx       # 根组件
├── tests/            # 测试文件
│   ├── unit/         # 单元测试（Vitest）
│   └── component/    # 组件测试（React Testing Library）
├── public/           # 静态资源
└── [配置文件]
```

## 常用命令

| 命令 | 说明 |
|------|------|
| `pnpm dev` | 启动开发服务器 |
| `pnpm build` | 构建生产版本 |
| `pnpm preview` | 预览构建结果 |
| `pnpm test` | 运行测试 |
| `pnpm lint` | 代码检查 |
| `pnpm format` | 代码格式化 |

## 开发注意事项

### 路径别名

使用 `@/` 代替相对路径:

```typescript
// Good
import { Button } from '@/components/common/Button';
import { useAuthStore } from '@/stores/authStore';

// Avoid
import { Button } from '../../components/common/Button';
```

### API 调用

所有 API 通过 Axios 客户端调用:

```typescript
import { transactionApi } from '@/api/transaction';

// 创建交易
const transaction = await transactionApi.create({
  type: 'expense',
  amount: 50,
  category: '餐饮',
});
```

### 状态管理

使用 Zustand store:

```typescript
import { useTransactionStore } from '@/stores/transactionStore';

const { transactions, fetchTransactions } = useTransactionStore();
```

### 表单处理

使用 React Hook Form + Zod:

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CreateTransactionSchema } from '@/utils/validation';

const { register, handleSubmit } = useForm({
  resolver: zodResolver(CreateTransactionSchema),
});
```

## 故障排除

### CORS 问题

确保后端配置了正确的 CORS 头:
```typescript
// 后端 Hono CORS 配置
app.use('/*', cors({
  origin: 'http://localhost:5173',
  credentials: true,
}));
```

### Token 过期

如果遇到 401 错误，检查:
1. `refresh_token` 是否正确存储
2. 后端 JWT 配置是否正确

### 语音功能不工作

1. 检查麦克风权限
2. 确认使用 HTTPS 或 localhost（浏览器安全限制）
3. 检查 `VITE_ENABLE_VOICE_DEBUG=true` 查看调试日志
