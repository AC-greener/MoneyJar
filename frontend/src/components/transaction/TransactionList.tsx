import type { Transaction } from '@/types/api'
import { formatCurrency, formatRelativeTime, formatTransactionType } from '@/utils/format'
import { DEFAULT_CATEGORIES } from '@/types/api'

interface TransactionListProps {
  transactions: Transaction[]
  onDelete?: (id: number) => void
}

export function TransactionList({ transactions, onDelete }: TransactionListProps) {
  if (transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-500">
        <svg className="w-16 h-16 mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        <p>暂无交易记录</p>
        <p className="text-sm">开始记账吧！</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {transactions.map((transaction) => {
        const category = DEFAULT_CATEGORIES.find((c) => c.name === transaction.category)
        const isExpense = transaction.type === 'expense'

        return (
          <div
            key={transaction.id}
            className="flex items-center gap-4 p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-shadow"
          >
            {/* Category Icon */}
            <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded-full text-2xl">
              {category?.icon || '📦'}
            </div>

            {/* Details */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-900 dark:text-white">
                  {transaction.category}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${isExpense ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'}`}>
                  {formatTransactionType(transaction.type)}
                </span>
              </div>
              {transaction.note && (
                <p className="text-sm text-gray-500 truncate mt-0.5">
                  {transaction.note}
                </p>
              )}
              <p className="text-xs text-gray-400 mt-1">
                {transaction.createdAt ? formatRelativeTime(transaction.createdAt) : '刚刚'}
              </p>
            </div>

            {/* Amount */}
            <div className="flex-shrink-0 text-right">
              <span className={`text-lg font-semibold ${isExpense ? 'text-red-500' : 'text-green-500'}`}>
                {isExpense ? '-' : '+'}{formatCurrency(transaction.amount)}
              </span>
            </div>

            {/* Delete Button */}
            {onDelete && transaction.id && (
              <button
                onClick={() => onDelete(transaction.id!)}
                className="flex-shrink-0 p-2 text-gray-400 hover:text-red-500 transition-colors"
                aria-label="删除交易"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}
