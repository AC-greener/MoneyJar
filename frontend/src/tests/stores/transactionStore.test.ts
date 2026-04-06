import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act } from 'react'
import { renderHook } from '@testing-library/react'
import { useTransactionStore } from '@/stores/transactionStore'
import type { Transaction, CreateTransactionInput } from '@/types/api'

// Mock transactionApi
vi.mock('@/api/transaction', () => ({
  transactionApi: {
    createTransaction: vi.fn(),
    getTransactions: vi.fn(),
    deleteTransaction: vi.fn(),
  },
}))

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock })

describe('transactionStore', () => {
  const mockTransaction: Transaction = {
    id: 1,
    type: 'expense',
    amount: 100,
    category: '餐饮',
    note: '午餐',
    createdAt: '2024-01-01T00:00:00Z',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.getItem.mockReturnValue(null)
    localStorageMock.setItem.mockClear()

    // Reset store state
    useTransactionStore.setState({
      transactions: [],
      summary: null,
      isLoading: false,
      error: null,
      offlineQueue: [],
    })
  })

  describe('初始状态', () => {
    it('有正确的初始状态', () => {
      const { result } = renderHook(() => useTransactionStore())
      expect(result.current.transactions).toEqual([])
      expect(result.current.summary).toBeNull()
      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBeNull()
      expect(result.current.offlineQueue).toEqual([])
    })
  })

  describe('createTransaction', () => {
    it('创建交易成功时添加到列表', async () => {
      const { transactionApi } = await import('@/api/transaction')
      ;(transactionApi.createTransaction as ReturnType<typeof vi.fn>).mockResolvedValue(mockTransaction)

      const input: CreateTransactionInput = {
        type: 'expense',
        amount: 100,
        category: '餐饮',
      }

      const { result } = renderHook(() => useTransactionStore())
      await act(async () => {
        await result.current.createTransaction(input)
      })

      expect(result.current.transactions).toContainEqual(mockTransaction)
      expect(result.current.isLoading).toBe(false)
    })

    it('网络错误时添加到离线队列', async () => {
      const { transactionApi } = await import('@/api/transaction')
      ;(transactionApi.createTransaction as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network Error'))

      const input: CreateTransactionInput = {
        type: 'expense',
        amount: 100,
        category: '餐饮',
      }

      const { result } = renderHook(() => useTransactionStore())
      await act(async () => {
        await result.current.createTransaction(input)
      })

      expect(result.current.offlineQueue).toContainEqual(input)
      expect(localStorageMock.setItem).toHaveBeenCalled()
    })

    it('API 错误时设置错误信息', async () => {
      const { transactionApi } = await import('@/api/transaction')
      const apiError = { response: { status: 400 }, message: 'Bad Request' }
      ;(transactionApi.createTransaction as ReturnType<typeof vi.fn>).mockRejectedValue(apiError)

      const input: CreateTransactionInput = {
        type: 'expense',
        amount: 100,
        category: '餐饮',
      }

      const { result } = renderHook(() => useTransactionStore())
      await act(async () => {
        try {
          await result.current.createTransaction(input)
        } catch {
          // Expected error
        }
      })

      expect(result.current.error).toBeTruthy()
    })
  })

  describe('fetchTransactions', () => {
    it('获取交易列表', async () => {
      const { transactionApi } = await import('@/api/transaction')
      const transactions = [mockTransaction]
      ;(transactionApi.getTransactions as ReturnType<typeof vi.fn>).mockResolvedValue(transactions)

      const { result } = renderHook(() => useTransactionStore())
      await act(async () => {
        await result.current.fetchTransactions()
      })

      expect(result.current.transactions).toEqual(transactions)
      expect(result.current.isLoading).toBe(false)
    })

    it('处理错误', async () => {
      const { transactionApi } = await import('@/api/transaction')
      ;(transactionApi.getTransactions as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('API Error'))

      const { result } = renderHook(() => useTransactionStore())
      await act(async () => {
        await result.current.fetchTransactions()
      })

      expect(result.current.error).toBeTruthy()
      expect(result.current.isLoading).toBe(false)
    })
  })

  describe('deleteTransaction', () => {
    it('删除交易', async () => {
      const { transactionApi } = await import('@/api/transaction')
      ;(transactionApi.deleteTransaction as ReturnType<typeof vi.fn>).mockResolvedValue(undefined)

      useTransactionStore.setState({ transactions: [mockTransaction] })

      const { result } = renderHook(() => useTransactionStore())
      await act(async () => {
        await result.current.deleteTransaction(1)
      })

      expect(result.current.transactions).not.toContainEqual(expect.objectContaining({ id: 1 }))
    })

    it('删除失败时抛出错误', async () => {
      const { transactionApi } = await import('@/api/transaction')
      ;(transactionApi.deleteTransaction as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Delete failed'))

      useTransactionStore.setState({ transactions: [mockTransaction] })

      const { result } = renderHook(() => useTransactionStore())
      await act(async () => {
        try {
          await result.current.deleteTransaction(1)
        } catch {
          // Expected error
        }
      })

      expect(result.current.error).toBeTruthy()
    })
  })

  describe('syncOfflineQueue', () => {
    it('同步离线队列', async () => {
      const { transactionApi } = await import('@/api/transaction')
      ;(transactionApi.createTransaction as ReturnType<typeof vi.fn>).mockResolvedValue(mockTransaction)

      const offlineInput: CreateTransactionInput = {
        type: 'expense',
        amount: 100,
        category: '餐饮',
      }
      useTransactionStore.setState({ offlineQueue: [offlineInput] })

      const { result } = renderHook(() => useTransactionStore())
      await act(async () => {
        await result.current.syncOfflineQueue()
      })

      expect(result.current.offlineQueue).toEqual([])
      expect(result.current.transactions).toContainEqual(mockTransaction)
    })

    it('队列为空时不执行', async () => {
      const { transactionApi } = await import('@/api/transaction')

      const { result } = renderHook(() => useTransactionStore())
      await act(async () => {
        await result.current.syncOfflineQueue()
      })

      expect(transactionApi.createTransaction).not.toHaveBeenCalled()
    })
  })

  describe('clearError', () => {
    it('清除错误', () => {
      useTransactionStore.setState({ error: 'Some error' })

      const { result } = renderHook(() => useTransactionStore())
      act(() => {
        result.current.clearError()
      })

      expect(result.current.error).toBeNull()
    })
  })
})
