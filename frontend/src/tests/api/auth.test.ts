import { beforeEach, describe, expect, it, vi } from 'vitest'

const postMock = vi.fn()
const getMock = vi.fn()
const setAccessTokenMock = vi.fn()
const setRefreshTokenMock = vi.fn()

vi.mock('@/api/client', () => ({
  __esModule: true,
  default: {
    post: postMock,
    get: getMock,
  },
  setAccessToken: setAccessTokenMock,
  setRefreshToken: setRefreshTokenMock,
}))

describe('authApi.getTestToken', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('开发环境后端不可达时返回 null', async () => {
    vi.stubEnv('VITE_TEST_TOKEN', 'dev-test-token')
    postMock.mockRejectedValueOnce({ message: 'Network Error', response: undefined })

    const { authApi } = await import('@/api/auth')
    const result = await authApi.getTestToken()

    expect(result).toBeNull()
    expect(postMock).toHaveBeenCalledWith(
      '/api/auth/test-token',
      {},
      {
        headers: {
          Authorization: 'Bearer dev-test-token',
        },
      },
    )
    expect(setAccessTokenMock).not.toHaveBeenCalled()
    expect(setRefreshTokenMock).not.toHaveBeenCalled()
  })

  it('未配置测试 token 时跳过请求', async () => {
    vi.stubEnv('VITE_TEST_TOKEN', '')

    const { authApi } = await import('@/api/auth')
    const result = await authApi.getTestToken()

    expect(result).toBeNull()
    expect(postMock).not.toHaveBeenCalled()
  })

  it('test token 成功时写入 access/refresh token', async () => {
    vi.stubEnv('VITE_TEST_TOKEN', 'dev-test-token')
    const payload = {
      access_token: 'access-token',
      refresh_token: 'refresh-token',
      user: { id: '1', email: 'a@test.com', name: 'A', avatarUrl: null, plan: 'free' as const },
    }
    postMock.mockResolvedValueOnce({ data: payload })

    const { authApi } = await import('@/api/auth')
    const result = await authApi.getTestToken()

    expect(result).toEqual(payload)
    expect(setAccessTokenMock).toHaveBeenCalledWith('access-token')
    expect(setRefreshTokenMock).toHaveBeenCalledWith('refresh-token')
  })

  it('test token 404 时返回 null', async () => {
    vi.stubEnv('VITE_TEST_TOKEN', 'dev-test-token')
    postMock.mockRejectedValueOnce({ response: { status: 404 } })

    const { authApi } = await import('@/api/auth')
    await expect(authApi.getTestToken()).resolves.toBeNull()
  })
})

describe('authApi other methods', () => {
  const originalLocalStorageDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')

  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('googleLogin 返回用户并保存 token', async () => {
    const payload = {
      access_token: 'google-access',
      refresh_token: 'google-refresh',
      user: { id: '2', email: 'b@test.com', name: 'B', avatarUrl: null, plan: 'pro' as const },
    }
    postMock.mockResolvedValueOnce({ data: payload })

    const { authApi } = await import('@/api/auth')
    const result = await authApi.googleLogin('google-id-token')

    expect(postMock).toHaveBeenCalledWith('/api/auth/google', { id_token: 'google-id-token' })
    expect(result).toEqual(payload)
    expect(setAccessTokenMock).toHaveBeenCalledWith('google-access')
    expect(setRefreshTokenMock).toHaveBeenCalledWith('google-refresh')
  })

  it('getCurrentUser 返回接口数据', async () => {
    const user = { id: '3', email: 'c@test.com', name: 'C', avatarUrl: null, plan: 'free' as const }
    getMock.mockResolvedValueOnce({ data: user })

    const { authApi } = await import('@/api/auth')
    await expect(authApi.getCurrentUser()).resolves.toEqual(user)
    expect(getMock).toHaveBeenCalledWith('/api/auth/me')
  })

  it('logout 有 refresh token 时调用接口并清空本地 token', async () => {
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: { getItem: vi.fn().mockReturnValue('refresh-123') },
    })
    postMock.mockResolvedValueOnce({ data: {} })

    const { authApi } = await import('@/api/auth')
    await authApi.logout()

    expect(postMock).toHaveBeenCalledWith('/api/auth/logout', { refresh_token: 'refresh-123' })
    expect(setAccessTokenMock).toHaveBeenCalledWith(null)
    expect(setRefreshTokenMock).toHaveBeenCalledWith(null)
    if (originalLocalStorageDescriptor) {
      Object.defineProperty(globalThis, 'localStorage', originalLocalStorageDescriptor)
    }
  })

  it('logout 无 refresh token 时跳过接口但仍清空本地 token', async () => {
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: { getItem: vi.fn().mockReturnValue(null) },
    })

    const { authApi } = await import('@/api/auth')
    await authApi.logout()

    expect(postMock).not.toHaveBeenCalled()
    expect(setAccessTokenMock).toHaveBeenCalledWith(null)
    expect(setRefreshTokenMock).toHaveBeenCalledWith(null)
    if (originalLocalStorageDescriptor) {
      Object.defineProperty(globalThis, 'localStorage', originalLocalStorageDescriptor)
    }
  })
})
