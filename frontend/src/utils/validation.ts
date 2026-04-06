import { z } from 'zod'

export const CreateTransactionSchema = z.object({
  type: z.enum(['income', 'expense'], {
    error: '请选择交易类型',
  }),
  amount: z.number().positive('金额必须为正数'),
  category: z.string().min(1, '请选择分类').max(50),
  note: z.string().max(256).optional(),
  created_at: z.string().optional(),
})

export const LoginSchema = z.object({
  id_token: z.string().min(1),
})

export const RefreshTokenSchema = z.object({
  refresh_token: z.string().min(1),
})

export type CreateTransactionFormData = z.infer<typeof CreateTransactionSchema>
