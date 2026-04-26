import { applyD1Migrations, env, type D1Migration } from 'cloudflare:test';
import { signJwt } from '../../src/services/auth.service';
import type { Plan } from '../../src/types/user';

export type TestEnvironment = Omit<CloudflareBindings, 'ENVIRONMENT'> & {
  ENVIRONMENT?: 'development' | 'staging' | 'production';
};

export const testEnv = env as TestEnvironment;

const SCHEMA_QUERIES = [
  `CREATE TABLE IF NOT EXISTS "users" (
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
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "users_email_unique" ON "users" ("email")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "users_google_id_unique" ON "users" ("google_id")`,
  `CREATE TABLE IF NOT EXISTS "refresh_tokens" (
    "id" text PRIMARY KEY NOT NULL,
    "user_id" text NOT NULL,
    "token" text NOT NULL,
    "expires_at" text NOT NULL,
    "created_at" text DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "revoked" integer NOT NULL DEFAULT 0,
    FOREIGN KEY ("user_id") REFERENCES "users"("id")
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "idx_refresh_token" ON "refresh_tokens" ("token")`,
  `CREATE TABLE IF NOT EXISTS "feature_flags" (
    "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    "feature_key" text NOT NULL,
    "min_plan" text NOT NULL DEFAULT 'free',
    "enabled" integer NOT NULL DEFAULT 1,
    "description" text
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "idx_feature_key" ON "feature_flags" ("feature_key")`,
  `CREATE TABLE IF NOT EXISTS "transactions" (
    "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    "user_id" text,
    "type" text(20) NOT NULL,
    "amount" real NOT NULL,
    "category" text(50) NOT NULL,
    "note" text(256),
    "created_at" text DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "deleted_at" text,
    FOREIGN KEY ("user_id") REFERENCES "users"("id")
  )`,
  `CREATE INDEX IF NOT EXISTS "idx_transactions_user_id" ON "transactions" ("user_id")`,
  `CREATE TABLE IF NOT EXISTS "api_tokens" (
    "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    "token" text NOT NULL,
    "name" text NOT NULL,
    "type" text(10) NOT NULL,
    "created_at" text DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "expires_at" text
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "idx_token" ON "api_tokens" ("token")`,
  `CREATE TABLE IF NOT EXISTS "oauth_states" (
    "id" text PRIMARY KEY NOT NULL,
    "state" text NOT NULL,
    "return_to" text NOT NULL DEFAULT '/',
    "created_at" text DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "expires_at" text NOT NULL,
    "used_at" text
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "idx_oauth_state" ON "oauth_states" ("state")`,
  `CREATE TABLE IF NOT EXISTS "login_exchange_tokens" (
    "id" text PRIMARY KEY NOT NULL,
    "code" text NOT NULL,
    "user_id" text NOT NULL,
    "access_token" text NOT NULL,
    "refresh_token" text NOT NULL,
    "created_at" text DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "expires_at" text NOT NULL,
    "used_at" text,
    FOREIGN KEY ("user_id") REFERENCES "users"("id")
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "idx_login_exchange_code" ON "login_exchange_tokens" ("code")`,
  `CREATE TABLE IF NOT EXISTS "request_logs" (
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
  )`,
  `CREATE INDEX IF NOT EXISTS "idx_request_id" ON "request_logs" ("id")`,
  `CREATE INDEX IF NOT EXISTS "idx_timestamp" ON "request_logs" ("timestamp")`,
  `CREATE INDEX IF NOT EXISTS "idx_status_code" ON "request_logs" ("status_code")`,
  `CREATE INDEX IF NOT EXISTS "idx_request_path" ON "request_logs" ("request_path")`,
];

export async function setupIntegrationDb(name = 'shared-integration-schema') {
  const migration: D1Migration = {
    name,
    queries: SCHEMA_QUERIES,
  };

  await applyD1Migrations(testEnv.DB, [migration]);
}

export function workerEnv(overrides: Partial<TestEnvironment> = {}): CloudflareBindings {
  return { ...testEnv, ...overrides } as CloudflareBindings;
}

export async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function seedUser(input: {
  id?: string;
  email?: string;
  googleId?: string;
  plan?: Plan;
  name?: string | null;
} = {}) {
  const id = input.id ?? crypto.randomUUID();
  const unique = `${Date.now()}-${crypto.randomUUID()}`;
  const email = input.email ?? `user-${unique}@moneyjar.test`;
  const googleId = input.googleId ?? `google-${unique}`;
  const plan = input.plan ?? 'free';
  const name = input.name ?? '测试用户';

  await testEnv.DB.prepare(
    `INSERT OR IGNORE INTO users (id, email, google_id, plan, name) VALUES (?, ?, ?, ?, ?)`
  )
    .bind(id, email, googleId, plan, name)
    .run();

  return { id, email, googleId, plan, name };
}

export async function createBearerToken(user: { id: string; email: string; plan: Plan }) {
  const token = await signJwt({ sub: user.id, email: user.email, plan: user.plan }, testEnv.JWT_SECRET);
  return `Bearer ${token}`;
}

export async function seedRefreshToken(input: {
  userId: string;
  token: string;
  expiresAt?: string;
  revoked?: boolean;
  hash?: boolean;
}) {
  const tokenValue = input.hash === false ? input.token : await hashToken(input.token);
  const expiresAt = input.expiresAt ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  await testEnv.DB.prepare(
    `INSERT INTO refresh_tokens (id, user_id, token, expires_at, revoked) VALUES (?, ?, ?, ?, ?)`
  )
    .bind(crypto.randomUUID(), input.userId, tokenValue, expiresAt, input.revoked ? 1 : 0)
    .run();
}

export async function seedApiToken(input: {
  token: string;
  name?: string;
  type?: 'mcp' | 'app';
}) {
  await testEnv.DB.prepare(
    `INSERT OR IGNORE INTO api_tokens (token, name, type) VALUES (?, ?, ?)`
  )
    .bind(input.token, input.name ?? 'test-token', input.type ?? 'mcp')
    .run();
}

export async function seedFeatureFlag(input: {
  featureKey: string;
  minPlan?: Plan;
  enabled?: boolean;
  description?: string | null;
}) {
  await testEnv.DB.prepare(
    `INSERT OR REPLACE INTO feature_flags (feature_key, min_plan, enabled, description) VALUES (?, ?, ?, ?)`
  )
    .bind(input.featureKey, input.minPlan ?? 'free', input.enabled === false ? 0 : 1, input.description ?? null)
    .run();
}

export async function seedTransaction(input: {
  userId?: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  note?: string | null;
  createdAt?: string;
  deletedAt?: string | null;
}) {
  const result = await testEnv.DB.prepare(
    `INSERT INTO transactions (user_id, type, amount, category, note, created_at, deleted_at)
     VALUES (?, ?, ?, ?, ?, COALESCE(?, CURRENT_TIMESTAMP), ?)
     RETURNING id`
  )
    .bind(
      input.userId ?? null,
      input.type,
      input.amount,
      input.category,
      input.note ?? null,
      input.createdAt ?? null,
      input.deletedAt ?? null
    )
    .first<{ id: number }>();

  return result;
}
