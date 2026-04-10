# frontend Development Guidelines

## 项目概述

MoneyJar Web 管理后台，用于数据管理和统计查看。

## 技术栈

TypeScript 5.x + React 19, Vite 6, Tailwind CSS v4, React Router v7, Axios, Zustand, React Hook Form + Zod, Recharts, Day.js

## 项目结构

```
src/
├── components/          # 通用 UI 组件
├── pages/               # 页面组件
├── hooks/               # 自定义 Hooks
├── api/                 # Axios API 调用
├── stores/              # Zustand 状态管理
├── types/               # TypeScript 类型定义
└── utils/               # 工具函数
tests/                   # 测试文件
```

## 常用命令

```bash
npm run dev              # 启动开发服务器
npm run build            # 生产构建
npm test                 # 运行测试
npm run lint             # 代码检查
npm run typecheck        # TypeScript 类型检查
```

## API 规范

- Axios baseURL 配置在 `src/api/client.ts`
- 所有 API 响应使用 Zod 进行运行时校验
- 请求错误统一在 `api/client.ts` 处理

## 代码风格

- TypeScript 严格模式
- 组件使用函数式组件 + Hooks
- 样式使用 Tailwind CSS
- 表单使用 React Hook Form + Zod

## 近期变更

- 001-voice-expense-tracking: 添加语音记账功能集成
