import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Modal } from '@/components/common/Modal'
import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { CreateTransactionSchema, type CreateTransactionFormData } from '@/utils/validation'
import { formatCurrency } from '@/utils/format'
import { DEFAULT_CATEGORIES } from '@/types/api'

interface TransactionConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (data: CreateTransactionFormData) => Promise<void>
  rawText: string
  suggestedTransaction: {
    type: 'income' | 'expense'
    amount: number
    category: string
    note?: string
  }
}

export function TransactionConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  rawText,
  suggestedTransaction,
}: TransactionConfirmDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateTransactionFormData>({
    resolver: zodResolver(CreateTransactionSchema),
    defaultValues: {
      type: suggestedTransaction.type,
      amount: suggestedTransaction.amount,
      category: suggestedTransaction.category,
      note: suggestedTransaction.note || '',
    },
  })

  const watchedType = watch('type')
  const watchedAmount = watch('amount')
  const watchedCategory = watch('category')

  const onSubmit = async (data: CreateTransactionFormData) => {
    setIsSubmitting(true)
    try {
      await onConfirm(data)
      onClose()
    } catch {
      // Error handled by parent
    } finally {
      setIsSubmitting(false)
    }
  }

  const category = DEFAULT_CATEGORIES.find((c) => c.name === watchedCategory)

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="确认交易">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Original Voice Text */}
        <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
          <p className="text-xs text-gray-500 mb-1">你说的：</p>
          <p className="text-gray-800 dark:text-gray-200">{rawText}</p>
        </div>

        {/* Transaction Type */}
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            类型
          </label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                value="expense"
                {...register('type')}
                className="w-4 h-4 text-blue-500"
              />
              <span className="text-red-500">支出</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                value="income"
                {...register('type')}
                className="w-4 h-4 text-blue-500"
              />
              <span className="text-green-500">收入</span>
            </label>
          </div>
          {errors.type && (
            <p className="text-sm text-red-500">{errors.type.message}</p>
          )}
        </div>

        {/* Amount */}
        <Input
          label="金额"
          type="number"
          step="0.01"
          {...register('amount', { valueAsNumber: true })}
          error={errors.amount?.message}
        />

        {/* Category */}
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            分类
          </label>
          <div className="grid grid-cols-4 gap-2">
            {DEFAULT_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setValue('category', cat.name, { shouldValidate: true })}
                className={`p-2 rounded-lg text-center transition-colors ${
                  watchedCategory === cat.name
                    ? 'bg-blue-100 dark:bg-blue-900/30 ring-2 ring-blue-500'
                    : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                <span className="text-xl">{cat.icon}</span>
                <span className="block text-xs mt-1">{cat.name}</span>
              </button>
            ))}
          </div>
          {errors.category && (
            <p className="text-sm text-red-500">{errors.category.message}</p>
          )}
        </div>

        {/* Note */}
        <Input
          label="备注 (可选)"
          placeholder="添加备注..."
          {...register('note')}
          error={errors.note?.message}
        />

        {/* Preview */}
        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 flex items-center justify-center bg-gray-200 dark:bg-gray-700 rounded-full text-2xl">
              {category?.icon || '📦'}
            </div>
            <div className="flex-1">
              <p className="font-medium text-gray-900 dark:text-white">
                {watchedCategory || '未选择分类'}
              </p>
              <p className="text-sm text-gray-500">
                {watchedType === 'expense' ? '支出' : '收入'}
              </p>
            </div>
            <div className={`text-xl font-bold ${watchedType === 'expense' ? 'text-red-500' : 'text-green-500'}`}>
              {watchedAmount > 0 ? formatCurrency(watchedAmount) : '¥0.00'}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
            取消
          </Button>
          <Button type="submit" disabled={isSubmitting} className="flex-1">
            {isSubmitting ? '保存中...' : '确认'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
