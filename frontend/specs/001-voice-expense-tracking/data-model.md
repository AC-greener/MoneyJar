# Data Model: MoneyJar H5 前端

**Date**: 2026-04-05
**Feature**: 001-voice-expense-tracking

## 核心类型定义

### User (用户)

```typescript
interface User {
  id: string;           // UUID
  email: string;        // 邮箱
  name: string | null;  // 昵称
  avatarUrl: string | null; // 头像URL
  plan: 'free' | 'pro';  // 会员计划
}
```

### Transaction (交易记录)

```typescript
interface Transaction {
  id?: number;          // 交易ID（创建后返回）
  type: 'income' | 'expense';  // 收入/支出
  amount: number;        // 金额（正数）
  category: string;       // 分类名称
  note?: string;         // 备注
  createdAt?: string;     // 创建时间（ISO字符串）
}

interface CreateTransactionInput {
  type: 'income' | 'expense';
  amount: number;
  category: string;
  note?: string;
  created_at?: string;
}
```

### Category (分类)

```typescript
interface Category {
  id: string;
  name: string;
  icon?: string;
  isCustom: boolean;
}

// 预设分类
const DEFAULT_CATEGORIES: Category[] = [
  { id: 'food', name: '餐饮', icon: '🍜', isCustom: false },
  { id: 'transport', name: '交通', icon: '🚇', isCustom: false },
  { id: 'shopping', name: '购物', icon: '🛒', isCustom: false },
  { id: 'entertainment', name: '娱乐', icon: '🎮', isCustom: false },
  { id: 'medical', name: '医疗', icon: '🏥', isCustom: false },
  { id: 'salary', name: '工资', icon: '💰', isCustom: false },
  { id: 'investment', name: '投资', icon: '📈', isCustom: false },
  { id: 'other', name: '其他', icon: '📦', isCustom: false },
];
```

### VoiceParseResult (语音解析结果)

```typescript
interface VoiceParseResult {
  transactions: Array<{
    type: 'income' | 'expense';
    amount: number;
    category: string;
    note?: string;
  }>;
  rawText: string;       // 原始语音文本
  error?: string;        // 解析错误信息
}
```

### PeriodQuery (时间范围查询)

```typescript
type Period = 'week' | 'month';

interface PeriodQuery {
  period?: Period;
}

interface TransactionSummary {
  total: number;                          // 当期总金额
  income: number;                        // 收入总计
  expense: number;                       // 支出总计
  transactions: Transaction[];            // 交易列表
  byCategory: Record<string, number>;     // 按分类汇总 { categoryName: amount }
}
```

## 表单验证 Schema (Zod)

```typescript
import { z } from 'zod';

export const CreateTransactionSchema = z.object({
  type: z.enum(['income', 'expense']),
  amount: z.number().positive('金额必须为正数'), // 支持小数（如 50.5）
  category: z.string().min(1, '请选择分类').max(50),
  note: z.string().max(256).optional(),
  created_at: z.string().optional(),
});

export const LoginSchema = z.object({
  id_token: z.string().min(1),
});

export const RefreshTokenSchema = z.object({
  refresh_token: z.string().min(1),
});
```

## 状态管理 (Zustand Stores)

### authStore

```typescript
interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Actions
  login: (idToken: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  fetchCurrentUser: () => Promise<void>;
}
```

### transactionStore

```typescript
interface TransactionState {
  transactions: Transaction[];
  summary: TransactionSummary | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  createTransaction: (input: CreateTransactionInput) => Promise<Transaction>;
  fetchTransactions: (period?: Period) => Promise<void>;
  deleteTransaction: (id: number) => Promise<void>;
  clearError: () => void;
}
```

### voiceInputStore

```typescript
interface VoiceInputState {
  isListening: boolean;
  interimText: string;
  finalText: string;
  parseResult: VoiceParseResult | null;
  error: string | null;

  // Actions
  startListening: () => void;
  stopListening: () => void;
  parseVoiceText: (text: string) => Promise<VoiceParseResult>;
  reset: () => void;
}
```

## 组件 Props 类型

### VoiceInputProps

```typescript
interface VoiceInputProps {
  onTranscript: (text: string) => void;
  onParseResult: (result: VoiceParseResult) => void;
  onError?: (error: string) => void;
  disabled?: boolean;
}
```

### TransactionCardProps

```typescript
interface TransactionCardProps {
  transaction: Transaction;
  onEdit?: (transaction: Transaction) => void;
  onDelete?: (id: number) => void;
}
```

### CategoryPieChartProps

```typescript
interface CategoryPieChartProps {
  data: Record<string, number>;
  title?: string;
}
```
