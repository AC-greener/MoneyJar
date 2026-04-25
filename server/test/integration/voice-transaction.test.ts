import { beforeAll, describe, expect, it } from "vitest";
import {
  applyD1Migrations,
  createExecutionContext,
  env,
  type D1Migration,
} from "cloudflare:test";
import worker from "../../src/index";
import { signJwt } from "../../src/services/auth.service";

const CREATE_USERS_TABLE = `CREATE TABLE IF NOT EXISTS "users" (
  "id" text PRIMARY KEY NOT NULL,
  "email" text NOT NULL,
  "name" text,
  "avatar_url" text,
  "plan" text NOT NULL DEFAULT 'free',
  "plan_started_at" text,
  "plan_expires_at" text,
  "google_id" text NOT NULL,
  "created_at" text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updated_at" text DEFAULT CURRENT_TIMESTAMP NOT NULL
)`;
const CREATE_USERS_EMAIL_UNIQUE = `CREATE UNIQUE INDEX IF NOT EXISTS "users_email_unique" ON "users" ("email")`;
const CREATE_USERS_GOOGLE_UNIQUE = `CREATE UNIQUE INDEX IF NOT EXISTS "users_google_id_unique" ON "users" ("google_id")`;
const CREATE_TRANSACTIONS_TABLE = `CREATE TABLE IF NOT EXISTS "transactions" (
  "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  "user_id" text,
  "type" text(20) NOT NULL,
  "amount" real NOT NULL,
  "category" text(50) NOT NULL,
  "note" text(256),
  "created_at" text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "deleted_at" text
)`;
const CREATE_IDX_TRANSACTIONS_USER = `CREATE INDEX IF NOT EXISTS "idx_transactions_user_id" ON "transactions" ("user_id")`;
const CREATE_REQUEST_LOGS_TABLE = `CREATE TABLE IF NOT EXISTS "request_logs" (
  "id" text PRIMARY KEY,
  "request_path" text NOT NULL,
  "request_method" text NOT NULL,
  "status_code" integer NOT NULL,
  "duration" integer NOT NULL,
  "request_body" text,
  "response_body" text,
  "error_message" text,
  "client_ip" text,
  "user_agent" text,
  "timestamp" integer NOT NULL,
  "ai_parsed" integer,
  "ai_model" text,
  "ai_processing_time" integer
)`;
const CREATE_REFRESH_TOKENS_TABLE = `CREATE TABLE IF NOT EXISTS "refresh_tokens" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL,
  "token" text NOT NULL,
  "expires_at" text NOT NULL,
  "created_at" text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "revoked" integer NOT NULL DEFAULT 0,
  FOREIGN KEY ("user_id") REFERENCES "users"("id")
)`;
const CREATE_IDX_REFRESH_TOKEN = `CREATE UNIQUE INDEX IF NOT EXISTS "idx_refresh_token" ON "refresh_tokens" ("token")`;
const CREATE_FEATURE_FLAGS_TABLE = `CREATE TABLE IF NOT EXISTS "feature_flags" (
  "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  "feature_key" text NOT NULL,
  "min_plan" text NOT NULL DEFAULT 'free',
  "enabled" integer NOT NULL DEFAULT 1,
  "description" text
)`;
const CREATE_IDX_FEATURE_KEY = `CREATE UNIQUE INDEX IF NOT EXISTS "idx_feature_key" ON "feature_flags" ("feature_key")`;
const CREATE_API_TOKENS_TABLE = `CREATE TABLE IF NOT EXISTS "api_tokens" (
  "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  "token" text NOT NULL,
  "name" text NOT NULL,
  "type" text(10) NOT NULL,
  "created_at" text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "expires_at" text
)`;

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

async function setupD1() {
  const migration: D1Migration = {
    name: "0000_voice_transaction",
    queries: [
      CREATE_USERS_TABLE,
      CREATE_USERS_EMAIL_UNIQUE,
      CREATE_USERS_GOOGLE_UNIQUE,
      CREATE_REFRESH_TOKENS_TABLE,
      CREATE_IDX_REFRESH_TOKEN,
      CREATE_FEATURE_FLAGS_TABLE,
      CREATE_IDX_FEATURE_KEY,
      CREATE_TRANSACTIONS_TABLE,
      CREATE_IDX_TRANSACTIONS_USER,
      CREATE_REQUEST_LOGS_TABLE,
      CREATE_API_TOKENS_TABLE,
    ],
  };

  await applyD1Migrations(env.DB, [migration]);
}

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
  await setupD1();
  const bindings = env as typeof env & CloudflareBindings;
  await env.DB.prepare(
    `INSERT OR IGNORE INTO users (id, email, google_id, plan, name) VALUES (?, ?, ?, 'free', '测试用户')`
  )
    .bind(TEST_USER_ID, "voice-test@moneyjar.test", "google-voice-test-001")
    .run();

  testToken = `Bearer ${await signJwt(
    { sub: TEST_USER_ID, email: "voice-test@moneyjar.test", plan: "free" },
    bindings.JWT_SECRET
  )}`;
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
      env,
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
      env,
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
      env,
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
      env,
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
      env,
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
      env,
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
      env,
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
