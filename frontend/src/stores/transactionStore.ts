import { create } from 'zustand'
import type { Transaction, CreateTransactionInput, TransactionSummary, Period } from '@/types/api'
import { transactionApi } from '@/api/transaction'

const OFFLINE_QUEUE_KEY = 'moneyjar_offline_transactions'

interface TransactionState {
  transactions: Transaction[]
  summary: TransactionSummary | null
  isLoading: boolean
  error: string | null
  offlineQueue: CreateTransactionInput[]

  // Actions
  createTransaction: (input: CreateTransactionInput) => Promise<Transaction | null>
  fetchTransactions: (period?: Period) => Promise<void>
  fetchSummary: (period: Period) => Promise<void>
  deleteTransaction: (id: number) => Promise<void>
  clearError: () => void
  syncOfflineQueue: () => Promise<void>
}

// Load offline queue from localStorage
const loadOfflineQueue = (): CreateTransactionInput[] => {
  try {
    const stored = localStorage.getItem(OFFLINE_QUEUE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

// Save offline queue to localStorage
const saveOfflineQueue = (queue: CreateTransactionInput[]): void => {
  localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue))
}

export const useTransactionStore = create<TransactionState>((set, get) => ({
  transactions: [],
  summary: null,
  isLoading: false,
  error: null,
  offlineQueue: loadOfflineQueue(),

  createTransaction: async (input: CreateTransactionInput) => {
    set({ isLoading: true, error: null })
    try {
      const transaction = await transactionApi.createTransaction(input)
      set((state) => ({
        transactions: [transaction, ...state.transactions],
        isLoading: false,
      }))
      return transaction
    } catch (err) {
      // Network error - add to offline queue
      const error = err as { response?: { status?: number } }
      if (!error.response) {
        const queue = [...get().offlineQueue, input]
        set({ offlineQueue: queue })
        saveOfflineQueue(queue)
        set({ isLoading: false })
        return null
      }
      const message = err instanceof Error ? err.message : '创建交易失败'
      set({ error: message, isLoading: false })
      throw err
    }
  },

  fetchTransactions: async (period?: Period) => {
    set({ isLoading: true, error: null })
    try {
      const data = await transactionApi.getTransactions(period)
      if (Array.isArray(data)) {
        set({ transactions: data, isLoading: false })
      } else {
        set({ transactions: data.transactions, isLoading: false })
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '获取交易列表失败'
      set({ error: message, isLoading: false })
    }
  },

  fetchSummary: async (period: Period) => {
    set({ isLoading: true, error: null })
    try {
      const summary = await transactionApi.getTransactions(period) as TransactionSummary
      set({ summary, transactions: summary.transactions, isLoading: false })
    } catch (err) {
      const message = err instanceof Error ? err.message : '获取统计失败'
      set({ error: message, isLoading: false })
    }
  },

  deleteTransaction: async (id: number) => {
    set({ isLoading: true, error: null })
    try {
      await transactionApi.deleteTransaction(id)
      set((state) => ({
        transactions: state.transactions.filter((t) => t.id !== id),
        isLoading: false,
      }))
    } catch (err) {
      const message = err instanceof Error ? err.message : '删除交易失败'
      set({ error: message, isLoading: false })
      throw err
    }
  },

  clearError: () => set({ error: null }),

  syncOfflineQueue: async () => {
    const { offlineQueue } = get()
    if (offlineQueue.length === 0) return

    const remaining: CreateTransactionInput[] = []
    for (const input of offlineQueue) {
      try {
        const transaction = await transactionApi.createTransaction(input)
        set((state) => ({
          transactions: [transaction, ...state.transactions],
        }))
      } catch {
        // Keep failed items in queue
        remaining.push(input)
      }
    }
    set({ offlineQueue: remaining })
    saveOfflineQueue(remaining)
  },
}))
