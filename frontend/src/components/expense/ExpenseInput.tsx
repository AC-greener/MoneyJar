import { useState, useCallback } from 'react'
import { useVoiceInput } from '@/hooks/useVoiceInput'
import { transactionApi } from '@/api/transaction'
import { TransactionConfirmDialog } from '@/components/transaction/TransactionConfirmDialog'
import type { VoiceTransactionDraft } from '@/types/api'
import type { CreateTransactionFormData } from '@/utils/validation'

interface ExpenseInputProps {
  onSuccess?: () => void
  disabled?: boolean
}

export function ExpenseInput({ onSuccess, disabled = false }: ExpenseInputProps) {
  const [inputText, setInputText] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [showSuccess, setShowSuccess] = useState(false)
  const [inputSource, setInputSource] = useState<'voice' | 'manual'>('manual')
  const [confirmationState, setConfirmationState] = useState<{
    sourceText: string
    draft: VoiceTransactionDraft
  } | null>(null)

  const handleTranscript = useCallback((text: string) => {
    setInputText(text)
    setInputSource('voice')
  }, [])

  const { isListening, interimText, error, start, stop } = useVoiceInput({
    onFinalText: handleTranscript,
    continuous: false,
  })

  const handleMicClick = () => {
    if (isListening) {
      stop()
    } else {
      setSubmitError(null)
      start()
    }
  }

  const handleSubmit = async () => {
    if (!inputText.trim()) {
      setSubmitError('请输入记账内容')
      return
    }

    setIsSubmitting(true)
    setSubmitError(null)

    try {
      const result = await transactionApi.submitVoiceText({
        text: inputText.trim(),
        source: inputSource,
      })

      if (result.status === 'failed') {
        setSubmitError('转换失败，请重试或手动输入')
        return
      }

      if (result.status === 'needs_confirmation') {
        const [firstDraft] = result.drafts
        if (!firstDraft) {
          setSubmitError('未能生成可确认的交易，请重试')
          return
        }
        setConfirmationState({
          sourceText: result.sourceText,
          draft: firstDraft,
        })
        return
      }

      setInputText('')
      setInputSource('manual')
      setShowSuccess(true)
      onSuccess?.()

      setTimeout(() => setShowSuccess(false), 2000)
    } catch {
      setSubmitError('记账失败，请重试')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleConfirm = async (data: CreateTransactionFormData) => {
    if (!confirmationState) return

    setSubmitError(null)
    await transactionApi.confirmVoiceTransaction({
      sourceText: confirmationState.sourceText,
      drafts: [{
        type: data.type,
        amount: data.amount,
        category: data.category,
        note: data.note,
        occurredAt: data.created_at,
        confidence: confirmationState.draft.confidence,
        missingFields: [],
      }],
    })

    setConfirmationState(null)
    setInputText('')
    setInputSource('manual')
    setShowSuccess(true)
    onSuccess?.()
    setTimeout(() => setShowSuccess(false), 2000)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const displayText = interimText || inputText
  const isProcessing = isListening || isSubmitting

  return (
    <div className="flex flex-col gap-3">
      {/* Input Row */}
      <div className="flex items-center gap-2">
        {/* Text Input */}
        <div className="flex-1 relative">
          <input
            type="text"
            value={displayText}
            onChange={(e) => {
              setInputText(e.target.value)
              setInputSource('manual')
            }}
            onKeyDown={handleKeyDown}
            placeholder="今天午餐花了50元"
            disabled={disabled || isProcessing}
            className={`
              w-full h-12 px-4 pr-12 rounded-xl
              bg-gray-100 dark:bg-gray-800
              border-2 border-transparent
              text-gray-900 dark:text-white
              placeholder-gray-400 dark:placeholder-gray-500
              transition-all duration-200
              focus:outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-gray-700
              disabled:opacity-50 disabled:cursor-not-allowed
              ${isListening ? 'border-red-400 bg-red-50 dark:bg-red-900/20' : ''}
            `}
            aria-label="记账内容输入框"
          />
          {/* Clear button */}
          {inputText && !isProcessing && (
            <button
              type="button"
              onClick={() => {
                setInputText('')
                setInputSource('manual')
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              aria-label="清空输入"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Mic Button */}
        <button
          type="button"
          onClick={handleMicClick}
          disabled={disabled || isSubmitting}
          className={`
            w-12 h-12 rounded-xl flex items-center justify-center
            transition-all duration-200
            ${isListening
              ? 'bg-red-500 animate-pulse'
              : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'
            }
            ${disabled || isSubmitting ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
          `}
          aria-label={isListening ? '停止录音' : '开始语音输入'}
        >
          {isListening ? (
            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
              <rect x="6" y="6" width="12" height="12" rx="2" />
            </svg>
          ) : (
            <svg className="w-6 h-6 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          )}
        </button>

        {/* Submit Button */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={disabled || isProcessing || !inputText.trim()}
          className={`
            h-12 px-5 rounded-xl font-medium
            transition-all duration-200
            ${inputText.trim() && !isProcessing
              ? 'bg-blue-500 text-white hover:bg-blue-600 active:scale-95'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
            }
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
          `}
          aria-label="提交记账"
        >
          {isSubmitting ? (
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          ) : (
            '提交'
          )}
        </button>
      </div>

      {/* Status Row */}
      <div className="flex items-center justify-between px-1 min-h-[20px]">
        {/* Listening indicator */}
        {isListening && (
          <p className="text-sm text-red-500 animate-pulse">正在聆听...</p>
        )}

        {/* Interim text */}
        {!isListening && interimText && (
          <p className="text-sm text-gray-500 truncate">{interimText}</p>
        )}

        {/* Success message */}
        {showSuccess && (
          <p className="text-sm text-green-600 dark:text-green-400">记账成功！</p>
        )}

        {/* Error message */}
        {(error || submitError) && (
          <p className="text-sm text-red-500">{error || submitError}</p>
        )}
      </div>

      {confirmationState && (
        <TransactionConfirmDialog
          isOpen
          onClose={() => setConfirmationState(null)}
          onConfirm={handleConfirm}
          rawText={confirmationState.sourceText}
          suggestedTransaction={{
            type: confirmationState.draft.type,
            amount: confirmationState.draft.amount ?? 0,
            category: confirmationState.draft.category ?? '其他',
            note: confirmationState.draft.note,
          }}
        />
      )}
    </div>
  )
}
