import { create } from 'zustand'
import type { User } from '@/types/api'
import { authApi } from '@/api/auth'
import { refreshAccessToken } from '@/api/client'

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  isInitialized: boolean
  error: string | null

  // Actions
  initialize: () => Promise<void>
  loginWithTestToken: () => Promise<void>
  loginWithGoogle: (idToken: string) => Promise<void>
  completeOAuthLogin: (exchangeCode: string) => Promise<void>
  logout: () => Promise<void>
  fetchCurrentUser: () => Promise<void>
  clearError: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  isInitialized: false,
  error: null,

  initialize: async () => {
    // Skip if already initialized or currently loading
    const state = useAuthStore.getState()
    if (state.isInitialized || state.isLoading) return

    set({ isLoading: true })

    // Try to get test token (development mode only)
    // In production, this returns null immediately
    try {
      const data = await authApi.getTestToken()
      if (data) {
        set({ user: data.user, isAuthenticated: true, isLoading: false, isInitialized: true })
        return
      }
    } catch (err) {
      console.warn('Test token failed:', err)
      // Continue to check refresh token
    }

    // Check if we have a refresh token
    const refreshToken = localStorage.getItem('refresh_token')
    if (refreshToken) {
      try {
        // 先用 refresh_token 换取新的 access_token
        await refreshAccessToken()
        // 再获取用户信息
        const user = await authApi.getCurrentUser()
        set({ user, isAuthenticated: true, isLoading: false, isInitialized: true })
        return
      } catch (err) {
        console.warn('Refresh token failed:', err)
        // Clear invalid refresh token
        localStorage.removeItem('refresh_token')
        // 无论成功失败，都标记为已初始化，防止无限重试
        set({ user: null, isAuthenticated: false, isLoading: false, isInitialized: true })
        return
      }
    }

    // No valid auth - complete initialization
    set({ user: null, isAuthenticated: false, isLoading: false, isInitialized: true })
  },

  loginWithTestToken: async () => {
    set({ isLoading: true, error: null })
    try {
      const data = await authApi.getTestToken()
      if (!data) {
        set({ error: 'Test token not available in production', isLoading: false })
        throw new Error('Test token not available in production')
      }
      set({ user: data.user, isAuthenticated: true, isLoading: false })
    } catch (err) {
      const message = err instanceof Error ? err.message : '登录失败'
      set({ error: message, isLoading: false })
      throw err
    }
  },

  loginWithGoogle: async (idToken: string) => {
    set({ isLoading: true, error: null })
    try {
      const data = await authApi.googleLogin(idToken)
      set({ user: data.user, isAuthenticated: true, isLoading: false })
    } catch (err) {
      const message = err instanceof Error ? err.message : '登录失败'
      set({ error: message, isLoading: false })
      throw err
    }
  },

  completeOAuthLogin: async (exchangeCode: string) => {
    // 防止重复调用
    const state = useAuthStore.getState()
    if (state.isLoading || state.isAuthenticated) return

    set({ isLoading: true, error: null })
    try {
      const data = await authApi.exchangeOAuthCode(exchangeCode)
      set({ user: data.user, isAuthenticated: true, isLoading: false, isInitialized: true })
    } catch (err) {
      const message = err instanceof Error ? err.message : '登录失败'
      set({ error: message, isLoading: false, isInitialized: true })
      throw err
    }
  },

  logout: async () => {
    set({ isLoading: true, error: null })
    try {
      await authApi.logout()
    } catch {
      // Even if logout fails, clear local state
    } finally {
      set({ user: null, isAuthenticated: false, isLoading: false, isInitialized: false })
    }
  },

  fetchCurrentUser: async () => {
    set({ isLoading: true, error: null })
    try {
      const user = await authApi.getCurrentUser()
      set({ user, isAuthenticated: true, isLoading: false })
    } catch {
      set({ user: null, isAuthenticated: false, isLoading: false })
    }
  },

  clearError: () => set({ error: null }),
}))
