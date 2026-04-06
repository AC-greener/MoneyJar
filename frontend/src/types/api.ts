// User
export interface User {
  id: string
  email: string
  name: string | null
  avatarUrl: string | null
  plan: 'free' | 'pro'
}

// Transaction
export interface Transaction {
  id?: number
  type: 'income' | 'expense'
  amount: number
  category: string
  note?: string
  createdAt?: string
}

export interface CreateTransactionInput {
  type: 'income' | 'expense'
  amount: number
  category: string
  note?: string
  created_at?: string
}

// Category
export interface Category {
  id: string
  name: string
  icon?: string
  isCustom: boolean
}

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'food', name: '餐饮', icon: '🍜', isCustom: false },
  { id: 'transport', name: '交通', icon: '🚇', isCustom: false },
  { id: 'shopping', name: '购物', icon: '🛒', isCustom: false },
  { id: 'entertainment', name: '娱乐', icon: '🎮', isCustom: false },
  { id: 'medical', name: '医疗', icon: '🏥', isCustom: false },
  { id: 'salary', name: '工资', icon: '💰', isCustom: false },
  { id: 'investment', name: '投资', icon: '📈', isCustom: false },
  { id: 'other', name: '其他', icon: '📦', isCustom: false },
]

// Voice Parse Result
export interface VoiceParseResult {
  transactions: Array<{
    type: 'income' | 'expense'
    amount: number
    category: string
    note?: string
  }>
  rawText: string
  error?: string
}

// Voice Input Props
export interface VoiceInputProps {
  onTranscript: (text: string) => void
  onParseResult?: (result: VoiceParseResult) => void
  onError?: (error: string) => void
  disabled?: boolean
}

// Period Query
export type Period = 'week' | 'month'

export interface TransactionSummary {
  total: number
  income: number
  expense: number
  transactions: Transaction[]
  byCategory: Record<string, number>
}

// Auth API Types
export interface AuthResponse {
  access_token: string
  refresh_token: string
  user: User
}

export interface RefreshTokenResponse {
  access_token: string
}

export interface ApiError {
  error: string
  requestId?: string
}
