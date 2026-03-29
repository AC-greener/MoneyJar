import { z } from 'zod';

export const McpAuthHeaderSchema = z.string().startsWith('Bearer ');

export const McpCreateTransactionSchema = z.object({
  type: z.enum(['income', 'expense']),
  amount: z.coerce.number().positive(),
  category: z.string().min(1).max(50),
  note: z.string().max(256).optional(),
});

export const McpTransactionIdSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const McpPeriodSchema = z.enum(['week', 'month']);

export const DEFAULT_MCP_LIST_LIMIT = 20;
export const MAX_MCP_LIST_LIMIT = 100;

export const McpListTransactionsSchema = z.object({
  period: McpPeriodSchema.optional(),
  limit: z.coerce.number().int().positive().max(MAX_MCP_LIST_LIMIT).default(DEFAULT_MCP_LIST_LIMIT),
});

export const McpBalanceReportSchema = z.object({
  period: McpPeriodSchema,
});

export type McpCreateTransactionInput = z.infer<typeof McpCreateTransactionSchema>;
export type McpTransactionIdInput = z.infer<typeof McpTransactionIdSchema>;
export type McpListTransactionsInput = z.infer<typeof McpListTransactionsSchema>;
export type McpBalanceReportInput = z.infer<typeof McpBalanceReportSchema>;
