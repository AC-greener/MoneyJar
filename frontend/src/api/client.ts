import axios, { type AxiosInstance, type InternalAxiosRequestConfig, type AxiosError } from 'axios'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8787'

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
})

// Token storage helpers
const getAccessToken = (): string | null => {
  // Access token is kept in memory, not localStorage for security
  return (apiClient.defaults.headers.common['Authorization'] as string)?.replace('Bearer ', '') || null
}

const setAccessToken = (token: string | null): void => {
  if (token) {
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`
  } else {
    delete apiClient.defaults.headers.common['Authorization']
  }
}

const getRefreshToken = (): string | null => {
  return localStorage.getItem('refresh_token')
}

const setRefreshToken = (token: string | null): void => {
  if (token) {
    localStorage.setItem('refresh_token', token)
  } else {
    localStorage.removeItem('refresh_token')
  }
}

// Refresh token promise to prevent concurrent refresh requests
let refreshTokenPromise: Promise<string> | null = null

const refreshAccessToken = async (): Promise<string> => {
  const refreshToken = getRefreshToken()
  if (!refreshToken) {
    throw new Error('No refresh token available')
  }

  try {
    const response = await axios.post<{ access_token: string }>(
      `${BASE_URL}/api/auth/refresh`,
      { refresh_token: refreshToken }
    )
    const newAccessToken = response.data.access_token
    setAccessToken(newAccessToken)
    return newAccessToken
  } catch {
    // Refresh failed, clear tokens and redirect to login
    setAccessToken(null)
    setRefreshToken(null)
    throw new Error('Session expired')
  }
}

// Request interceptor
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    // Skip auth for public endpoints
    const publicEndpoints = ['/api/auth/google', '/api/auth/test-token', '/api/auth/refresh']
    if (publicEndpoints.some((ep) => config.url?.includes(ep))) {
      return config
    }

    // If no access token, try to use refresh token
    if (!getAccessToken() && getRefreshToken()) {
      try {
        const newToken = await refreshAccessToken()
        config.headers.Authorization = `Bearer ${newToken}`
      } catch {
        // Will trigger 401 handling
      }
    }

    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean }

    // Handle 401 errors
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      try {
        // A 401 usually means the access token expired; retry with refresh token if we have one.
        if (getRefreshToken()) {
          // Use existing refresh promise if available
          if (!refreshTokenPromise) {
            refreshTokenPromise = refreshAccessToken().finally(() => {
              refreshTokenPromise = null
            })
          }
          const newToken = await refreshTokenPromise
          originalRequest.headers = originalRequest.headers ?? {}
          originalRequest.headers.Authorization = `Bearer ${newToken}`
          return apiClient(originalRequest)
        }
      } catch {
        // Clear tokens and redirect to login
        setAccessToken(null)
        setRefreshToken(null)
        window.location.href = '/'
      }
    }

    return Promise.reject(error)
  }
)

// Export helpers and client
export { setAccessToken, setRefreshToken, getAccessToken, getRefreshToken }
export default apiClient
