import { z } from "zod";

export const VoiceEntrySourceSchema = z.enum(["voice", "manual"]).default("voice");

export const VoiceTransactionSubmitSchema = z.object({
  text: z.string().trim().min(1).max(500),
  source: VoiceEntrySourceSchema.optional(),
  locale: z.string().min(2).max(20).optional(),
  timezone: z.string().min(1).max(64).optional(),
});

export const VoiceTransactionDraftSchema = z.object({
  type: z.enum(["income", "expense"]),
  amount: z.number().positive().optional(),
  category: z.string().min(1).max(50).optional(),
  note: z.string().max(256).optional(),
  occurredAt: z.string().optional(),
  confidence: z.number().min(0).max(1),
  missingFields: z.array(z.enum(["type", "amount", "category"])),
});

export const VoiceTransactionConfirmSchema = z.object({
  sourceText: z.string().trim().min(1).max(500),
  drafts: z.array(
    VoiceTransactionDraftSchema.extend({
      amount: z.number().positive(),
      category: z.string().min(1).max(50),
    })
  ).min(1),
});

export const VoiceCommittedTransactionSchema = z.object({
  id: z.number(),
  type: z.enum(["income", "expense"]),
  amount: z.number(),
  category: z.string(),
  note: z.string().nullable(),
  createdAt: z.string(),
});

export const VoiceTransactionReadySchema = z.object({
  status: z.literal("ready_to_commit"),
  sourceText: z.string(),
  drafts: z.array(VoiceTransactionDraftSchema),
  committedTransactions: z.array(VoiceCommittedTransactionSchema),
});

export const VoiceTransactionNeedsConfirmationSchema = z.object({
  status: z.literal("needs_confirmation"),
  sourceText: z.string(),
  drafts: z.array(VoiceTransactionDraftSchema),
});

export const VoiceTransactionFailedSchema = z.object({
  status: z.literal("failed"),
  sourceText: z.string(),
  error: z.enum(["PARSE_FAILED"]),
  drafts: z.array(VoiceTransactionDraftSchema).default([]),
});

export const VoiceTransactionSubmitResponseSchema = z.union([
  VoiceTransactionReadySchema,
  VoiceTransactionNeedsConfirmationSchema,
  VoiceTransactionFailedSchema,
]);

export type VoiceTransactionSubmitInput = z.infer<typeof VoiceTransactionSubmitSchema>;
export type VoiceTransactionDraft = z.infer<typeof VoiceTransactionDraftSchema>;
export type VoiceTransactionConfirmInput = z.infer<typeof VoiceTransactionConfirmSchema>;
export type VoiceTransactionSubmitResponse = z.infer<typeof VoiceTransactionSubmitResponseSchema>;
