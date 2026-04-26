import { beforeAll, describe, expect, it } from "vitest";
import { createExecutionContext } from "cloudflare:test";
import worker from "../../src/index";
import {
  createBearerToken,
  seedUser,
  setupIntegrationDb,
  workerEnv,
} from "../helpers/integration";

const TEST_USER_ID = "f47ac10b-58cc-4372-a567-0e02b2c3d099";
let testToken = "";

type VoiceSubmitResponse =
  | {
      status: "ready_to_commit";
      sourceText: string;
      drafts: Array<{ amount: number; type: "income" | "expense"; category: string }>;
      committedTransactions: Array<{ id: number }>;
    }
  | {
      status: "needs_confirmation";
      sourceText: string;
      drafts: Array<{ missingFields: string[] }>;
    }
  | {
      status: "failed";
      sourceText: string;
      error: string;
    };

function createJsonRequest(path: string, method: string, body?: unknown) {
  const url = new URL(path, "http://localhost");
  const headers: Record<string, string> = {
    Authorization: testToken,
  };
  const init: RequestInit = { method, headers };

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    init.body = JSON.stringify(body);
  }

  return new Request(url.toString(), init);
}

beforeAll(async () => {
  await setupIntegrationDb("voice-transaction-test-setup");
  const user = await seedUser({
    id: TEST_USER_ID,
    email: "voice-test@moneyjar.test",
    googleId: "google-voice-test-001",
    name: "测试用户",
  });

  testToken = await createBearerToken(user);
});

describe("POST /api/transactions/voice/submit", () => {
  it("commits a high-confidence single-entry parse", async () => {
    const ctx = createExecutionContext();
    const res = await worker.fetch(
      createJsonRequest("/api/transactions/voice/submit", "POST", {
        text: "今天午饭50元",
        source: "voice",
        locale: "zh-CN",
        timezone: "Asia/Shanghai",
      }),
      workerEnv({ WORKERS_AI_ENABLED: "false" }),
      ctx
    );

    expect(res.status).toBe(201);
    const json = (await res.json()) as VoiceSubmitResponse;
    expect(json.status).toBe("ready_to_commit");
    if (json.status !== "ready_to_commit") {
      throw new Error("expected ready_to_commit");
    }

    expect(json.drafts).toHaveLength(1);
    expect(json.drafts[0]).toMatchObject({
      amount: 50,
      type: "expense",
      category: "餐饮",
    });
    expect(json.committedTransactions).toHaveLength(1);
  });

  it("commits a high-confidence multi-entry parse", async () => {
    const ctx = createExecutionContext();
    const res = await worker.fetch(
      createJsonRequest("/api/transactions/voice/submit", "POST", {
        text: "午饭50，地铁6",
        source: "voice",
      }),
      workerEnv({ WORKERS_AI_ENABLED: "false" }),
      ctx
    );

    expect(res.status).toBe(201);
    const json = (await res.json()) as VoiceSubmitResponse;
    expect(json.status).toBe("ready_to_commit");
    if (json.status !== "ready_to_commit") {
      throw new Error("expected ready_to_commit");
    }

    expect(json.drafts).toHaveLength(2);
    expect(json.committedTransactions).toHaveLength(2);
  });

  it("commits common spoken food nouns without opening confirmation", async () => {
    const ctx = createExecutionContext();
    const res = await worker.fetch(
      createJsonRequest("/api/transactions/voice/submit", "POST", {
        text: "今天买面花了19块",
        source: "manual",
      }),
      workerEnv({ WORKERS_AI_ENABLED: "false" }),
      ctx
    );

    expect(res.status).toBe(201);
    const json = (await res.json()) as VoiceSubmitResponse;
    expect(json.status).toBe("ready_to_commit");
    if (json.status !== "ready_to_commit") {
      throw new Error("expected ready_to_commit");
    }

    expect(json.drafts[0]).toMatchObject({
      amount: 19,
      type: "expense",
      category: "餐饮",
    });
    expect(json.committedTransactions).toHaveLength(1);
  });

  it("maps common medicine purchases to medical instead of generic shopping", async () => {
    const ctx = createExecutionContext();
    const res = await worker.fetch(
      createJsonRequest("/api/transactions/voice/submit", "POST", {
        text: "买药花了36元",
        source: "manual",
      }),
      workerEnv({ WORKERS_AI_ENABLED: "false" }),
      ctx
    );

    expect(res.status).toBe(201);
    const json = (await res.json()) as VoiceSubmitResponse;
    expect(json.status).toBe("ready_to_commit");
    if (json.status !== "ready_to_commit") {
      throw new Error("expected ready_to_commit");
    }

    expect(json.drafts[0]).toMatchObject({
      amount: 36,
      type: "expense",
      category: "医疗",
    });
  });

  it("returns confirmation-required drafts when required fields are missing", async () => {
    const ctx = createExecutionContext();
    const res = await worker.fetch(
      createJsonRequest("/api/transactions/voice/submit", "POST", {
        text: "买菜",
        source: "manual",
      }),
      workerEnv({ WORKERS_AI_ENABLED: "false" }),
      ctx
    );

    expect(res.status).toBe(200);
    const json = (await res.json()) as VoiceSubmitResponse;
    expect(json.status).toBe("needs_confirmation");
    if (json.status !== "needs_confirmation") {
      throw new Error("expected needs_confirmation");
    }

    expect(json.sourceText).toBe("买菜");
    expect(json.drafts[0].missingFields).toContain("amount");
  });

  it("fails safely when text cannot be interpreted as bookkeeping intent", async () => {
    const ctx = createExecutionContext();
    const res = await worker.fetch(
      createJsonRequest("/api/transactions/voice/submit", "POST", {
        text: "今天天气真不错",
      }),
      workerEnv({ WORKERS_AI_ENABLED: "false" }),
      ctx
    );

    expect(res.status).toBe(422);
    const json = (await res.json()) as VoiceSubmitResponse;
    expect(json.status).toBe("failed");
    if (json.status !== "failed") {
      throw new Error("expected failed");
    }

    expect(json.sourceText).toBe("今天天气真不错");
  });
});

describe("POST /api/transactions/voice/confirm", () => {
  it("creates transactions after client confirmation", async () => {
    const ctx = createExecutionContext();
    const res = await worker.fetch(
      createJsonRequest("/api/transactions/voice/confirm", "POST", {
        sourceText: "买菜",
        drafts: [
          {
            type: "expense",
            amount: 88,
            category: "生鲜",
            note: "买菜",
            confidence: 0.62,
            missingFields: [],
          },
        ],
      }),
      workerEnv({ WORKERS_AI_ENABLED: "false" }),
      ctx
    );

    expect(res.status).toBe(201);
    const json = (await res.json()) as {
      status: "ready_to_commit";
      committedTransactions: Array<{ id: number; amount: number; category: string }>;
    };
    expect(json.status).toBe("ready_to_commit");
    expect(json.committedTransactions).toHaveLength(1);
    expect(json.committedTransactions[0]).toMatchObject({
      amount: 88,
      category: "生鲜",
    });
  });
});
