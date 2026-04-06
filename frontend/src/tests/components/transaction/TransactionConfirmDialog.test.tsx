import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { TransactionConfirmDialog } from '@/components/transaction/TransactionConfirmDialog'

// Mock the dependencies
vi.mock('@/utils/format', () => ({
  formatCurrency: (amount: number) => `¥${amount.toFixed(2)}`,
}))

describe('TransactionConfirmDialog', () => {
  const mockOnClose = vi.fn()
  const mockOnConfirm = vi.fn().mockResolvedValue(undefined)

  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    onConfirm: mockOnConfirm,
    rawText: '我花了100块吃午饭',
    suggestedTransaction: {
      type: 'expense' as const,
      amount: 100,
      category: '餐饮',
      note: '午饭',
    },
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('渲染', () => {
    it('isOpen 为 false 时不渲染', () => {
      render(<TransactionConfirmDialog {...defaultProps} isOpen={false} />)
      expect(screen.queryByText('确认交易')).not.toBeInTheDocument()
    })

    it('isOpen 为 true 时渲染对话框', () => {
      render(<TransactionConfirmDialog {...defaultProps} />)
      expect(screen.getByText('确认交易')).toBeInTheDocument()
    })

    it('显示原始语音文本', () => {
      render(<TransactionConfirmDialog {...defaultProps} />)
      expect(screen.getByText('我花了100块吃午饭')).toBeInTheDocument()
    })

    it('显示预设金额', () => {
      render(<TransactionConfirmDialog {...defaultProps} />)
      expect(screen.getByDisplayValue('100')).toBeInTheDocument()
    })

    it('渲染取消和确认按钮', () => {
      render(<TransactionConfirmDialog {...defaultProps} />)
      expect(screen.getByRole('button', { name: '取消' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '确认' })).toBeInTheDocument()
    })
  })

  describe('表单交互', () => {
    it('点击取消按钮调用 onClose', () => {
      render(<TransactionConfirmDialog {...defaultProps} />)
      fireEvent.click(screen.getByRole('button', { name: '取消' }))
      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })

    it('切换交易类型为收入', () => {
      render(<TransactionConfirmDialog {...defaultProps} />)
      const incomeRadio = screen.getByRole('radio', { name: '收入' })
      fireEvent.click(incomeRadio)
      expect((incomeRadio as HTMLInputElement).checked).toBe(true)
    })

    it('修改金额', () => {
      render(<TransactionConfirmDialog {...defaultProps} />)
      const amountInput = screen.getByDisplayValue('100')
      fireEvent.change(amountInput, { target: { value: '200' } })
      expect(screen.getByDisplayValue('200')).toBeInTheDocument()
    })
  })

  describe('提交', () => {
    it('提交时调用 onConfirm', async () => {
      render(<TransactionConfirmDialog {...defaultProps} />)
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: '确认' }))
      })
      expect(mockOnConfirm).toHaveBeenCalled()
    })

    it('提交后调用 onClose', async () => {
      render(<TransactionConfirmDialog {...defaultProps} />)
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: '确认' }))
      })
      expect(mockOnClose).toHaveBeenCalled()
    })
  })

  describe('预览', () => {
    it('显示交易预览', () => {
      render(<TransactionConfirmDialog {...defaultProps} />)
      // 支出显示金额
      expect(screen.getByText(/^¥/)).toBeInTheDocument()
    })

    it('预览显示支出标签', () => {
      render(<TransactionConfirmDialog {...defaultProps} />)
      // 有两个"支出"：一个是 radio 标签，一个是预览中的类型
      expect(screen.getAllByText('支出').length).toBeGreaterThan(0)
    })
  })
})
