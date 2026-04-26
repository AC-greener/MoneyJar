import { drizzle } from "drizzle-orm/d1";
import { TransactionService } from "./transaction.service";
import type { Plan } from "../types/user";
import type {
  VoiceTransactionConfirmInput,
  VoiceTransactionDraft,
  VoiceTransactionSubmitInput,
  VoiceTransactionSubmitResponse,
} from "../types/voice-transaction";
import { VoiceTransactionDraftSchema } from "../types/voice-transaction";
import { z } from "zod";

const AUTO_COMMIT_CONFIDENCE_THRESHOLD = 0.85;
const DEFAULT_AI_MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";
const WorkersAiParseResponseSchema = z.object({
  drafts: z.array(VoiceTransactionDraftSchema).default([]),
});

const CATEGORY_KEYWORDS: Array<{
  category: string;
  type: "income" | "expense";
  keywords: string[];
}> = [
  { category: "工资", type: "income", keywords: ["工资", "薪水", "月薪", "奖金", "收入", "报销", "发工资", "发薪", "工资到账"] },
  {
    category: "餐饮",
    type: "expense",
    keywords: [
      "午饭", "晚饭", "早餐", "夜宵", "吃饭", "外卖", "奶茶", "咖啡", "面", "面条", "拉面",
      "米线", "米粉", "粉", "包子", "饺子", "馄饨", "盖饭", "快餐", "汉堡", "炸鸡", "火锅", "烧烤",
    ],
  },
  {
    category: "交通",
    type: "expense",
    keywords: ["地铁", "公交", "打车", "滴滴", "出租车", "网约车", "高铁", "火车票", "机票", "停车费", "过路费", "加油"],
  },
  {
    category: "生鲜",
    type: "expense",
    keywords: ["买菜", "菜场", "菜市场", "蔬菜", "水果", "生鲜", "肉", "鸡蛋", "海鲜", "食材"],
  },
  {
    category: "购物",
    type: "expense",
    keywords: ["购物", "超市", "淘宝", "京东", "拼多多", "买衣服", "衣服", "鞋", "纸巾", "牙膏", "洗发水", "日用品", "生活用品"],
  },
  { category: "娱乐", type: "expense", keywords: ["电影", "KTV", "唱歌", "游戏", "门票", "桌游", "演出", "网吧"] },
  { category: "医疗", type: "expense", keywords: ["医院", "药店", "挂号", "看病", "买药", "门诊", "检查", "体检", "感冒药"] },
  { category: "投资", type: "expense", keywords: ["基金", "股票", "理财", "定投", "加仓", "买基", "申购"] },
];

type ParseAiMetadata = {
  parsed: boolean;
  model: string;
  processingTime: number;
};

type ParsedVoiceResult = {
  sourceText: string;
  drafts: VoiceTransactionDraft[];
  status: "ready_to_commit" | "needs_confirmation" | "failed";
  aiMeta: ParseAiMetadata;
};

type AiRunResult = {
  response?: string;
};

export class VoiceTransactionService {
  private transactionService: TransactionService;

  constructor(private env: CloudflareBindings) {
    const db = drizzle(env.DB);
    this.transactionService = new TransactionService(db);
  }

  async submit(
    input: VoiceTransactionSubmitInput,
    userId: string,
    plan: Plan
  ): Promise<VoiceTransactionSubmitResponse & { aiMeta: ParseAiMetadata }> {
    const parsed = await this.parseText(input);

    if (parsed.status === "failed") {
      return {
        status: "failed",
        sourceText: parsed.sourceText,
        error: "PARSE_FAILED",
        drafts: parsed.drafts,
        aiMeta: parsed.aiMeta,
      };
    }

    if (parsed.status === "needs_confirmation") {
      return {
        status: "needs_confirmation",
        sourceText: parsed.sourceText,
        drafts: parsed.drafts,
        aiMeta: parsed.aiMeta,
      };
    }

    const committedTransactions = await this.commitDrafts(parsed.drafts, userId, plan);
    return {
      status: "ready_to_commit",
      sourceText: parsed.sourceText,
      drafts: parsed.drafts,
      committedTransactions,
      aiMeta: parsed.aiMeta,
    };
  }

  async confirm(
    input: VoiceTransactionConfirmInput,
    userId: string,
    plan: Plan
  ): Promise<VoiceTransactionSubmitResponse & { aiMeta: ParseAiMetadata }> {
    const drafts = input.drafts.map((draft) => ({
      ...draft,
      missingFields: [],
      confidence: Math.max(draft.confidence, AUTO_COMMIT_CONFIDENCE_THRESHOLD),
    }));

    const committedTransactions = await this.commitDrafts(drafts, userId, plan);
    return {
      status: "ready_to_commit",
      sourceText: input.sourceText,
      drafts,
      committedTransactions,
      aiMeta: {
        parsed: true,
        model: "client-confirmed",
        processingTime: 0,
      },
    };
  }

  private async parseText(input: VoiceTransactionSubmitInput): Promise<ParsedVoiceResult> {
    const start = Date.now();
    const aiBinding = this.getAiBinding();

    if (aiBinding) {
      try {
        const drafts = await this.parseWithWorkersAi(aiBinding, input);
        return {
          sourceText: input.text,
          drafts,
          status: this.classifyDrafts(drafts),
          aiMeta: {
            parsed: true,
            model: DEFAULT_AI_MODEL,
            processingTime: Date.now() - start,
          },
        };
      } catch (error) {
        console.warn("Workers AI parse failed, falling back to heuristic parser", error);
      }
    }

    const drafts = this.parseWithHeuristics(input.text);
    return {
      sourceText: input.text,
      drafts,
      status: this.classifyDrafts(drafts),
      aiMeta: {
        parsed: true,
        model: "heuristic-fallback",
        processingTime: Date.now() - start,
      },
    };
  }

  private getAiBinding(): Ai | null {
    if (this.env.WORKERS_AI_ENABLED !== "true") {
      return null;
    }

    try {
      return this.env.AI ?? null;
    } catch {
      return null;
    }
  }

  private async parseWithWorkersAi(ai: Ai, input: VoiceTransactionSubmitInput): Promise<VoiceTransactionDraft[]> {
    const prompt = [
      "You are a bookkeeping parser.",
      "Convert the user's bookkeeping text into JSON only.",
      "Return an object: {\"drafts\":[{\"type\":\"income|expense\",\"amount\":number|null,\"category\":string|null,\"note\":string,\"occurredAt\":string|null,\"confidence\":number,\"missingFields\":[\"type\"|\"amount\"|\"category\"]}]}",
      "If the text is not bookkeeping intent, return {\"drafts\":[]}.",
      `Locale: ${input.locale ?? "unknown"}`,
      `Timezone: ${input.timezone ?? "unknown"}`,
      `Source: ${input.source ?? "voice"}`,
      `Text: ${input.text}`,
    ].join("\n");

    const result = (await ai.run(DEFAULT_AI_MODEL, {
      prompt,
      max_tokens: 512,
      temperature: 0.1,
    })) as AiRunResult;

    const responseText = result.response?.trim();
    if (!responseText) {
      throw new Error("Workers AI returned empty response");
    }

    const parsed = WorkersAiParseResponseSchema.parse(JSON.parse(responseText));
    return parsed.drafts.map((draft) => this.normalizeDraft(draft));
  }

  private parseWithHeuristics(text: string): VoiceTransactionDraft[] {
    const segments = text
      .split(/[，,、；;]+/)
      .map((segment) => segment.trim())
      .filter(Boolean);

    return segments
      .map((segment) => this.parseSegment(segment))
      .filter((draft): draft is VoiceTransactionDraft => draft !== null);
  }

  private parseSegment(segment: string): VoiceTransactionDraft | null {
    const amountMatch = segment.match(/(\d+(?:\.\d+)?)/);
    const amount = amountMatch ? Number(amountMatch[1]) : undefined;

    const keywordMatch = CATEGORY_KEYWORDS.find(({ keywords }) =>
      keywords.some((keyword) => segment.includes(keyword))
    );

    const inferredType =
      keywordMatch?.type ??
      (/(收入|工资|报销|奖金|进账|收了)/.test(segment) ? "income" : undefined) ??
      (/(花|买|支出|消费|付了|用了|充了)/.test(segment) ? "expense" : undefined) ??
      (amount !== undefined ? "expense" : undefined);

    const inferredCategory = keywordMatch?.category ?? (inferredType === "expense" ? "其他" : undefined);

    if (!amount && !keywordMatch && !inferredType) {
      return null;
    }

    const missingFields: Array<"type" | "amount" | "category"> = [];
    if (!inferredType) missingFields.push("type");
    if (amount === undefined) missingFields.push("amount");
    if (!inferredCategory) missingFields.push("category");

    let confidence = 0.55;
    if (amount !== undefined) confidence += 0.2;
    if (keywordMatch) confidence += 0.2;
    if (inferredType) confidence += 0.05;
    confidence = Math.min(confidence, 0.99);
    if (missingFields.length > 0) {
      confidence = Math.min(confidence, 0.72);
    }

    return this.normalizeDraft({
      type: inferredType ?? "expense",
      amount,
      category: inferredCategory,
      note: segment,
      occurredAt: undefined,
      confidence,
      missingFields,
    });
  }

  private classifyDrafts(drafts: VoiceTransactionDraft[]): ParsedVoiceResult["status"] {
    if (drafts.length === 0) {
      return "failed";
    }

    const needsConfirmation = drafts.some(
      (draft) =>
        draft.missingFields.length > 0 || draft.confidence < AUTO_COMMIT_CONFIDENCE_THRESHOLD
    );

    return needsConfirmation ? "needs_confirmation" : "ready_to_commit";
  }

  private normalizeDraft(draft: VoiceTransactionDraft): VoiceTransactionDraft {
    return {
      type: draft.type,
      amount: draft.amount,
      category: draft.category,
      note: draft.note?.slice(0, 256),
      occurredAt: draft.occurredAt,
      confidence: Number(draft.confidence.toFixed(2)),
      missingFields: draft.missingFields ?? [],
    };
  }

  private async commitDrafts(
    drafts: VoiceTransactionDraft[],
    userId: string,
    plan: Plan
  ) {
    const committedTransactions: Array<{
      id: number;
      type: "income" | "expense";
      amount: number;
      category: string;
      note: string | null;
      createdAt: string;
    }> = [];

    for (const draft of drafts) {
      if (!draft.amount || !draft.category) {
        throw new Error("Cannot commit incomplete draft");
      }

      const committed = await this.transactionService.create(
        {
          type: draft.type,
          amount: draft.amount,
          category: draft.category,
          note: draft.note,
          created_at: draft.occurredAt,
        },
        userId,
        plan
      );

      committedTransactions.push({
        id: committed.id,
        type: draft.type,
        amount: committed.amount,
        category: committed.category,
        note: committed.note,
        createdAt: committed.createdAt,
      });
    }

    return committedTransactions;
  }
}
