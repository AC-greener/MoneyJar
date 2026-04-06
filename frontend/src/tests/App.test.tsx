import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { getMockAuthStore, mockUser } from './setup/authStore'
import { getMockTransactionStore } from './setup/transactionStore'
import { getMockVoiceInputStore } from './setup/voiceInputStore'

vi.mock('@/stores/authStore', () => ({
  useAuthStore: vi.fn(),
}))

vi.mock('@/stores/transactionStore', () => ({
  useTransactionStore: vi.fn(),
}))

vi.mock('@/stores/voiceInputStore', () => ({
  useVoiceInputStore: vi.fn(),
}))

vi.mock('@/components/common/BottomNav', () => ({
  BottomNav: () => <div>BottomNav</div>,
}))

vi.mock('@/pages/RecordPage', () => ({
  default: () => <div>RecordPage</div>,
}))

vi.mock('@/pages/StatsPage', () => ({
  default: () => <div>StatsPage</div>,
}))

vi.mock('@/pages/SettingsPage', () => ({
  default: () => <div>SettingsPage</div>,
}))

import App from '@/App'
import { useAuthStore } from '@/stores/authStore'
import { useTransactionStore } from '@/stores/transactionStore'
import { useVoiceInputStore } from '@/stores/voiceInputStore'

describe('App routing', () => {
  const useAuthStoreMock = useAuthStore as unknown as ReturnType<typeof vi.fn> & {
    getState?: () => {
      isInitialized: boolean
      isLoading: boolean
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
    ;(useTransactionStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(getMockTransactionStore())
    ;(useVoiceInputStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(getMockVoiceInputStore())
  })

  it('未登录访问根路由时进入记账页', async () => {
    const authState = getMockAuthStore({ isAuthenticated: false, user: null })
    useAuthStoreMock.mockReturnValue(authState)
    useAuthStoreMock.getState = () => authState

    await act(async () => {
      render(
        <MemoryRouter initialEntries={['/']}>
          <App />
        </MemoryRouter>
      )
    })

    expect(await screen.findByText('RecordPage')).toBeInTheDocument()
  })

  it('未登录访问统计页时稳定渲染统计页', async () => {
    const authState = getMockAuthStore({ isAuthenticated: false, user: null })
    useAuthStoreMock.mockReturnValue(authState)
    useAuthStoreMock.getState = () => authState

    await act(async () => {
      render(
        <MemoryRouter initialEntries={['/stats']}>
          <App />
        </MemoryRouter>
      )
    })

    expect(await screen.findByText('StatsPage')).toBeInTheDocument()
  })

  it('未登录访问设置页时稳定渲染设置页', async () => {
    const authState = getMockAuthStore({ isAuthenticated: false, user: null })
    useAuthStoreMock.mockReturnValue(authState)
    useAuthStoreMock.getState = () => authState

    await act(async () => {
      render(
        <MemoryRouter initialEntries={['/settings']}>
          <App />
        </MemoryRouter>
      )
    })

    expect(await screen.findByText('SettingsPage')).toBeInTheDocument()
  })

  it('已登录访问根路由时仍进入记账页', async () => {
    const authState = getMockAuthStore({ isAuthenticated: true, user: mockUser })
    useAuthStoreMock.mockReturnValue(authState)
    useAuthStoreMock.getState = () => authState

    await act(async () => {
      render(
        <MemoryRouter initialEntries={['/']}>
          <App />
        </MemoryRouter>
      )
    })

    expect(await screen.findByText('RecordPage')).toBeInTheDocument()
  })
})
