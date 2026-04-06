import type { Transaction, TransactionSummary } from '@/types/api'

// Mock transactions
export const mockTransactions: Transaction[] = [
  { id: 1, type: 'expense', amount: 100, category: '餐饮', note: '午餐' },
  { id: 2, type: 'expense', amount: 50, category: '交通', note: '地铁' },
]

// Mock summary
export const mockSummary: TransactionSummary = {
  total: 500,
  income: 1000,
  expense: 500,
  transactions: mockTransactions,
  byCategory: { 餐饮: 300, 交通: 200 },
}

// Create mock transaction store
export function getMockTransactionStore(config: {
  transactions?: Transaction[]
  summary?: TransactionSummary | null
  isLoading?: boolean
  offlineQueue?: number
} = {}) {
  const {
    transactions = [],
    summary = null,
    isLoading = false,
    offlineQueue = 0,
  } = config

  return {
    transactions,
    summary,
    isLoading,
    error: null,
    offlineQueue: Array(offlineQueue).fill(null),
    createTransaction: vi.fn().mockResolvedValue(null),
    fetchTransactions: vi.fn().mockResolvedValue(undefined),
    fetchSummary: vi.fn().mockResolvedValue(undefined),
    deleteTransaction: vi.fn().mockResolvedValue(undefined),
    clearError: vi.fn(),
    syncOfflineQueue: vi.fn().mockResolvedValue(undefined),
  }
}
