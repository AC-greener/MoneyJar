import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import dayjs from 'dayjs'
import { formatCurrency } from '@/utils/format'
import type { Transaction } from '@/types/api'

interface TrendLineChartProps {
  transactions: Transaction[]
  period: 'week' | 'month'
}

export function TrendLineChart({ transactions, period }: TrendLineChartProps) {
  // Guard against undefined/null transactions
  if (!transactions || transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500">
        <p>暂无数据</p>
      </div>
    )
  }

  // Group transactions by date
  const groupedByDate = transactions.reduce<Record<string, { expense: number; income: number }>>((acc, t) => {
    const dateKey = t.createdAt ? dayjs(t.createdAt).format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD')
    if (!acc[dateKey]) {
      acc[dateKey] = { expense: 0, income: 0 }
    }
    if (t.type === 'expense') {
      acc[dateKey].expense += t.amount
    } else {
      acc[dateKey].income += t.amount
    }
    return acc
  }, {})

  // Create chart data
  const chartData = Object.entries(groupedByDate)
    .map(([date, values]) => ({
      date,
      dateLabel: dayjs(date).format(period === 'week' ? 'ddd' : 'D日'),
      expense: values.expense,
      income: values.income,
    }))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-14) // Last 14 data points

  if (chartData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500">
        <p>暂无数据</p>
      </div>
    )
  }

  return (
    <div className="w-full">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        收支趋势
      </h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis
              dataKey="dateLabel"
              tick={{ fill: 'var(--color-text-secondary)', fontSize: 12 }}
              axisLine={{ stroke: 'var(--color-border)' }}
            />
            <YAxis
              tick={{ fill: 'var(--color-text-secondary)', fontSize: 12 }}
              axisLine={{ stroke: 'var(--color-border)' }}
              tickFormatter={(value) => `¥${value}`}
            />
            <Tooltip
              formatter={(value) => formatCurrency(value as number)}
              contentStyle={{
                backgroundColor: 'var(--color-card-light)',
                border: '1px solid var(--color-border)',
                borderRadius: '8px',
              }}
              labelFormatter={(label, payload) => {
                if (payload && payload[0]) {
                  return dayjs(payload[0].payload.date).format('YYYY-MM-DD')
                }
                return label
              }}
            />
            <Legend
              verticalAlign="top"
              height={36}
              formatter={(value) => (
                <span className="text-gray-700 dark:text-gray-300">
                  {value === 'expense' ? '支出' : '收入'}
                </span>
              )}
            />
            <Line
              type="monotone"
              dataKey="expense"
              stroke="#ff3b30"
              strokeWidth={2}
              dot={{ fill: '#ff3b30', r: 4 }}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              dataKey="income"
              stroke="#34c759"
              strokeWidth={2}
              dot={{ fill: '#34c759', r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
