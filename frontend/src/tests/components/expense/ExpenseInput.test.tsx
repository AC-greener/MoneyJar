import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { ExpenseInput } from '@/components/expense/ExpenseInput'

// Mock useVoiceInput
const useVoiceInputMock = vi.fn()
vi.mock('@/hooks/useVoiceInput', () => ({
  useVoiceInput: () => useVoiceInputMock(),
}))

// Mock transactionStore
const createTransactionMock = vi.fn()
const transactionStoreMock = {
  createTransaction: createTransactionMock,
  isLoading: false,
  error: null,
}
vi.mock('@/stores/transactionStore', () => ({
  useTransactionStore: () => transactionStoreMock,
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
    createTransactionMock.mockResolvedValue({ id: 1, type: 'expense', amount: 50, category: '餐饮', note: '午餐' })
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
    // Interim text appears in the input field
    expect(screen.getByDisplayValue('午餐...')).toBeInTheDocument()
  })

  it('输入为空时提交按钮禁用', () => {
    render(<ExpenseInput />)

    const input = screen.getByPlaceholderText('今天午餐花了50元')
    fireEvent.change(input, { target: { value: '' } })

    const submitButton = screen.getByRole('button', { name: '提交记账' })
    expect(submitButton).toBeDisabled()
  })

  it('提交后调用createTransaction', async () => {
    render(<ExpenseInput />)

    const input = screen.getByPlaceholderText('今天午餐花了50元')
    fireEvent.change(input, { target: { value: '餐饮花了50元' } })

    fireEvent.click(screen.getByRole('button', { name: '提交记账' }))

    await waitFor(() => {
      expect(createTransactionMock).toHaveBeenCalledWith({
        type: 'expense',
        amount: 50,
        category: '餐饮',
        note: '餐饮花了50元',
      })
    })
  })

  it('提交成功后显示成功提示并清空输入框', async () => {
    render(<ExpenseInput />)

    const input = screen.getByPlaceholderText('今天午餐花了50元')
    fireEvent.change(input, { target: { value: '午餐花了50元' } })

    fireEvent.click(screen.getByRole('button', { name: '提交记账' }))

    await waitFor(() => {
      expect(screen.getByText('记账成功！')).toBeInTheDocument()
    })

    expect(input).toHaveValue('')
  })

  it('提交按钮在输入为空时禁用', () => {
    render(<ExpenseInput />)

    const input = screen.getByPlaceholderText('今天午餐花了50元')
    fireEvent.change(input, { target: { value: '' } })

    const submitButton = screen.getByRole('button', { name: '提交记账' })
    expect(submitButton).toBeDisabled()
  })

  it('输入金额后提交按钮启用', () => {
    render(<ExpenseInput />)

    const input = screen.getByPlaceholderText('今天午餐花了50元')
    fireEvent.change(input, { target: { value: '午餐花了50元' } })

    const submitButton = screen.getByRole('button', { name: '提交记账' })
    expect(submitButton).not.toBeDisabled()
  })

  it('createTransaction失败时显示错误提示', async () => {
    createTransactionMock.mockRejectedValue(new Error('网络错误'))

    render(<ExpenseInput />)

    const input = screen.getByPlaceholderText('今天午餐花了50元')
    fireEvent.change(input, { target: { value: '午餐花了50元' } })

    fireEvent.click(screen.getByRole('button', { name: '提交记账' }))

    await waitFor(() => {
      expect(screen.getByText('记账失败，请重试')).toBeInTheDocument()
    })
  })

  it('无法识别金额时显示错误提示', async () => {
    render(<ExpenseInput />)

    const input = screen.getByPlaceholderText('今天午餐花了50元')
    fireEvent.change(input, { target: { value: '这是一段没有数字的文字' } })

    fireEvent.click(screen.getByRole('button', { name: '提交记账' }))

    expect(screen.getByText('未能识别金额，请重试或手动输入')).toBeInTheDocument()
  })

  it('收入关键词识别为收入类型', async () => {
    render(<ExpenseInput />)

    const input = screen.getByPlaceholderText('今天午餐花了50元')
    fireEvent.change(input, { target: { value: '发工资收入5000元' } })

    fireEvent.click(screen.getByRole('button', { name: '提交记账' }))

    await waitFor(() => {
      expect(createTransactionMock).toHaveBeenCalledWith({
        type: 'income',
        amount: 5000,
        category: '工资',
        note: '发工资收入5000元',
      })
    })
  })

  it('按Enter键提交', async () => {
    render(<ExpenseInput />)

    const input = screen.getByPlaceholderText('今天午餐花了50元')
    fireEvent.change(input, { target: { value: '午餐花了50元' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    await waitFor(() => {
      expect(createTransactionMock).toHaveBeenCalled()
    })
  })

  it('onSuccess回调在提交成功后调用', async () => {
    const onSuccess = vi.fn()
    render(<ExpenseInput onSuccess={onSuccess} />)

    const input = screen.getByPlaceholderText('今天午餐花了50元')
    fireEvent.change(input, { target: { value: '午餐花了50元' } })

    fireEvent.click(screen.getByRole('button', { name: '提交记账' }))

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled()
    })
  })
})
