# MoneyJar 海外用户优先的 Web 一次性会员方案

## Summary
推荐方案：`Stripe Checkout + 一次性付款 + 服务端发放 Pro 会员`。

这条路最适合当前项目：
- 面向海外用户，Stripe 覆盖最好
- 只做 Web，接入成本最低
- 只做一次性会员，不需要处理自动续费订阅
- 能直接接入现有 `free/pro`、`planStartedAt`、`planExpiresAt` 模型
- 当前仓库已经有可复用的 `server/test/integration/*.test.ts` 集成测试基座，适合把支付能力补成可验证模块

支付方式建议：
- 主通道：银行卡
- 同时开启：Apple Pay、Google Pay、Link
- 可选补充：Alipay
- `WeChat Pay` 第一阶段不作为重点

## Key Changes
### 支付产品形态
第一期只上一个一次性商品：
- 默认建议：`Pro 年卡`

付款成功后：
- `users.plan = 'pro'`
- 写入 `planStartedAt`
- 写入 `planExpiresAt`
- 到期后在鉴权或读取用户资料时回退为 `free`

重复购买规则默认定为：
- 从 `max(planExpiresAt, now)` 开始顺延
- 不覆盖未消耗的剩余有效期

### 服务端接口与数据
在 `server/` 增加最小支付域：
- `POST /api/billing/checkout`
  - 入参：`productId`
  - 出参：`checkoutUrl`
- `POST /api/billing/webhook/stripe`
  - 处理 `checkout.session.completed`
  - 校验 Stripe 签名
  - 幂等发放会员
- `GET /api/billing/me`
  - 返回当前会员状态、到期时间、最近订单摘要

新增支付记录表，记录：
- `userId`
- `provider = stripe`
- `productId`
- `sessionId`
- `paymentIntentId`
- `amount`
- `currency`
- `status`
- `paidAt`
- `grantedPlan`
- `grantedUntil`
- `processedAt`

`users` 表只保留最终权益状态，不存支付通道细节。

### 前端
在 `frontend/` 增加：
- 会员购买页
- 支付成功页
- 支付取消页

购买流程：
1. 用户点击“开通 Pro”
2. 前端调用 `/api/billing/checkout`
3. 跳转 Stripe Checkout
4. 支付成功后回到成功页
5. 成功页调用 `/api/auth/me` 或 `/api/billing/me` 刷新状态
6. UI 显示 `Pro + 到期时间`

设置页会员区域升级为：
- 当前计划
- 到期时间
- 购买/续费入口

## Test Plan
### 单元测试
新增支付服务层单元测试，覆盖：
- Checkout Session 创建参数正确
- `productId` 到会员时长的映射正确
- webhook 事件解析与签名校验封装正确
- 发放会员时 `planStartedAt / planExpiresAt` 计算正确
- 重复处理同一 Stripe 事件不会重复发放
- 重复购买会顺延有效期

### 服务端集成测试
沿用现有 `Vitest + @cloudflare/vitest-pool-workers + worker.fetch()` 风格，在 `server/test/integration` 新增支付测试文件。覆盖：
- 未登录调用 `POST /api/billing/checkout` 返回 `401`
- 已登录免费用户可创建 checkout session
- `productId` 非法返回 `400`
- webhook 签名错误返回 `400` 或 `401`
- 收到 `checkout.session.completed` 后，用户从 `free` 变为 `pro`
- `planExpiresAt` 按商品时长正确写入
- 相同 webhook 重放时，支付记录和会员状态不重复处理
- 已是 `pro` 的用户再次购买会顺延有效期
- `GET /api/billing/me` 返回与数据库一致的会员状态
- 支付成功后前端依赖的 `/api/auth/me` 能读到最新 `plan`

### 前端测试
前端只补最必要测试：
- 购买页点击按钮会调用 `/api/billing/checkout`
- 成功页加载后会刷新用户信息
- 会员区能显示 `Pro` 和到期时间
- 失败/取消页显示可恢复操作入口

### 手工联调测试
必须跑一次真实联调：
- 本地前端拉起 Stripe Checkout
- 使用 Stripe 测试卡完成支付
- 本地 webhook 成功收到事件
- 成功页刷新后显示 `Pro`
- 数据库中有支付记录，用户权益状态正确

## Development Testing
### 本地运行方式
开发环境推荐：
- `frontend` 本地 dev server
- `server` 用 `wrangler dev`
- Stripe 全程使用 `Test mode`

本地服务端需要补充 Stripe 环境变量到 `server/.dev.vars`：
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_ID_PRO_YEAR`
- `APP_BASE_URL`
- 保留现有：
  - `JWT_SECRET`
  - `GOOGLE_CLIENT_ID`
  - `TEST_AUTH_TOKEN`

### 本地 webhook 测试
使用 Stripe CLI 把 webhook 转发到本地 Worker：

```bash
stripe listen --forward-to localhost:8787/api/billing/webhook/stripe
```

CLI 打印出的 `whsec_...` 写入本地 `STRIPE_WEBHOOK_SECRET`。

本地验证方式分两类：
- 真正从前端发起一次 Checkout，用测试卡付款
- 用 Stripe CLI 直接触发事件进行回归测试

推荐命令：

```bash
stripe trigger checkout.session.completed
```

### 测试数据与环境边界
开发环境统一使用：
- Stripe 测试商品
- Stripe 测试价格
- Stripe 测试卡
- 本地 D1 测试库或 `wrangler dev` 绑定数据库

集成测试中不直接请求真实 Stripe API，统一做 provider mock 或在 service 边界 stub 掉 Stripe SDK；只有手工联调才连接 Stripe 测试环境。这样可以保证：
- CI 稳定
- 测试快速
- 不依赖外网
- 不产生真实第三方状态

## Public Interfaces
新增或扩展的公共接口：
- `POST /api/billing/checkout`
- `POST /api/billing/webhook/stripe`
- `GET /api/billing/me`

用户侧返回建议补充：
- `planExpiresAt`
- 可选 `billingProvider`
- 可选 `lastPaymentAt`

如果不想立刻修改现有 `User` 返回结构，最低要求是 `GET /api/billing/me` 提供这些信息，前端会员页优先从该接口读取。

## Assumptions
- 第一期只做一个会员档位：`pro`
- 第一期只做一个商品：`Pro 年卡`
- 第一期只接一个支付渠道：`Stripe`
- 第一期只做 Web 一次性会员，不做自动续费
- 默认币种使用 `USD`
- 服务端是会员状态唯一真实来源
- 支付成功后的权益生效以 webhook 为准，不依赖前端跳转结果
