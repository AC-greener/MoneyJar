import { useEffect, useCallback } from 'react'
import { ExpenseInput } from '@/components/expense/ExpenseInput'
import { TransactionList } from '@/components/transaction/TransactionList'
import { useAuthStore } from '@/stores/authStore'
import { useTransactionStore } from '@/stores/transactionStore'

export default function RecordPage() {
  const { isAuthenticated } = useAuthStore()
  const { transactions, fetchTransactions, deleteTransaction, offlineQueue, syncOfflineQueue } = useTransactionStore()

  // Fetch transactions on mount - only when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchTransactions()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated])

  // Sync offline queue when online
  useEffect(() => {
    if (offlineQueue.length > 0) {
      syncOfflineQueue()
    }
  }, [offlineQueue.length, syncOfflineQueue])

  const handleSuccess = useCallback(() => {
    fetchTransactions()
  }, [fetchTransactions])

  const handleDelete = async (id: number) => {
    try {
      await deleteTransaction(id)
    } catch {
      // Error handled by store
    }
  }

  // Show login prompt if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <header className="bg-white dark:bg-gray-800 shadow-sm">
          <div className="max-w-lg mx-auto px-4 py-4">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">记账</h1>
          </div>
        </header>
        <main className="max-w-lg mx-auto px-4 py-6">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">欢迎使用 MoneyJar</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-6">登录后即可开始语音记账，智能识别金额和分类</p>
            <div className="space-y-3">
              <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>语音输入，开口即记</span>
              </div>
              <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>智能分类，自动统计</span>
              </div>
              <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>离线记账，自动同步</span>
              </div>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-lg mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">记账</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Expense Input Section */}
        <section className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-4">
          <ExpenseInput onSuccess={handleSuccess} />
        </section>

        {/* Offline Queue Indicator */}
        {offlineQueue.length > 0 && (
          <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
            <p className="text-sm text-yellow-600 dark:text-yellow-400">
              有 {offlineQueue.length} 笔交易待同步到服务器
            </p>
          </div>
        )}

        {/* Transaction List */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            最近交易
          </h2>
          <TransactionList transactions={(transactions || []).slice(0, 10)} onDelete={handleDelete} />
        </section>
      </main>
    </div>
  )
}
