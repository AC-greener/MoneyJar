import { useEffect, useState } from 'react'
import { CategoryPieChart } from '@/components/charts/CategoryPieChart'
import { TrendLineChart } from '@/components/charts/TrendLineChart'
import { useAuthStore } from '@/stores/authStore'
import { useTransactionStore } from '@/stores/transactionStore'
import { formatCurrency } from '@/utils/format'
import type { Period } from '@/types/api'

export default function StatsPage() {
  const { isAuthenticated } = useAuthStore()
  const { summary, fetchSummary, isLoading } = useTransactionStore()
  const [period, setPeriod] = useState<Period>('month')

  // Fetch summary when period changes - only when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchSummary(period)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, period])

  const handlePeriodChange = (newPeriod: Period) => {
    setPeriod(newPeriod)
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <header className="bg-white dark:bg-gray-800 shadow-sm">
          <div className="max-w-lg mx-auto px-4 py-4">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">统计</h1>
          </div>
        </header>
        <main className="max-w-lg mx-auto px-4 py-6">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">查看您的消费分析</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-6">登录后自动统计您的收支情况，生成可视化报表</p>
            <div className="space-y-3">
              <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>按周/月查看收支趋势</span>
              </div>
              <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>支出分类饼图分析</span>
              </div>
              <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>智能财务建议</span>
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">统计</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Period Selector */}
        <div className="flex gap-2">
          <button
            onClick={() => handlePeriodChange('week')}
            className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
              period === 'week'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
            }`}
          >
            本周
          </button>
          <button
            onClick={() => handlePeriodChange('month')}
            className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
              period === 'month'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
            }`}
          >
            本月
          </button>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        )}

        {/* Summary Cards */}
        {!isLoading && summary && (
          <>
            {/* Overview Cards */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4">
                <p className="text-sm text-gray-500 mb-1">总收入</p>
                <p className="text-xl font-bold text-green-500">
                  {formatCurrency(summary.income)}
                </p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4">
                <p className="text-sm text-gray-500 mb-1">总支出</p>
                <p className="text-xl font-bold text-red-500">
                  {formatCurrency(summary.expense)}
                </p>
              </div>
            </div>

            {/* Balance Card */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4">
              <p className="text-sm text-gray-500 mb-1">结余</p>
              <p className={`text-2xl font-bold ${summary.income - summary.expense >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {formatCurrency(summary.income - summary.expense)}
              </p>
            </div>

            {/* Category Pie Chart */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4">
              <CategoryPieChart data={summary.byCategory} title="支出分类" />
            </div>

            {/* Trend Line Chart */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4">
              <TrendLineChart transactions={summary.transactions} period={period} />
            </div>
          </>
        )}

        {/* Empty State */}
        {!isLoading && !summary && (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <svg className="w-16 h-16 mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <p>暂无统计数据</p>
            <p className="text-sm">开始记账后查看您的消费分析</p>
          </div>
        )}
      </main>
    </div>
  )
}
