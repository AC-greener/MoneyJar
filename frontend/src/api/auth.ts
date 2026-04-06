import apiClient, { setAccessToken, setRefreshToken } from './client'
import type { AuthResponse, User } from '@/types/api'

const TEST_TOKEN = import.meta.env.VITE_TEST_TOKEN

export const authApi = {
  /**
   * Get test token (development only)
   * Uses the TEST_AUTH_TOKEN from backend to obtain user tokens
   */
  async getTestToken(): Promise<AuthResponse | null> {
    // 生产环境跳过 test-token
    if (import.meta.env.PROD || !TEST_TOKEN) {
      return null
    }
    try {
      const response = await apiClient.post<AuthResponse>('/api/auth/test-token', {}, {
        headers: {
          Authorization: `Bearer ${TEST_TOKEN}`,
        },
      })
      const data = response.data
      setAccessToken(data.access_token)
      setRefreshToken(data.refresh_token)
      return data
    } catch (err: unknown) {
      // Backend not running / network unreachable in local frontend-only development.
      if (typeof err === 'object' && err !== null && 'response' in err && !(err as { response?: unknown }).response) {
        return null
      }
      // 404 表示生产环境不支持 test-token
      if (typeof err === 'object' && err !== null && 'response' in err && (err as { response: { status: number } }).response?.status === 404) {
        return null
      }
      throw err
    }
  },

  /**
   * Google OAuth login
   */
  async googleLogin(idToken: string): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/api/auth/google', { id_token: idToken })
    const data = response.data
    setAccessToken(data.access_token)
    setRefreshToken(data.refresh_token)
    return data
  },

  /**
   * Get current user info
   */
  async getCurrentUser(): Promise<User> {
    const response = await apiClient.get<User>('/api/auth/me')
    return response.data
  },

  /**
   * Logout
   */
  async logout(): Promise<void> {
    const refreshToken = localStorage.getItem('refresh_token')
    if (refreshToken) {
      await apiClient.post('/api/auth/logout', { refresh_token: refreshToken })
    }
    setAccessToken(null)
    setRefreshToken(null)
  },
}
