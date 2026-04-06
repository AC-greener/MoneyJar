import { useState, useCallback, useEffect } from 'react'
import { VoiceInput } from '@/components/voice/VoiceInput'
import { TransactionConfirmDialog } from '@/components/transaction/TransactionConfirmDialog'
import { TransactionList } from '@/components/transaction/TransactionList'
import { useAuthStore } from '@/stores/authStore'
import { useTransactionStore } from '@/stores/transactionStore'
import { useVoiceInputStore } from '@/stores/voiceInputStore'
import type { VoiceParseResult } from '@/types/api'
import type { CreateTransactionFormData } from '@/utils/validation'

// Mock voice parsing - in production this would call the backend LLM
function parseVoiceText(text: string): VoiceParseResult {
  // Simple pattern matching for demo purposes
  const amountMatch = text.match(/\d+(\.\d+)?/)
  const amount = amountMatch ? parseFloat(amountMatch[0]) : 0

  const categories = ['餐饮', '交通', '购物', '娱乐', '医疗', '工资', '投资', '其他']
  const foundCategory = categories.find((c) => text.includes(c)) || '其他'

  const isExpense = !text.includes('收入') && !text.includes('赚钱')
  const isIncome = text.includes('收入') || text.includes('赚钱') || text.includes('发工资')

  return {
    transactions: [{
      type: isIncome ? 'income' : (isExpense ? 'expense' : 'expense'),
      amount,
      category: foundCategory,
      note: text,
    }],
    rawText: text,
  }
}

export default function RecordPage() {
  const { isAuthenticated } = useAuthStore()
  const { transactions, createTransaction, fetchTransactions, deleteTransaction, isLoading, offlineQueue, syncOfflineQueue } = useTransactionStore()
  const { finalText, parseResult, setParseResult, reset: resetVoiceInput } = useVoiceInputStore()

  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [pendingTransaction, setPendingTransaction] = useState<CreateTransactionFormData | null>(null)

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

  // Handle voice transcript - directly set state without useEffect
  const handleTranscript = useCallback((text: string) => {
    // Simulate LLM parsing (in production, this would call the backend API)
    const mockParseResult: VoiceParseResult = parseVoiceText(text)
    setParseResult(mockParseResult)
    // Directly show dialog with parsed result
    const suggested = mockParseResult.transactions[0]
    if (suggested.amount > 0) {
      setPendingTransaction({
        type: suggested.type,
        amount: suggested.amount,
        category: suggested.category,
        note: suggested.note,
      })
      setShowConfirmDialog(true)
    }
  }, [setParseResult])

  // Handle transaction confirmation
  const handleConfirmTransaction = async (data: CreateTransactionFormData) => {
    await createTransaction({
      type: data.type,
      amount: data.amount,
      category: data.category,
      note: data.note,
    })
    resetVoiceInput()
    setShowConfirmDialog(false)
    setPendingTransaction(null)
  }

  const handleDialogClose = () => {
    setShowConfirmDialog(false)
  }

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

  // Determine if we should show the "view confirmation" button
  const hasParseResult = parseResult && parseResult.transactions.length > 0 && parseResult.transactions[0].amount > 0
  const showViewConfirmation = hasParseResult && !showConfirmDialog

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
        {/* Voice Input Section */}
        <section className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6">
          <VoiceInput onTranscript={handleTranscript} disabled={isLoading} />

          {showViewConfirmation && (
            <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <p className="text-sm text-green-600 dark:text-green-400 mb-2">
                识别成功！
              </p>
              <button
                onClick={() => setShowConfirmDialog(true)}
                className="w-full py-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors"
              >
                查看并确认交易
              </button>
            </div>
          )}
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

      {/* Confirmation Dialog */}
      {pendingTransaction && (
        <TransactionConfirmDialog
          isOpen={showConfirmDialog}
          onClose={handleDialogClose}
          onConfirm={handleConfirmTransaction}
          rawText={finalText}
          suggestedTransaction={pendingTransaction}
        />
      )}
    </div>
  )
}
