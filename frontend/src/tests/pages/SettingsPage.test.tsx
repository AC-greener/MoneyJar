import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { mockUser } from '../setup/authStore'
import { getMockTransactionStore } from '../setup/transactionStore'

// Mock the stores
vi.mock('@/stores/authStore', () => ({
  useAuthStore: vi.fn(),
}))

vi.mock('@/stores/transactionStore', () => ({
  useTransactionStore: vi.fn(),
}))

import SettingsPage from '@/pages/SettingsPage'
import { useAuthStore } from '@/stores/authStore'
import { useTransactionStore } from '@/stores/transactionStore'

describe('SettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('加载状态 (user 为 null)', () => {
    it('显示未登录提示', () => {
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
          <SettingsPage />
        </MemoryRouter>
      )

      expect(screen.getByText('登录后可管理账户设置')).toBeInTheDocument()
    })

    it('显示设置标题', () => {
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
          <SettingsPage />
        </MemoryRouter>
      )

      expect(screen.getByText('设置')).toBeInTheDocument()
    })
  })

  describe('已登录状态 (user 存在)', () => {
    it('显示设置页面标题', () => {
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
      ;(useTransactionStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(getMockTransactionStore())

      render(
        <MemoryRouter>
          <SettingsPage />
        </MemoryRouter>
      )

      expect(screen.getByText('设置')).toBeInTheDocument()
    })

    it('显示退出登录选项', () => {
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
      ;(useTransactionStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(getMockTransactionStore())

      render(
        <MemoryRouter>
          <SettingsPage />
        </MemoryRouter>
      )

      expect(screen.getByText('退出登录')).toBeInTheDocument()
    })

    it('显示编辑资料选项', () => {
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
      ;(useTransactionStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(getMockTransactionStore())

      render(
        <MemoryRouter>
          <SettingsPage />
        </MemoryRouter>
      )

      expect(screen.getByText('编辑资料')).toBeInTheDocument()
    })

    it('不显示加载中', () => {
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
      ;(useTransactionStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(getMockTransactionStore())

      render(
        <MemoryRouter>
          <SettingsPage />
        </MemoryRouter>
      )

      expect(screen.queryByText('加载中...')).not.toBeInTheDocument()
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
      ;(useTransactionStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(getMockTransactionStore({ offlineQueue: 2 }))

      render(
        <MemoryRouter>
          <SettingsPage />
        </MemoryRouter>
      )

      expect(screen.getByText('有待同步的交易')).toBeInTheDocument()
      expect(screen.getByText('2 笔交易正在等待网络连接')).toBeInTheDocument()
    })

    it('点击编辑资料会打开弹窗', () => {
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
      ;(useTransactionStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(getMockTransactionStore())

      render(
        <MemoryRouter>
          <SettingsPage />
        </MemoryRouter>
      )

      fireEvent.click(screen.getAllByLabelText('编辑资料')[0])
      expect(screen.getAllByText('编辑资料').length).toBeGreaterThan(1)
    })

    it('点击退出登录会调用 logout 并跳回首页', async () => {
      const originalLocation = window.location
      Object.defineProperty(window, 'location', {
        configurable: true,
        value: { href: '/settings' },
      })
      const logout = vi.fn().mockResolvedValue(undefined)
      const mockAuthStore = {
        user: mockUser,
        isAuthenticated: true,
        isLoading: false,
        isInitialized: true,
        error: null,
        initialize: vi.fn(),
        loginWithTestToken: vi.fn(),
        loginWithGoogle: vi.fn(),
        logout,
        fetchCurrentUser: vi.fn(),
        clearError: vi.fn(),
      }
      ;(useAuthStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockAuthStore)
      ;(useTransactionStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(getMockTransactionStore())

      render(
        <MemoryRouter>
          <SettingsPage />
        </MemoryRouter>
      )

      fireEvent.click(screen.getByText('退出登录'))
      await waitFor(() => {
        expect(logout).toHaveBeenCalled()
      })
      expect(window.location.href).toBe('/')
      Object.defineProperty(window, 'location', { configurable: true, value: originalLocation })
    })
  })
})
