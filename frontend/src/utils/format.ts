import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/zh-cn'

dayjs.locale('zh-cn')
dayjs.extend(relativeTime)

/**
 * Format currency amount
 */
export const formatCurrency = (amount: number, currency = 'CNY'): string => {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

/**
 * Format date to relative time (e.g., "3小时前")
 */
export const formatRelativeTime = (date: string | Date): string => {
  return dayjs(date).fromNow()
}

/**
 * Format date to standard format (e.g., "2024-01-15 14:30")
 */
export const formatDateTime = (date: string | Date): string => {
  return dayjs(date).format('YYYY-MM-DD HH:mm')
}

/**
 * Format date to short format (e.g., "1月15日")
 */
export const formatDateShort = (date: string | Date): string => {
  return dayjs(date).format('M月D日')
}

/**
 * Format transaction type
 */
export const formatTransactionType = (type: 'income' | 'expense'): string => {
  return type === 'income' ? '收入' : '支出'
}

/**
 * Get current period start date
 */
export const getPeriodStartDate = (period: 'week' | 'month'): string => {
  const now = dayjs()
  if (period === 'week') {
    return now.startOf('week').toISOString()
  }
  return now.startOf('month').toISOString()
}
