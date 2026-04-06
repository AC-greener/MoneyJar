import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act } from 'react'
import { renderHook } from '@testing-library/react'
import { useAuthStore } from '@/stores/authStore'
import type { User } from '@/types/api'

// Mock authApi
vi.mock('@/api/auth', () => ({
  authApi: {
    getTestToken: vi.fn(),
    googleLogin: vi.fn(),
    getCurrentUser: vi.fn(),
    logout: vi.fn(),
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

describe('authStore', () => {
  const mockUser: User = {
    id: '1',
    email: 'test@example.com',
    name: 'Test User',
    avatarUrl: null,
    plan: 'free',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    // Reset store state
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      isInitialized: false,
      error: null,
    })
  })

  afterEach(() => {
    localStorage.clear()
  })

  describe('初始状态', () => {
    it('有正确的初始状态', () => {
      const { result } = renderHook(() => useAuthStore())
      expect(result.current.user).toBeNull()
      expect(result.current.isAuthenticated).toBe(false)
      expect(result.current.isLoading).toBe(false)
      expect(result.current.isInitialized).toBe(false)
      expect(result.current.error).toBeNull()
    })
  })

  describe('initialize', () => {
    it('已完成初始化时不重复执行', async () => {
      useAuthStore.setState({ isInitialized: true })
      const { authApi } = await import('@/api/auth')

      const { result } = renderHook(() => useAuthStore())
      await act(async () => {
        await result.current.initialize()
      })

      expect(authApi.getTestToken).not.toHaveBeenCalled()
    })

    it('正在加载时不重复执行', async () => {
      useAuthStore.setState({ isLoading: true })
      const { authApi } = await import('@/api/auth')

      const { result } = renderHook(() => useAuthStore())
      await act(async () => {
        await result.current.initialize()
      })

      expect(authApi.getTestToken).not.toHaveBeenCalled()
    })

    it('test token 成功时设置用户', async () => {
      const { authApi } = await import('@/api/auth')
      ;(authApi.getTestToken as ReturnType<typeof vi.fn>).mockResolvedValue({
        user: mockUser,
        access_token: 'token',
        refresh_token: 'refresh',
      })

      const { result } = renderHook(() => useAuthStore())
      await act(async () => {
        await result.current.initialize()
      })

      expect(result.current.user).toEqual(mockUser)
      expect(result.current.isAuthenticated).toBe(true)
      expect(result.current.isInitialized).toBe(true)
    })

    it('无 token 且无 refresh token 时完成初始化', async () => {
      const { authApi } = await import('@/api/auth')
      ;(authApi.getTestToken as ReturnType<typeof vi.fn>).mockResolvedValue(null)
      localStorageMock.getItem.mockReturnValue(null)

      const { result } = renderHook(() => useAuthStore())
      await act(async () => {
        await result.current.initialize()
      })

      expect(result.current.isInitialized).toBe(true)
      expect(result.current.isAuthenticated).toBe(false)
    })

    it('test token 网络错误时仍完成初始化', async () => {
      const { authApi } = await import('@/api/auth')
      ;(authApi.getTestToken as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network Error'))
      localStorageMock.getItem.mockReturnValue(null)

      const { result } = renderHook(() => useAuthStore())
      await act(async () => {
        await result.current.initialize()
      })

      expect(result.current.user).toBeNull()
      expect(result.current.isInitialized).toBe(true)
      expect(result.current.isAuthenticated).toBe(false)
      expect(result.current.isLoading).toBe(false)
    })
  })

  describe('logout', () => {
    it('清除用户状态', async () => {
      useAuthStore.setState({ user: mockUser, isAuthenticated: true })
      const { authApi } = await import('@/api/auth')
      ;(authApi.logout as ReturnType<typeof vi.fn>).mockResolvedValue(undefined)

      const { result } = renderHook(() => useAuthStore())
      await act(async () => {
        await result.current.logout()
      })

      expect(result.current.user).toBeNull()
      expect(result.current.isAuthenticated).toBe(false)
    })

    it('即使 API 失败也清除本地状态', async () => {
      useAuthStore.setState({ user: mockUser, isAuthenticated: true })
      const { authApi } = await import('@/api/auth')
      ;(authApi.logout as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('API Error'))

      const { result } = renderHook(() => useAuthStore())
      await act(async () => {
        await result.current.logout()
      })

      expect(result.current.user).toBeNull()
      expect(result.current.isAuthenticated).toBe(false)
    })
  })

  describe('loginWithTestToken', () => {
    it('成功时设置用户为已登录', async () => {
      const { authApi } = await import('@/api/auth')
      ;(authApi.getTestToken as ReturnType<typeof vi.fn>).mockResolvedValue({
        user: mockUser,
        access_token: 'token',
        refresh_token: 'refresh',
      })

      const { result } = renderHook(() => useAuthStore())
      await act(async () => {
        await result.current.loginWithTestToken()
      })

      expect(result.current.user).toEqual(mockUser)
      expect(result.current.isAuthenticated).toBe(true)
      expect(result.current.isLoading).toBe(false)
    })

    it('返回 null 时设置错误并抛出异常', async () => {
      const { authApi } = await import('@/api/auth')
      ;(authApi.getTestToken as ReturnType<typeof vi.fn>).mockResolvedValue(null)

      const { result } = renderHook(() => useAuthStore())
      await expect(result.current.loginWithTestToken()).rejects.toThrow('Test token not available in production')
      expect(result.current.error).toBe('Test token not available in production')
      expect(result.current.isLoading).toBe(false)
    })
  })

  describe('loginWithGoogle', () => {
    it('成功时设置用户为已登录', async () => {
      const { authApi } = await import('@/api/auth')
      ;(authApi.googleLogin as ReturnType<typeof vi.fn>).mockResolvedValue({
        user: mockUser,
        access_token: 'token',
        refresh_token: 'refresh',
      })

      const { result } = renderHook(() => useAuthStore())
      await act(async () => {
        await result.current.loginWithGoogle('google-token')
      })

      expect(authApi.googleLogin).toHaveBeenCalledWith('google-token')
      expect(result.current.user).toEqual(mockUser)
      expect(result.current.isAuthenticated).toBe(true)
    })

    it('失败时写入错误信息', async () => {
      const { authApi } = await import('@/api/auth')
      ;(authApi.googleLogin as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Google login failed'))

      const { result } = renderHook(() => useAuthStore())
      await expect(result.current.loginWithGoogle('google-token')).rejects.toThrow('Google login failed')
      expect(result.current.error).toBe('Google login failed')
      expect(result.current.isLoading).toBe(false)
    })
  })

  describe('fetchCurrentUser', () => {
    it('成功时更新当前用户', async () => {
      const { authApi } = await import('@/api/auth')
      ;(authApi.getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser)

      const { result } = renderHook(() => useAuthStore())
      await act(async () => {
        await result.current.fetchCurrentUser()
      })

      expect(result.current.user).toEqual(mockUser)
      expect(result.current.isAuthenticated).toBe(true)
      expect(result.current.isLoading).toBe(false)
    })

    it('失败时清空登录状态', async () => {
      useAuthStore.setState({ user: mockUser, isAuthenticated: true })
      const { authApi } = await import('@/api/auth')
      ;(authApi.getCurrentUser as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Unauthorized'))

      const { result } = renderHook(() => useAuthStore())
      await act(async () => {
        await result.current.fetchCurrentUser()
      })

      expect(result.current.user).toBeNull()
      expect(result.current.isAuthenticated).toBe(false)
      expect(result.current.isLoading).toBe(false)
    })
  })

  describe('clearError', () => {
    it('清除错误信息', () => {
      useAuthStore.setState({ error: 'Some error' })

      const { result } = renderHook(() => useAuthStore())
      act(() => {
        result.current.clearError()
      })

      expect(result.current.error).toBeNull()
    })
  })
})
