import { z } from 'zod';

export const CreateTransactionSchema = z.object({
  type: z.enum(['income', 'expense']),
  amount: z.number().positive(),
  category: z.string().min(1).max(50),
  note: z.string().max(256).optional(),
  created_at: z.string().optional(),
});

export const TransactionResponseSchema = z.object({
  id: z.number(),
  type: z.enum(['income', 'expense']),
  amount: z.number(),
  category: z.string(),
  note: z.string().nullable(),
  createdAt: z.string(),
});

export const TransactionListResponseSchema = z.array(TransactionResponseSchema);

export const PeriodQuerySchema = z.object({
  period: z.enum(['week', 'month']).optional(),
});

export type CreateTransactionInput = z.infer<typeof CreateTransactionSchema>;
export type TransactionResponse = z.infer<typeof TransactionResponseSchema>;
export type PeriodQuery = z.infer<typeof PeriodQuerySchema>;
