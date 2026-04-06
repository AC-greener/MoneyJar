import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { mockUser } from '../setup/authStore'
import { getMockTransactionStore, mockTransactions } from '../setup/transactionStore'
import { getMockVoiceInputStore } from '../setup/voiceInputStore'

// Mock the stores
vi.mock('@/stores/authStore', () => ({
  useAuthStore: vi.fn(),
}))

vi.mock('@/stores/transactionStore', () => ({
  useTransactionStore: vi.fn(),
}))

vi.mock('@/stores/voiceInputStore', () => ({
  useVoiceInputStore: vi.fn(),
}))

import RecordPage from '@/pages/RecordPage' 
import { useAuthStore } from '@/stores/authStore'
import { useTransactionStore } from '@/stores/transactionStore'
import { useVoiceInputStore } from '@/stores/voiceInputStore'

describe('RecordPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('未登录状态', () => {
    it('显示欢迎使用 MoneyJar 标题', () => {
      const mockAuthStore = {
        user: null,
        isAuthenticated: false,
        isLoading: false,
        isInitialized: true,
        error: null,
        initialize: vi.fn(),
        loginWithTestToken: vi.fn(),
        loginWithGoogle: vi.fn(),
        logout: vi.fn(),
        fetchCurrentUser: vi.fn(),
        clearError: vi.fn(),
      }
      ;(useAuthStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockAuthStore)
      ;(useTransactionStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(getMockTransactionStore())
      ;(useVoiceInputStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(getMockVoiceInputStore())

      render(
        <MemoryRouter>
          <RecordPage />
        </MemoryRouter>
      )

      expect(screen.getByText('欢迎使用 MoneyJar')).toBeInTheDocument()
    })

    it('显示功能介绍：语音输入、智能分类、离线记账', () => {
      const mockAuthStore = {
        user: null,
        isAuthenticated: false,
        isLoading: false,
        isInitialized: true,
        error: null,
        initialize: vi.fn(),
        loginWithTestToken: vi.fn(),
        loginWithGoogle: vi.fn(),
        logout: vi.fn(),
        fetchCurrentUser: vi.fn(),
        clearError: vi.fn(),
      }
      ;(useAuthStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockAuthStore)
      ;(useTransactionStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(getMockTransactionStore())
      ;(useVoiceInputStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(getMockVoiceInputStore())

      render(
        <MemoryRouter>
          <RecordPage />
        </MemoryRouter>
      )

      expect(screen.getByText('语音输入，开口即记')).toBeInTheDocument()
      expect(screen.getByText('智能分类，自动统计')).toBeInTheDocument()
      expect(screen.getByText('离线记账，自动同步')).toBeInTheDocument()
    })

    it('不显示语音输入组件', () => {
      const mockAuthStore = {
        user: null,
        isAuthenticated: false,
        isLoading: false,
        isInitialized: true,
        error: null,
        initialize: vi.fn(),
        loginWithTestToken: vi.fn(),
        loginWithGoogle: vi.fn(),
        logout: vi.fn(),
        fetchCurrentUser: vi.fn(),
        clearError: vi.fn(),
      }
      ;(useAuthStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockAuthStore)
      ;(useTransactionStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(getMockTransactionStore())
      ;(useVoiceInputStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(getMockVoiceInputStore())

      render(
        <MemoryRouter>
          <RecordPage />
        </MemoryRouter>
      )

      expect(screen.queryByText('最近交易')).not.toBeInTheDocument()
    })
  })

  describe('已登录状态', () => {
    it('显示语音输入组件区域', () => {
      const mockAuthStore = {
        user: mockUser,
        isAuthenticated: true,
        isLoading: false,
        isInitialized: true,
        error: null,
        initialize: vi.fn(),
        loginWithTestToken: vi.fn(),
        loginWithGoogle: vi.fn(),
        logout: vi.fn(),
        fetchCurrentUser: vi.fn(),
        clearError: vi.fn(),
      }
      ;(useAuthStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockAuthStore)
      ;(useTransactionStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
        getMockTransactionStore({ transactions: mockTransactions })
      )
      ;(useVoiceInputStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(getMockVoiceInputStore())

      render(
        <MemoryRouter>
          <RecordPage />
        </MemoryRouter>
      )

      expect(screen.getByText('记账')).toBeInTheDocument()
    })

    it('显示最近交易标题', () => {
      const mockAuthStore = {
        user: mockUser,
        isAuthenticated: true,
        isLoading: false,
        isInitialized: true,
        error: null,
        initialize: vi.fn(),
        loginWithTestToken: vi.fn(),
        loginWithGoogle: vi.fn(),
        logout: vi.fn(),
        fetchCurrentUser: vi.fn(),
        clearError: vi.fn(),
      }
      ;(useAuthStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockAuthStore)
      ;(useTransactionStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
        getMockTransactionStore({ transactions: mockTransactions })
      )
      ;(useVoiceInputStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(getMockVoiceInputStore())

      render(
        <MemoryRouter>
          <RecordPage />
        </MemoryRouter>
      )

      expect(screen.getByText('最近交易')).toBeInTheDocument()
    })

    it('不显示欢迎登录提示', () => {
      const mockAuthStore = {
        user: mockUser,
        isAuthenticated: true,
        isLoading: false,
        isInitialized: true,
        error: null,
        initialize: vi.fn(),
        loginWithTestToken: vi.fn(),
        loginWithGoogle: vi.fn(),
        logout: vi.fn(),
        fetchCurrentUser: vi.fn(),
        clearError: vi.fn(),
      }
      ;(useAuthStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockAuthStore)
      ;(useTransactionStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
        getMockTransactionStore({ transactions: mockTransactions })
      )
      ;(useVoiceInputStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(getMockVoiceInputStore())

      render(
        <MemoryRouter>
          <RecordPage />
        </MemoryRouter>
      )

      expect(screen.queryByText('欢迎使用 MoneyJar')).not.toBeInTheDocument()
    })

    it('挂载时获取交易列表', () => {
      const fetchTransactions = vi.fn()
      const mockAuthStore = {
        user: mockUser,
        isAuthenticated: true,
        isLoading: false,
        isInitialized: true,
        error: null,
        initialize: vi.fn(),
        loginWithTestToken: vi.fn(),
        loginWithGoogle: vi.fn(),
        logout: vi.fn(),
        fetchCurrentUser: vi.fn(),
        clearError: vi.fn(),
      }
      ;(useAuthStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockAuthStore)
      ;(useTransactionStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        ...getMockTransactionStore({ transactions: mockTransactions }),
        fetchTransactions,
      })
      ;(useVoiceInputStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(getMockVoiceInputStore())

      render(
        <MemoryRouter>
          <RecordPage />
        </MemoryRouter>
      )

      expect(fetchTransactions).toHaveBeenCalled()
    })

    it('有离线队列时显示待同步提示', () => {
      const mockAuthStore = {
        user: mockUser,
        isAuthenticated: true,
        isLoading: false,
        isInitialized: true,
        error: null,
        initialize: vi.fn(),
        loginWithTestToken: vi.fn(),
        loginWithGoogle: vi.fn(),
        logout: vi.fn(),
        fetchCurrentUser: vi.fn(),
        clearError: vi.fn(),
      }
      ;(useAuthStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockAuthStore)
      ;(useTransactionStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
        getMockTransactionStore({ transactions: mockTransactions, offlineQueue: 2 })
      )
      ;(useVoiceInputStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(getMockVoiceInputStore())

      render(
        <MemoryRouter>
          <RecordPage />
        </MemoryRouter>
      )

      expect(screen.getByText('有 2 笔交易待同步到服务器')).toBeInTheDocument()
    })

    it('已有解析结果时显示查看确认按钮', () => {
      const mockAuthStore = {
        user: mockUser,
        isAuthenticated: true,
        isLoading: false,
        isInitialized: true,
        error: null,
        initialize: vi.fn(),
        loginWithTestToken: vi.fn(),
        loginWithGoogle: vi.fn(),
        logout: vi.fn(),
        fetchCurrentUser: vi.fn(),
        clearError: vi.fn(),
      }
      ;(useAuthStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockAuthStore)
      ;(useTransactionStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
        getMockTransactionStore({ transactions: mockTransactions })
      )
      ;(useVoiceInputStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
        getMockVoiceInputStore({
          finalText: '午饭100',
          parseResult: {
            rawText: '午饭100',
            transactions: [{ type: 'expense', amount: 100, category: '餐饮', note: '午饭' }],
          },
        })
      )

      render(
        <MemoryRouter>
          <RecordPage />
        </MemoryRouter>
      )

      expect(screen.getByText('查看并确认交易')).toBeInTheDocument()
    })
  })
})
