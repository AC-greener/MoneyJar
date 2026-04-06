import { describe, it, expect } from 'vitest'
import { formatCurrency, formatRelativeTime, formatDateTime, formatDateShort, formatTransactionType } from '@/utils/format'

describe('format utils', () => {
  describe('formatCurrency', () => {
    it('格式化整数金额', () => {
      const result = formatCurrency(100)
      expect(result).toBe('¥100.00')
    })

    it('格式化小数金额', () => {
      const result = formatCurrency(99.9)
      expect(result).toBe('¥99.90')
    })

    it('格式化大金额', () => {
      const result = formatCurrency(10000)
      expect(result).toBe('¥10,000.00')
    })

    it('格式化零', () => {
      const result = formatCurrency(0)
      expect(result).toBe('¥0.00')
    })
  })

  describe('formatTransactionType', () => {
    it('expense 返回支出', () => {
      expect(formatTransactionType('expense')).toBe('支出')
    })

    it('income 返回收入', () => {
      expect(formatTransactionType('income')).toBe('收入')
    })
  })

  describe('formatDateTime', () => {
    it('格式化日期时间字符串', () => {
      const result = formatDateTime('2024-01-15T14:30:00')
      expect(result).toBe('2024-01-15 14:30')
    })

    it('格式化 Date 对象', () => {
      const date = new Date('2024-01-15T14:30:00')
      const result = formatDateTime(date)
      expect(result).toBe('2024-01-15 14:30')
    })
  })

  describe('formatDateShort', () => {
    it('格式化短日期', () => {
      const result = formatDateShort('2024-01-15T14:30:00')
      expect(result).toBe('1月15日')
    })
  })

  describe('formatRelativeTime', () => {
    it('返回相对时间字符串', () => {
      const now = new Date()
      const result = formatRelativeTime(now)
      expect(typeof result).toBe('string')
      expect(result.length).toBeGreaterThan(0)
    })
  })
})
