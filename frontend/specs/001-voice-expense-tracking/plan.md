# Implementation Plan: Bottom Navigation Footer

**Branch**: `001-voice-expense-tracking` | **Date**: 2026-04-05 | **Spec**: [spec.md](./spec.md)
**Input**: 需要新增一个底部footer用来导航

## Summary

为 MoneyJar H5 应用添加底部 Tab 导航栏，实现记账、统计、设置三个页面之间的切换。采用移动端标准的底部导航设计，使用 React Router v7 的 `useLocation` 实现当前页面高亮。

## Technical Context

**Language/Version**: TypeScript 5.x
**Primary Dependencies**: React 19, Tailwind CSS v4, React Router v7
**Storage**: N/A (UI组件)
**Testing**: Vitest + React Testing Library
**Target Platform**: H5 移动端浏览器
**Project Type**: SPA (移动端优先)
**Performance Goals**: 首屏加载<3s, 页面切换<500ms
**Constraints**: 需要适配 iOS Safari 和 Android Chrome
**Scale/Scope**: 3个Tab页面

## Constitution Check

> 宪法评估：添加底部导航是已有规划的 UI 增强，不涉及架构变更。

| 宪法原则 | 状态 | 说明 |
|---------|------|------|
| I. Code Quality | ✅ PASS | 使用 TypeScript + Tailwind |
| I. Clean Architecture | ✅ PASS | 单一组件，无架构影响 |
| II. Testing Standards | ✅ PASS | 需添加组件测试 |
| III. User Experience | ✅ PASS | 改善移动端导航体验 |
| IV. Performance | ✅ PASS | 轻量组件，无性能影响 |

## Project Structure

### Source Code

```text
frontend/
└── src/
    ├── components/
    │   └── common/
    │       └── BottomNav.tsx    # 新增
    └── App.tsx                 # 修改 - 添加 BottomNav
```

## Functionality Specification

### Core Features

- **BottomNav 组件**: 固定底部的 Tab 导航栏
  - 3个 Tab：记账（麦克风图标）、统计（图表图标）、设置（设置图标）
  - 当前页面 Tab 高亮显示
  - 点击切换页面

### User Interactions

- 点击底部 Tab 切换对应页面
- 当前页面 Tab 显示激活状态（蓝色/高亮）
- 支持手势滑动切换（可选，后续扩展）

### UI Design

- 固定在底部，高度 60px + safe-area-inset-bottom
- 3个均分布局，每个 Tab 宽度 33.33%
- Tab 图标 + 文字标签
- 激活状态：蓝色图标 + 文字
- 默认状态：灰色图标 + 文字
- 触控目标最小 44x44px

### States

| 状态 | 样式 |
|------|------|
| Default | 灰色图标 + 文字 |
| Active | 蓝色图标 + 文字 + 选中指示条 |
| Pressed | 轻微缩放反馈 |

### Edge Cases

- 横屏模式：底部导航保持固定
- 小屏幕设备：图标和文字适当缩小
- 键盘弹出时：底部导航不被遮挡

## Implementation Tasks

### Phase 1: Component Development

1. 创建 `BottomNav.tsx` 组件
2. 使用 `react-router-dom` 的 `useLocation` 和 `useNavigate` 获取当前路由
3. 配置 Tailwind CSS 样式

### Phase 2: Integration

1. 在 `App.tsx` 中引入 BottomNav
2. 包裹所有页面路由

### Phase 3: Testing

1. 编写 BottomNav 组件测试

## Verification

- [ ] BottomNav 正确显示在页面底部
- [ ] 3个 Tab 图标正确显示
- [ ] 点击 Tab 切换到对应页面
- [ ] 当前页面 Tab 高亮
- [ ] 页面内容不被导航栏遮挡
