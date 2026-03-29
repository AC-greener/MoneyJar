# 数据库操作手册

## 核心概念

### Schema（表结构设计图）

Schema 是用代码描述的**数据库表结构**，定义了有哪些表、每张表有哪些列、每列是什么类型。

文件位置：`src/db/schema.ts`

```typescript
// 示例：一张交易记录表
export const transactions = sqliteTable('transactions', {
  id:        integer('id').primaryKey({ autoIncrement: true }),
  amount:    real('amount').notNull(),
  category:  text('category').notNull(),
  note:      text('note'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
})
```

**改表结构 = 修改这个文件**，然后同步到数据库。

---

### Migration（迁移文件）

每次修改 Schema 后，Drizzle 会生成一个 `.sql` 文件记录本次变更，就像**代码的 Git 提交记录**。

文件位置：`drizzle/` 目录（自动生成，禁止手动修改）

```
drizzle/
├── 0000_initial.sql       ← 第一次建表
├── 0001_add_accounts.sql  ← 第二次加了 accounts 表
└── meta/
    └── _journal.json      ← 记录哪些迁移已执行
```

---

## 常用命令

### 开发阶段快速验证（push）

```bash
pnpm db:push
```

**直接**把 `schema.ts` 的变更推送到数据库，不生成迁移文件。

- 适合：设计表结构时反复调整，不想留下大量迁移记录
- 风险：直接改库，若字段删除可能丢数据
- **仅在开发阶段使用，不用于生产**

---

### 生产环境标准流程（generate + migrate）

**第一步：生成迁移文件**

```bash
pnpm db:generate
```

读取 `schema.ts` 的变化，在 `drizzle/` 目录生成对应的 `.sql` 文件。此时数据库**尚未变更**。

**第二步：查看生成的 SQL（建议）**

打开 `drizzle/` 目录检查生成的 SQL 是否符合预期，确认没有意外的 DROP 操作。

**第三步：应用迁移**

```bash
pnpm db:migrate
```

执行 `drizzle/` 中未执行过的迁移文件，数据库结构正式更新。

---

## 完整开发流程

```
修改 src/db/schema.ts
        │
        ├─ 开发调试 ──→ pnpm db:push          （快，不留记录）
        │
        └─ 准备发布 ──→ pnpm db:generate
                              │
                         检查 drizzle/*.sql
                              │
                         pnpm db:migrate     （安全，有记录）
```

---

## 其他工具命令

| 命令 | 说明 |
| --- | --- |
| `pnpm db:studio` | 启动 Drizzle Studio 可视化界面 |
| `pnpm cf-typegen` | 重新生成 `worker-configuration.d.ts`，在修改 `wrangler.jsonc` 绑定后必须执行 |
| `wrangler d1 list` | 查看 Cloudflare 账户下所有 D1 数据库 |
| `wrangler d1 create <name>` | 创建一个新的 D1 数据库 |
| `wrangler d1 execute <name> --command "SELECT * FROM transactions"` | 直接在 D1 上执行 SQL 语句（调试用） |

---

## 本地数据库操作

> **注意**：`drizzle.config.ts` 配置的是远程 D1（`d1-http` 驱动），`pnpm db:push` 会推送到远程。本地 D1 需要用 wrangler 命令直接操作。

### 查看本地数据库的表

```bash
pnpm exec wrangler d1 execute moneyjar --local --command "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;"
```

### 查看表结构

```bash
pnpm exec wrangler d1 execute moneyjar --local --command "PRAGMA table_info(transactions);"
pnpm exec wrangler d1 execute moneyjar --local --command "PRAGMA table_info(request_logs);"
```

### 创建本地表的 SQL

如果本地数据库没有表，需要手动创建。以下是当前 schema 对应的建表 SQL：

**transactions 表**

```bash
pnpm exec wrangler d1 execute moneyjar --local --command "
CREATE TABLE \`transactions\` (
  \`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  \`type\` text(20) NOT NULL,
  \`amount\` real NOT NULL,
  \`category\` text(50) NOT NULL,
  \`note\` text(256),
  \`created_at\` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);"
```

**request_logs 表**

```bash
pnpm exec wrangler d1 execute moneyjar --local --command "
CREATE TABLE \`request_logs\` (
  \`id\` text PRIMARY KEY NOT NULL,
  \`request_path\` text NOT NULL,
  \`request_method\` text NOT NULL,
  \`status_code\` integer NOT NULL,
  \`duration\` integer NOT NULL,
  \`request_body\` text,
  \`response_body\` text,
  \`error_message\` text,
  \`client_ip\` text,
  \`user_agent\` text,
  \`timestamp\` integer NOT NULL,
  \`ai_parsed\` integer,
  \`ai_model\` text,
  \`ai_processing_time\` integer
);"
```

**创建索引**

```bash
pnpm exec wrangler d1 execute moneyjar --local --command "
CREATE INDEX \`idx_request_id\` ON \`request_logs\` (\`id\`);
CREATE INDEX \`idx_timestamp\` ON \`request_logs\` (\`timestamp\`);
CREATE INDEX \`idx_status_code\` ON \`request_logs\` (\`status_code\`);
CREATE INDEX \`idx_request_path\` ON \`request_logs\` (\`request_path\`);"
```

### 同步本地 schema 变更的流程

1. 修改 `src/db/schema.ts`
2. `pnpm db:generate` 生成迁移 SQL 到 `drizzle/` 目录
3. 检查生成的 SQL 文件
4. 用 wrangler 命令在本地执行迁移文件：

```bash
# 执行单个迁移文件
pnpm exec wrangler d1 execute moneyjar --local --file ./drizzle/0000_tough_storm.sql

# 或者执行所有迁移
pnpm exec wrangler d1 execute moneyjar --local --file ./drizzle/0001_demonic_frightful_four.sql
```

---

## Drizzle Studio（可视化管理界面）

```bash
pnpm db:studio
```

运行后打开浏览器访问 `https://local.drizzle.studio`，可以像操作 Excel 一样直接查看和编辑数据库。

**常用场景：**
- 验证 API 写入的数据是否正确
- 手动插入测试数据，不需要写代码
- 检查表结构迁移后是否符合预期
- 快速删除开发阶段的垃圾数据

### 重要：Studio 操作的是真实数据库

Studio 通过 `d1-http` 驱动连接 Cloudflare 远程 D1，**所有增删改查都会立即生效**，不是本地预览。

与 `pnpm dev` 的区别：

| | 操作的数据库 | 会影响线上数据？ |
| --- | --- | --- |
| `pnpm dev`（本地开发服务器） | `.wrangler/state/` 本地沙盒 | 否 |
| `pnpm db:studio` | Cloudflare 远程 D1 | **是** |
| `pnpm db:push / migrate` | Cloudflare 远程 D1 | **是** |

**使用建议：**
- 开发初期全是测试数据，Studio 随便操作没有问题
- 正式上线有真实用户数据后，Studio 只用来**查看**，不在里面手动修改数据，数据变更统一通过代码和迁移文件操作

---

## 本地开发环境配置（.env）

所有数据库命令（`push`、`migrate`、`studio` 等）都需要连接 Cloudflare，依赖以下环境变量。

**第一步**：复制模板文件

```bash
cp .env.example .env
```

**第二步**：填入真实值（在 Cloudflare Dashboard 获取）

```
CLOUDFLARE_ACCOUNT_ID=   ← Dashboard 首页右侧可找到
CLOUDFLARE_DATABASE_ID=  ← wrangler d1 list 命令输出中的 id 字段
CLOUDFLARE_D1_TOKEN=     ← My Profile → API Tokens → 创建 D1 编辑权限的 Token
```

`.env` 文件已加入 `.gitignore`，不会被提交到 Git。

---

## 注意事项

- 禁止手动修改 `drizzle/` 目录下的任何文件
- 删除列或表之前，先确认数据已备份或该数据不再需要
- 修改 `wrangler.jsonc` 中的 binding 配置后，必须运行 `pnpm cf-typegen` 刷新类型
- 禁止将 `.env` 文件提交到 Git，只提交 `.env.example`
