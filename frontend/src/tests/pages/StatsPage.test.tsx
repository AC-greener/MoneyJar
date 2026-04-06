import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { mockUser } from '../setup/authStore'
import { getMockTransactionStore, mockSummary } from '../setup/transactionStore'

// Mock the stores
vi.mock('@/stores/authStore', () => ({
  useAuthStore: vi.fn(),
}))

vi.mock('@/stores/transactionStore', () => ({
  useTransactionStore: vi.fn(),
}))

import StatsPage from '@/pages/StatsPage'
import { useAuthStore } from '@/stores/authStore'
import { useTransactionStore } from '@/stores/transactionStore'

describe('StatsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('未登录状态', () => {
    it('显示查看消费分析标题', () => {
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

      render(
        <MemoryRouter>
          <StatsPage />
        </MemoryRouter>
      )

      expect(screen.getByText('查看您的消费分析')).toBeInTheDocument()
    })

    it('显示功能介绍：周/月查看、饼图分析、财务建议', () => {
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

      render(
        <MemoryRouter>
          <StatsPage />
        </MemoryRouter>
      )

      expect(screen.getByText('按周/月查看收支趋势')).toBeInTheDocument()
      expect(screen.getByText('支出分类饼图分析')).toBeInTheDocument()
      expect(screen.getByText('智能财务建议')).toBeInTheDocument()
    })

    it('不显示周期选择器', () => {
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

      render(
        <MemoryRouter>
          <StatsPage />
        </MemoryRouter>
      )

      expect(screen.queryByText('本周')).not.toBeInTheDocument()
      expect(screen.queryByText('本月')).not.toBeInTheDocument()
    })
  })

  describe('已登录状态', () => {
    it('显示本周/本月周期选择器', () => {
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
        getMockTransactionStore({ summary: mockSummary })
      )

      render(
        <MemoryRouter>
          <StatsPage />
        </MemoryRouter>
      )

      expect(screen.getByText('本周')).toBeInTheDocument()
      expect(screen.getByText('本月')).toBeInTheDocument()
    })

    it('显示页面标题', () => {
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
        getMockTransactionStore({ summary: mockSummary })
      )

      render(
        <MemoryRouter>
          <StatsPage />
        </MemoryRouter>
      )

      expect(screen.getByText('统计')).toBeInTheDocument()
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
        getMockTransactionStore({ summary: mockSummary })
      )

      render(
        <MemoryRouter>
          <StatsPage />
        </MemoryRouter>
      )

      expect(screen.queryByText('查看您的消费分析')).not.toBeInTheDocument()
    })

    it('加载中时显示 loading spinner', () => {
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
        getMockTransactionStore({ summary: null, isLoading: true })
      )

      const { container } = render(
        <MemoryRouter>
          <StatsPage />
        </MemoryRouter>
      )

      expect(container.querySelector('.animate-spin')).toBeInTheDocument()
    })

    it('无统计数据时显示空状态', () => {
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
        getMockTransactionStore({ summary: null })
      )

      render(
        <MemoryRouter>
          <StatsPage />
        </MemoryRouter>
      )

      expect(screen.getByText('暂无统计数据')).toBeInTheDocument()
    })

    it('切换周期时调用 fetchSummary', () => {
      const fetchSummary = vi.fn()
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
        ...getMockTransactionStore({ summary: mockSummary }),
        fetchSummary,
      })

      render(
        <MemoryRouter>
          <StatsPage />
        </MemoryRouter>
      )

      fireEvent.click(screen.getByText('本周'))
      expect(fetchSummary).toHaveBeenCalledWith('month')
      expect(fetchSummary).toHaveBeenCalledWith('week')
    })

    it('有 summary 数据时渲染 CategoryPieChart（支出分类饼图）', () => {
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
        getMockTransactionStore({ summary: mockSummary })
      )

      render(
        <MemoryRouter>
          <StatsPage />
        </MemoryRouter>
      )

      // 验证饼图标题存在
      expect(screen.getByText('支出分类')).toBeInTheDocument()
      // 验证总支出金额显示
      expect(screen.getByText(/总支出:/)).toBeInTheDocument()
    })

    it('有 summary 数据时渲染 TrendLineChart（收支趋势折线图）', () => {
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
        getMockTransactionStore({ summary: mockSummary })
      )

      render(
        <MemoryRouter>
          <StatsPage />
        </MemoryRouter>
      )

      // 验证折线图标题存在
      expect(screen.getByText('收支趋势')).toBeInTheDocument()
    })

    it('显示收入和支出的汇总卡片', () => {
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
        getMockTransactionStore({ summary: mockSummary })
      )

      render(
        <MemoryRouter>
          <StatsPage />
        </MemoryRouter>
      )

      // 验证收入和支出卡片存在
      expect(screen.getByText('总收入')).toBeInTheDocument()
      expect(screen.getByText('总支出')).toBeInTheDocument()
      expect(screen.getByText('结余')).toBeInTheDocument()
    })
  })
})
