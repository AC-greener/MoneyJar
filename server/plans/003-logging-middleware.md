# 日志中间件实现计划

## Context

用户需要在 MoneyJar Server 中新增日志中间件和日志 schema，用于记录 API 调用过程中产生的信息和错误，方便排查问题。

**现状**：
- `src/middlewares/` 目录为空（只有 `.gitkeep`）
- Hono 有内置 `request-id` 中间件，使用 `crypto.randomUUID()` 生成 ID
- 项目已有 `nanoid` 依赖

---

## 实现方案

### 1. 使用 Hono 内置 `request-id` 中间件

```typescript
import { requestId } from 'hono/request-id';

app.use(requestId()); // 自动生成 UUID 并添加到 X-Request-Id 响应头
```

可通过 `c.get("requestId")` 获取请求 ID。

### 2. 新增日志 Schema (`src/db/schema.ts`)

在 `request_logs` 表中记录：
- `id`: UUID，请求唯一标识
- `requestPath`: 请求路径
- `requestMethod`: 请求方法
- `statusCode`: 响应状态码
- `duration`: 请求耗时（毫秒）
- `requestBody`: 脱敏后的请求体
- `responseBody`: 响应体（截断后）
- `errorMessage`: 错误信息
- `clientIp`: 客户端 IP
- `userAgent`: 用户代理
- `timestamp`: 时间戳
- `aiParsed`: 是否包含 AI 解析
- `aiModel`: AI 模型名称（如包含 AI 调用）
- `aiProcessingTime`: AI 处理耗时（毫秒，由 service 层在 AI 调用完成后设置）

**数据库索引设计**（Drizzle ORM）：

```typescript
export const requestLogs = sqliteTable('request_logs', {
  id: text('id').primaryKey(),
  requestPath: text('request_path').notNull(),
  requestMethod: text('request_method').notNull(),
  statusCode: integer('status_code').notNull(),
  duration: integer('duration').notNull(),
  requestBody: text('request_body'),
  responseBody: text('response_body'),
  errorMessage: text('error_message'),
  clientIp: text('client_ip'),
  userAgent: text('user_agent'),
  timestamp: integer('timestamp', { mode: 'timestamp' }).notNull(),
  aiParsed: integer('ai_parsed', { mode: 'boolean' }),
  aiModel: text('ai_model'),
  aiProcessingTime: integer('ai_processing_time'),
}, (table) => ({
  // 按 requestId 查询（精确查找单条日志）
  idx_request_id: index('idx_request_id').on(table.id),
  // 按时间段查询 + 排序（排查问题时最常用）
  idx_timestamp: index('idx_timestamp').on(table.timestamp),
  // 按状态码查询异常请求（快速定位错误）
  idx_status_code: index('idx_status_code').on(table.statusCode),
  // 按请求路径统计（分析 API 热点）
  idx_request_path: index('idx_request_path').on(table.requestPath),
}));
```

**索引使用场景**：
| 索引 | 场景 |
|------|------|
| `idx_request_id` | `WHERE id = ?` — 通过 requestId 精确定位日志 |
| `idx_timestamp` | `WHERE timestamp > ? ORDER BY timestamp DESC` — 按时间段排查 |
| `idx_status_code` | `WHERE status_code >= 400` — 快速定位异常请求 |
| `idx_request_path` | `GROUP BY request_path` — 统计 API 调用热点 |

### 3. 新增日志类型定义 (`src/types/log.ts`)

- `RequestLogSchema`: Zod 校验 schema
- `ApiResponseSchema<T>`: 通用响应包装类型（包含 requestId）

### 4. 新增日志中间件 (`src/middlewares/logger.ts`)

**记录策略（过滤机制）**：
- ✅ 记录：**POST / PUT / DELETE** 请求
- ✅ 记录：**HTTP 状态码 >= 400** 的响应
- ❌ 跳过：GET 请求（简单查询不包含 AI 运算）
- ❌ 跳过：OPTIONS 预检请求
- ❌ 跳过：`/favicon.ico` 等静态资源
- ❌ 跳过：`/health` 健康检查路由

```typescript
const SHOULD_LOG = (method: string, path: string, status: number) =>
  !['OPTIONS'].includes(method) &&
  !path.includes('favicon') &&
  !path.startsWith('/health') &&
  (['POST', 'PUT', 'DELETE'].includes(method) || status >= 400);
```

**日志中间件逻辑**：
- 使用 Hono 内置 `request-id` 中间件生成的 UUID（通过 `c.get("requestId")` 获取）
- 记录请求开始时间
- 脱敏敏感字段（password, token, apiKey 等）
- **使用 `c.executionCtx.waitUntil()` 确保日志异步写入不丢失**

```typescript
// 中间件末尾：确保日志写入完成后再结束请求
try {
  c.executionCtx.waitUntil(logPromise());
} catch {
  // 降级：本地开发 / 测试环境直接 await，避免报错
  logPromise().catch(console.error);
}
```

- 同时输出到标准输出（`console.log`），方便开发环境调试
- 将请求元数据、响应状态、**错误信息**写入 `request_logs` 表

### 5. 全局错误捕获 (`src/middlewares/error-handler.ts`)

结合 Hono 的 `app.onError` 机制，确保所有未处理异常都能被记录：

```typescript
app.onError((err, c) => {
  const requestId = c.get("requestId");
  // 写入 errorMessage 到日志
  console.error(`[${requestId}] Unhandled error:`, err.message);
  return c.json({ error: err.message, requestId }, 500);
});
```

### 6. 更新现有文件

| 文件 | 改动 |
|------|------|
| `src/index.ts` | 注册全局日志中间件 `app.use(logger)` |
| `src/routes/transaction.route.ts` | 错误响应中包含 `requestId` |
| `src/db/schema.ts` | 新增 `request_logs` 表 |
| `src/types/transaction.ts` | 新增 `ApiResponseSchema` 包装类型 |

### 7. 新增 Repository 和 Service

- `src/repositories/log.repository.ts`
- `src/services/log.service.ts`

### 8. 新增 Log Retention（定时清理）

使用 Cloudflare **Cron Triggers** 每天凌晨执行一次日志清理，只保留最近 30 天。

#### 8.1 配置 `wrangler.jsonc`

```jsonc
{
  "triggers": {
    "crons": ["0 0 * * *"]  // 每天凌晨 00:00 UTC
  }
}
```

#### 8.2 新增 Log Retention Service (`src/services/retention.service.ts`)

```typescript
export async function cleanupOldLogs(env: Env, days: number = 30): Promise<{ deleted: number }> {
  // Drizzle mode: 'timestamp' 存储的是 Unix timestamp（毫秒）
  // unixepoch('now', '-30 days') 返回秒数，需乘以 1000 转为毫秒
  const result = await env.DB.prepare(`
    DELETE FROM request_logs
    WHERE timestamp < (unixepoch('now', ? || ' days') * 1000)
  `).bind(`-${days}`).run();

  return { deleted: result.meta.changes };
}
```

> ⚠️ **注意**：Drizzle `mode: 'timestamp'` 存储的是毫秒级 Unix timestamp，而 SQLite `unixepoch()` 返回秒数，必须乘以 1000 才能正确比较。

#### 8.3 新增 Cron Handler (`src/index.ts`)

```typescript
export default {
  fetch: app.fetch,
  scheduled: async (event: ScheduledEvent, env: Env, ctx: ExecutionContext) => {
    const { cleanupOldLogs } = await import('./services/retention.service');
    const result = await cleanupOldLogs(env);
    console.log(`[Retention] Deleted ${result.deleted} old log entries`);
  },
};
```

#### 8.4 新增 Retention Repository (`src/repositories/retention.repository.ts`)

```typescript
export async function deleteLogsOlderThan(env: Env, days: number) {
  return env.DB.prepare(`
    DELETE FROM request_logs
    WHERE timestamp < datetime('now', ?)
  `).bind(`-${days} days`).run();
}
```

### 9. 更新 ROADMAP.md

在 Phase 1 后新增 **日志基础设施** 阶段

---

## 关键文件

- `src/middlewares/logger.ts` - 新建
- `src/middlewares/error-handler.ts` - 新建
- `src/types/log.ts` - 新建
- `src/db/schema.ts` - 修改
- `src/repositories/log.repository.ts` - 新建
- `src/repositories/retention.repository.ts` - 新建
- `src/services/log.service.ts` - 新建
- `src/services/retention.service.ts` - 新建
- `src/index.ts` - 修改
- `src/routes/transaction.route.ts` - 修改
- `docs/ROADMAP.md` - 修改
- `wrangler.jsonc` - 修改（添加 cron trigger）

---

## 验证

### 日志中间件
1. 运行 `pnpm db:generate` 生成迁移文件
2. 运行 `pnpm test` 确保测试通过
3. 手动测试：`POST /api/transactions` 创建交易，检查日志是否记录

### Log Retention
4. 本地测试 Cron：`wrangler dev --test-scheduled` 或手动触发 `wrangler tail` 观察
5. 在 Cloudflare Dashboard 配置 Cron Trigger（如果 wrangler.jsonc 不支持自动部署）
6. 验证旧日志被清理：插入 31 天前的测试数据，执行 retention 后检查是否删除

---

## 测试用例

### 单元测试

### 单元测试 (`test/unit/logger.test.ts`)

```typescript
import { describe, expect, it } from 'vitest';
import { sanitizeBody, truncateResponse } from '../../src/middlewares/logger';

describe('Logger Middleware', () => {
  describe('sanitizeBody', () => {
    it('should redact sensitive fields', () => {
      const body = { username: 'test', password: 'secret123', token: 'abc' };
      const result = sanitizeBody(body);
      expect(result).toContain('[REDACTED]');
      expect(result).not.toContain('secret123');
    });

    it('should return null for null input', () => {
      expect(sanitizeBody(null)).toBeNull();
    });
  });

  describe('truncateResponse', () => {
    it('should truncate long responses', () => {
      const long = 'a'.repeat(3000);
      const result = truncateResponse(long, 100);
      expect(result).toContain('...[truncated]');
    });
  });
});
```

### 集成测试 (`test/integration/logger.test.ts`)

```typescript
import { describe, expect, it } from 'vitest';
import { createExecutionContext, env } from 'cloudflare:test';
import app from '../../src/index';

describe('Logger Middleware Integration', () => {
  it('should attach X-Request-Id header to response', async () => {
    const ctx = createExecutionContext();
    const res = await app.fetch(new Request('http://localhost/'), env, ctx);
    expect(res.headers.get('X-Request-Id')).toBeDefined();
  });

  it('should log transaction creation', async () => {
    const ctx = createExecutionContext();
    const res = await app.fetch(
      new Request('http://localhost/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'expense', amount: 35.5, category: '餐饮' }),
      }),
      env,
      ctx
    );
    expect(res.status).toBe(201);
    // 验证日志已写入 D1
    const logs = await env.DB.prepare('SELECT * FROM request_logs').all();
    expect(logs.results.length).toBeGreaterThan(0);
  });

  it('should include requestId in error responses', async () => {
    const ctx = createExecutionContext();
    const res = await app.fetch(
      new Request('http://localhost/api/transactions/99999'), env, ctx
    );
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.requestId).toBeDefined();
  });
});
```

### Retention 单元测试 (`test/unit/retention.test.ts`)

```typescript
import { describe, expect, it } from 'vitest';
import { deleteLogsOlderThan } from '../../src/repositories/retention.repository';

describe('Log Retention', () => {
  it('should delete logs older than 30 days', async () => {
    const mockEnv = {
      DB: {
        prepare: (sql: string) => ({
          bind: () => ({
            run: async () => ({ meta: { changes: 5 } }),
          }),
        }),
      },
    } as unknown as Env;

    const result = await deleteLogsOlderThan(mockEnv, 30);
    expect(result.meta.changes).toBe(5);
  });
});
```
