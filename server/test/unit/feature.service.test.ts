import { describe, expect, it, beforeAll } from 'vitest';
import { env, applyD1Migrations, type D1Migration } from 'cloudflare:test';
import { drizzle } from 'drizzle-orm/d1';
import { FeatureService } from '../../src/services/feature.service';

// Inline 建表 SQL（最小化，只需要 feature_flags 表）
const CREATE_FEATURE_FLAGS_TABLE = `CREATE TABLE "feature_flags" (
  "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  "feature_key" text NOT NULL,
  "min_plan" text NOT NULL DEFAULT 'free',
  "enabled" integer NOT NULL DEFAULT 1,
  "description" text
)`;
const CREATE_IDX_FEATURE_KEY = `CREATE UNIQUE INDEX "idx_feature_key" ON "feature_flags" ("feature_key")`;

beforeAll(async () => {
  const migration: D1Migration = {
    name: 'feature-service-test-setup',
    queries: [CREATE_FEATURE_FLAGS_TABLE, CREATE_IDX_FEATURE_KEY],
  };
  await applyD1Migrations(env.DB, [migration]);

  // 插入测试数据
  await env.DB.prepare(`INSERT INTO feature_flags (feature_key, min_plan, enabled, description) VALUES
    ('ai_voice', 'free', 1, 'AI 语音记账'),
    ('export_report', 'pro', 1, '财务报告导出'),
    ('disabled_feature', 'free', 0, '已禁用的功能')
  `).run();
});

describe('FeatureService.isFeatureEnabled', () => {
  let service: FeatureService;

  beforeAll(() => {
    service = new FeatureService(drizzle(env.DB));
  });

  it('Free 用户应该可以使用 free 级别功能', async () => {
    expect(await service.isFeatureEnabled('ai_voice', 'free')).toBe(true);
  });

  it('Free 用户不能使用 pro 级别功能', async () => {
    expect(await service.isFeatureEnabled('export_report', 'free')).toBe(false);
  });

  it('Pro 用户可以使用 pro 级别功能', async () => {
    expect(await service.isFeatureEnabled('export_report', 'pro')).toBe(true);
  });

  it('Pro 用户也可以使用 free 级别功能', async () => {
    expect(await service.isFeatureEnabled('ai_voice', 'pro')).toBe(true);
  });

  it('全局 enabled=0 的功能对所有用户不可用', async () => {
    expect(await service.isFeatureEnabled('disabled_feature', 'free')).toBe(false);
    expect(await service.isFeatureEnabled('disabled_feature', 'pro')).toBe(false);
  });

  it('不存在的功能应返回 false', async () => {
    expect(await service.isFeatureEnabled('nonexistent_feature', 'free')).toBe(false);
  });
});
