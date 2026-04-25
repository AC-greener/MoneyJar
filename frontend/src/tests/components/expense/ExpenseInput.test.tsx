import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
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

describe('ExpenseInput', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useVoiceInputMock.mockReturnValue({
      isListening: false,
      interimText: '',
      error: null,
      start: vi.fn(),
      stop: vi.fn(),
    })
    submitVoiceTextMock.mockResolvedValue({
      status: 'ready_to_commit',
      sourceText: '午餐花了50元',
      drafts: [
        { type: 'expense', amount: 50, category: '餐饮', note: '午餐花了50元', confidence: 0.95, missingFields: [] },
      ],
      committedTransactions: [
        { id: 1, type: 'expense', amount: 50, category: '餐饮', note: '午餐花了50元', createdAt: '2026-04-25 12:00:00' },
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
  })

  it('显示输入框、麦克风按钮和提交按钮', () => {
    render(<ExpenseInput />)

    expect(screen.getByPlaceholderText('今天午餐花了50元')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '开始语音输入' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '提交记账' })).toBeInTheDocument()
  })

  it('输入框可以输入文字', () => {
    render(<ExpenseInput />)

    const input = screen.getByPlaceholderText('今天午餐花了50元')
    fireEvent.change(input, { target: { value: '午餐花了50元' } })

    expect(input).toHaveValue('午餐花了50元')
  })

  it('点击麦克风按钮开始语音输入', () => {
    const start = vi.fn()
    useVoiceInputMock.mockReturnValue({
      isListening: false,
      interimText: '',
      error: null,
      start,
      stop: vi.fn(),
    })

    render(<ExpenseInput />)
    fireEvent.click(screen.getByRole('button', { name: '开始语音输入' }))

    expect(start).toHaveBeenCalled()
  })

  it('语音识别中显示中间文字在输入框中', () => {
    useVoiceInputMock.mockReturnValue({
      isListening: true,
      interimText: '午餐...',
      error: null,
      start: vi.fn(),
      stop: vi.fn(),
    })

    render(<ExpenseInput />)

    expect(screen.getByText('正在聆听...')).toBeInTheDocument()
    expect(screen.getByDisplayValue('午餐...')).toBeInTheDocument()
  })

  it('输入为空时提交按钮禁用', () => {
    render(<ExpenseInput />)

    expect(screen.getByRole('button', { name: '提交记账' })).toBeDisabled()
  })

  it('输入内容后提交按钮启用', () => {
    render(<ExpenseInput />)

    fireEvent.change(screen.getByPlaceholderText('今天午餐花了50元'), {
      target: { value: '午餐花了50元' },
    })

    expect(screen.getByRole('button', { name: '提交记账' })).not.toBeDisabled()
  })

  it('显示来自语音识别的错误提示', () => {
    useVoiceInputMock.mockReturnValue({
      isListening: false,
      interimText: '',
      error: '麦克风权限被拒绝',
      start: vi.fn(),
      stop: vi.fn(),
    })

    render(<ExpenseInput />)

    expect(screen.getByText('麦克风权限被拒绝')).toBeInTheDocument()
  })

  it('显示服务端提交失败提示', async () => {
    submitVoiceTextMock.mockRejectedValue(new Error('Network Error'))
    render(<ExpenseInput />)

    fireEvent.change(screen.getByPlaceholderText('今天午餐花了50元'), {
      target: { value: '午餐花了50元' },
    })
    fireEvent.click(screen.getByRole('button', { name: '提交记账' }))

    expect(await screen.findByText('记账失败，请重试')).toBeInTheDocument()
  })
})
