# 计划：删除 Posts 相关代码，新增记账 Schema

## Context

当前 server 项目中存在示例性的 posts 表和相关 CRUD 路由代码（直接写在 `index.ts` 中，违反分层架构）。根据 MoneyJar 项目需求，需要将这些替换为记账（Transaction）相关的 schema 和接口。

**需求来源**：根据 `docs/requirements/01_MVP_PRD.md`，记账系统需要支持：
- 金额、分类、备注的记录
- 按日期倒序查看历史记录
- 本周/本月总支出统计

---

## 实施步骤

### 第一步：删除 Posts 相关代码

#### 1.1 删除 posts schema 定义
- **文件**: `src/db/schema.ts`
- **操作**: 删除 `posts` 表定义，替换为 `transactions` 表

#### 1.2 删除 posts 路由
- **文件**: `src/index.ts`
- **操作**: 删除所有 `/posts` 路由（GET/POST/PUT/DELETE）

#### 1.3 删除 posts 迁移文件
- **文件**: `drizzle/migrations/0000_same_sheva_callister.sql`
- **文件**: `drizzle/migrations/meta/_journal.json`（需更新）
- **文件**: `drizzle/migrations/meta/0000_snapshot.json`
- **操作**: 删除这些文件及 meta 目录

---

### 第二步：创建记账 Schema（符合分层架构）

#### 2.1 定义 Transaction 表 - `src/db/schema.ts`
```typescript
export const transactions = sqliteTable('transactions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  type: text('type', { length: 20 }).notNull(),  // 'income' 收入 | 'expense' 支出
  amount: real('amount').notNull(),              // 金额，支持小数
  category: text('category', { length: 50 }).notNull(),  // 分类：餐饮/交通/生鲜/数码/其他
  note: text('note', { length: 256 }),           // 备注/描述
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
})
```

**说明**：
- `type` 区分收入/支出，统计时分别汇总
- 暂不关联 Account（后续迭代）

#### 2.2 创建 Zod Schema - `src/types/transaction.ts`
定义请求/响应的 Zod 校验结构：
- `CreateTransactionSchema`: 创建交易入参
- `TransactionResponseSchema`: 响应结构

#### 2.3 创建 Repository - `src/repositories/transaction.repository.ts`
实现 CRUD 操作：
- `createTransaction(data)`
- `getTransactionById(id)`
- `getAllTransactions()`
- `getTransactionsByPeriod(startDate, endDate)`
- `deleteTransaction(id)`

#### 2.4 创建 Service - `src/services/transaction.service.ts`
业务逻辑层（目前较薄，后续 AI 解析逻辑将加于此）：
- `create(data)`: 创建交易
- `getById(id)`: 获取单笔
- `list()`: 获取全部（按日期倒序）
- `getWeeklyTotal()`: 本周支出汇总
- `getMonthlyTotal()`: 本月支出汇总

#### 2.5 创建 Route - `src/routes/transaction.route.ts`
路由层，挂载 `/api/transactions`：
- `POST /` - 创建交易
- `GET /` - 获取列表（支持 ?period=week|month 筛选）
- `GET /:id` - 获取单笔
- `DELETE /:id` - 删除

#### 2.6 注册路由 - `src/index.ts`
- 导入 `transactionRoute`
- 挂载到 `/api/transactions`

---

### 第三步：生成数据库迁移

```bash
pnpm db:generate
```

---

### 第四步：验证

1. 运行 `pnpm dev` 启动本地开发服务器
2. 测试各端点：
   - `POST /api/transactions` - 创建交易
   - `GET /api/transactions` - 获取列表
   - `GET /api/transactions?period=week` - 本周统计
3. 运行 `pnpm test` 确保无回归问题

---

### 第五步：编写测试用例

#### 5.1 集成测试 - `test/integration/transaction.test.ts`

使用 Hono `testClient` 模拟 HTTP 请求，验证路由响应和 Zod 校验：

```typescript
import { testClient } from 'hono/testing'
import { describe, expect, it } from 'vitest'
import app from '../../src/index'

describe('POST /api/transactions', () => {
  it('should create a transaction with valid data', async () => {
    const res = await testClient(app).api.transactions.$post({
      json: { type: 'expense', amount: 35.5, category: '生鲜', note: '买菜' }
    })
    expect(res.status).toBe(201)
  })

  it('should reject missing required fields', async () => {
    const res = await testClient(app).api.transactions.$post({
      json: { amount: 35.5 }  // 缺少 type 和 category
    })
    expect(res.status).toBe(400)
  })

  it('should reject invalid type value', async () => {
    const res = await testClient(app).api.transactions.$post({
      json: { type: 'invalid', amount: 35.5, category: '餐饮' }
    })
    expect(res.status).toBe(400)
  })
})

describe('GET /api/transactions', () => {
  it('should return transaction list', async () => {
    const res = await testClient(app).api.transactions.$get()
    expect(res.status).toBe(200)
    expect(await res.json()).toBeInstanceOf(Array)
  })
})

describe('GET /api/transactions/:id', () => {
  it('should return 404 for non-existent id', async () => {
    const res = await testClient(app).api.transactions[':id'].$get({
      param: { id: '99999' }
    })
    expect(res.status).toBe(404)
  })
})

describe('DELETE /api/transactions/:id', () => {
  it('should delete existing transaction', async () => {
    // 先创建
    const createRes = await testClient(app).api.transactions.$post({
      json: { type: 'expense', amount: 20, category: '交通' }
    })
    const { id } = await createRes.json()
    // 再删除
    const delRes = await testClient(app).api.transactions[':id'].$delete({
      param: { id: String(id) }
    })
    expect(delRes.status).toBe(200)
  })
})
```

#### 5.2 单元测试 - `test/unit/transaction.service.test.ts`

测试 Service 层业务逻辑（统计汇总）：

```typescript
import { describe, expect, it } from 'vitest'
// TODO: 待 Service 层实现后补充测试
```

#### 5.3 Fixture - `test/fixtures/transaction.ts`

共享 mock 数据：

```typescript
export const mockTransaction = {
  type: 'expense' as const,
  amount: 35.5,
  category: '生鲜',
  note: '买菜'
}

export const mockIncome = {
  type: 'income' as const,
  amount: 5000,
  category: '工资',
  note: '月薪'
}
```

---

## 关键文件变更清单

| 操作 | 文件路径 |
|------|----------|
| 删除 | `src/db/schema.ts` (posts 部分) |
| 修改 | `src/index.ts` (移除 posts 路由) |
| 新增 | `src/db/schema.ts` (transactions 表) |
| 新增 | `src/types/transaction.ts` |
| 新增 | `src/repositories/transaction.repository.ts` |
| 新增 | `src/services/transaction.service.ts` |
| 新增 | `src/routes/transaction.route.ts` |
| 新增 | `test/integration/transaction.test.ts` |
| 新增 | `test/unit/transaction.service.test.ts` |
| 新增 | `test/fixtures/transaction.ts` |
| 删除 | `drizzle/migrations/0000_same_sheva_callister.sql` |
| 删除 | `drizzle/migrations/meta/0000_snapshot.json` |
| 更新 | `drizzle/migrations/meta/_journal.json` |

---

## 复用现有模式

- 使用 `docs/DATABASE.md` 中的示例 schema 作为模板
- 遵循 `src/db/schema.ts` 现有的 `sqliteTable` 模式
- Repository 使用 Drizzle ORM 查询，参考 `index.ts` 现有的 drizzle 用法
