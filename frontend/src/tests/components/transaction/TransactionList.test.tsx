import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TransactionList } from '@/components/transaction/TransactionList'
import type { Transaction } from '@/types/api'

describe('TransactionList', () => {
  describe('空状态', () => {
    it('无交易时显示空状态', () => {
      render(<TransactionList transactions={[]} />)
      expect(screen.getByText('暂无交易记录')).toBeInTheDocument()
      expect(screen.getByText('开始记账吧！')).toBeInTheDocument()
    })
  })

  describe('渲染交易列表', () => {
    const mockTransactions: Transaction[] = [
      { id: 1, type: 'expense', amount: 100, category: '餐饮', note: '午餐' },
      { id: 2, type: 'income', amount: 5000, category: '工资', note: '月薪' },
    ]

    it('渲染交易列表', () => {
      render(<TransactionList transactions={mockTransactions} />)
      expect(screen.getByText('餐饮')).toBeInTheDocument()
      expect(screen.getByText('工资')).toBeInTheDocument()
    })

    it('渲染金额', () => {
      render(<TransactionList transactions={mockTransactions} />)
      // 金额显示格式为 -¥100.00 和 +¥5,000.00
      expect(screen.getByText(/-¥100\.00/)).toBeInTheDocument()
      expect(screen.getByText(/\+¥5,000\.00/)).toBeInTheDocument()
    })

    it('渲染备注', () => {
      render(<TransactionList transactions={mockTransactions} />)
      expect(screen.getByText('午餐')).toBeInTheDocument()
      expect(screen.getByText('月薪')).toBeInTheDocument()
    })

    it('渲染支出类型标签', () => {
      render(<TransactionList transactions={mockTransactions} />)
      expect(screen.getAllByText('支出').length).toBeGreaterThan(0)
      expect(screen.getAllByText('收入').length).toBeGreaterThan(0)
    })
  })

  describe('删除功能', () => {
    const mockTransactions: Transaction[] = [
      { id: 1, type: 'expense', amount: 100, category: '餐饮', note: '午餐' },
    ]

    it('有 onDelete 时显示删除按钮', () => {
      render(<TransactionList transactions={mockTransactions} onDelete={vi.fn()} />)
      expect(screen.getByLabelText('删除交易')).toBeInTheDocument()
    })

    it('无 onDelete 时不显示删除按钮', () => {
      render(<TransactionList transactions={mockTransactions} />)
      expect(screen.queryByLabelText('删除交易')).not.toBeInTheDocument()
    })

    it('点击删除按钮调用 onDelete', () => {
      const handleDelete = vi.fn()
      render(<TransactionList transactions={mockTransactions} onDelete={handleDelete} />)
      fireEvent.click(screen.getByLabelText('删除交易'))
      expect(handleDelete).toHaveBeenCalledWith(1)
    })
  })
})
