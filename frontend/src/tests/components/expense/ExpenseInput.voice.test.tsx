import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { ExpenseInput } from '@/components/expense/ExpenseInput'

const {
  useVoiceInputMock,
  submitVoiceTextMock,
  confirmVoiceTransactionMock,
} = vi.hoisted(() => ({
  useVoiceInputMock: vi.fn(),
  submitVoiceTextMock: vi.fn(),
  confirmVoiceTransactionMock: vi.fn(),
}))

vi.mock('@/hooks/useVoiceInput', () => ({
  useVoiceInput: () => useVoiceInputMock(),
}))
vi.mock('@/api/transaction', () => ({
  transactionApi: {
    submitVoiceText: submitVoiceTextMock,
    confirmVoiceTransaction: confirmVoiceTransactionMock,
  },
}))

describe('ExpenseInput voice submit flow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useVoiceInputMock.mockReturnValue({
      isListening: false,
      interimText: '',
      error: null,
      start: vi.fn(),
      stop: vi.fn(),
    })
  })

  it('submits composer text to the voice parse API', async () => {
    submitVoiceTextMock.mockResolvedValue({
      status: 'ready_to_commit',
      sourceText: '今天午饭50元',
      drafts: [
        { type: 'expense', amount: 50, category: '餐饮', note: '今天午饭50元', confidence: 0.95, missingFields: [] },
      ],
      committedTransactions: [
        { id: 1, type: 'expense', amount: 50, category: '餐饮', note: '今天午饭50元', createdAt: '2026-04-25 12:00:00' },
      ],
    })

    render(<ExpenseInput />)

    fireEvent.change(screen.getByPlaceholderText('今天午餐花了50元'), {
      target: { value: '今天午饭50元' },
    })
    fireEvent.click(screen.getByRole('button', { name: '提交记账' }))

    await waitFor(() => {
      expect(submitVoiceTextMock).toHaveBeenCalledWith({
        text: '今天午饭50元',
        source: 'manual',
      })
    })
  })

  it('opens confirmation dialog when the server asks for confirmation', async () => {
    submitVoiceTextMock.mockResolvedValue({
      status: 'needs_confirmation',
      sourceText: '买菜',
      drafts: [
        { type: 'expense', category: '生鲜', note: '买菜', confidence: 0.62, missingFields: ['amount'] },
      ],
    })
    confirmVoiceTransactionMock.mockResolvedValue({
      status: 'ready_to_commit',
      sourceText: '买菜',
      drafts: [
        { type: 'expense', amount: 88, category: '生鲜', note: '买菜', confidence: 0.9, missingFields: [] },
      ],
      committedTransactions: [
        { id: 9, type: 'expense', amount: 88, category: '生鲜', note: '买菜', createdAt: '2026-04-25 12:00:00' },
      ],
    })

    render(<ExpenseInput />)

    fireEvent.change(screen.getByPlaceholderText('今天午餐花了50元'), {
      target: { value: '买菜' },
    })
    fireEvent.click(screen.getByRole('button', { name: '提交记账' }))

    expect(await screen.findByText('确认交易')).toBeInTheDocument()
    expect(screen.getByText('买菜')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('金额'), { target: { value: '88' } })
    fireEvent.click(screen.getByRole('button', { name: '确认' }))

    await waitFor(() => {
      expect(confirmVoiceTransactionMock).toHaveBeenCalledWith({
        sourceText: '买菜',
        drafts: [
          {
            type: 'expense',
            amount: 88,
            category: '生鲜',
            note: '买菜',
            confidence: 0.62,
            missingFields: [],
          },
        ],
      })
    })
  })
})
