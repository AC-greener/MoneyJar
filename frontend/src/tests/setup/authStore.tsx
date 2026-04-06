/* eslint-disable react-refresh/only-export-components */
import type { ReactNode } from 'react'
import type { User } from '@/types/api'
import { vi } from 'vitest'

// Mock user for testing
export const mockUser: User = {
  id: '1',
  email: 'test@example.com',
  name: 'Test User',
  avatarUrl: null,
  plan: 'free',
}

// Mock auth store state
export interface MockAuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  isInitialized: boolean
  error: string | null
  loginWithTestToken: () => Promise<void>
  loginWithGoogle: (idToken: string) => Promise<void>
  logout: () => Promise<void>
  fetchCurrentUser: () => Promise<void>
  clearError: () => void
  initialize: () => Promise<void>
}

// Create mock auth store
export function createMockAuthStore(initialState: Partial<MockAuthState> = {}) {
  return () => ({
    user: null,
    isAuthenticated: false,
    isLoading: false,
    isInitialized: true,
    error: null,
    initialize: vi.fn().mockResolvedValue(undefined),
    loginWithTestToken: vi.fn().mockResolvedValue(undefined),
    loginWithGoogle: vi.fn().mockResolvedValue(undefined),
    logout: vi.fn().mockResolvedValue(undefined),
    fetchCurrentUser: vi.fn().mockResolvedValue(undefined),
    clearError: vi.fn(),
    ...initialState,
  })
}

// Props for MockAuthProvider
interface MockAuthProviderProps {
  children: ReactNode
  isAuthenticated?: boolean
  user?: User | null
  isLoading?: boolean
  isInitialized?: boolean
}

// Mock auth provider component
export function MockAuthProvider({
  children,
}: MockAuthProviderProps) {
  return <>{children}</>
}

// Helper to generate mock auth store for a specific state
export function getMockAuthStore(config: {
  isAuthenticated?: boolean
  user?: User | null
  isLoading?: boolean
}) {
  const { isAuthenticated = false, user: userVal = null, isLoading = false } = config
  return {
    user: userVal,
    isAuthenticated,
    isLoading,
    isInitialized: true,
    error: null,
    initialize: vi.fn().mockResolvedValue(undefined),
    loginWithTestToken: vi.fn().mockResolvedValue(undefined),
    loginWithGoogle: vi.fn().mockResolvedValue(undefined),
    logout: vi.fn().mockResolvedValue(undefined),
    fetchCurrentUser: vi.fn().mockResolvedValue(undefined),
    clearError: vi.fn(),
  }
}
