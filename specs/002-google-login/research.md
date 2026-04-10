# Research: Google OAuth Login

**Feature**: 002-google-login
**Date**: 2026-04-10

## 技术决策

### 1. OAuth State 存储方案

**决策**: 采用 D1 表 `oauth_states` + `login_exchange_tokens` 双表方案

**理由**:
- OAuth state 需要短期存储（10分钟过期）+ 单次消费
- exchange code 需要更短期存储（5分钟）+ 单次消费
- 两类数据生命周期不同，拆分更清晰
- 符合 server/CLAUDE.md 的分层架构（repositories 处理 CRUD）

**方案**:
```typescript
// oauth_states 表
- id: string (UUID)
- state: string (随机值，用于防止 CSRF)
- returnTo: string (登录成功后跳转地址)
- createdAt: string (ISO)
- expiresAt: string (10分钟后)
- usedAt: string | null (已使用时间)

// login_exchange_tokens 表
- id: string (UUID)
- code: string (一次性交换码)
- userId: string (关联用户)
- accessToken: string (短期 JWT)
- refreshToken: string (长期 token)
- createdAt: string (ISO)
- expiresAt: string (5分钟后)
- usedAt: string | null (已使用时间)
```

### 2. Google ID Token 校验方案

**决策**: 使用 `jose` 库进行生产级签名校验

**理由**:
- 当前 `verifyGoogleIdToken()` 只校验 payload，未校验签名
- redirect/callback 模式下必须做生产级验签
- `jose` 是 Cloudflare Workers 兼容的加密库

**实现要点**:
```typescript
import { jwtVerify, createRemoteJWKSet } from 'jose'

const JWKS = createRemoteJWKSet(
  new URL('https://www.googleapis.com/oauth2/v3/certs')
)
const { payload } = await jwtVerify(idToken, JWKS, {
  issuer: 'https://accounts.google.com',
  audience: GOOGLE_CLIENT_ID,
})
```

### 3. Open Redirect 防护方案

**决策**: 仅允许相对路径 + 白名单验证

**理由**:
- `return_to` 只允许以 `/` 开头的相对路径
- 避免 open redirect 攻击
- 简单有效

**实现**:
```typescript
function isSafeReturnTo(url: string): boolean {
  if (!url.startsWith('/')) return false
  try {
    new URL(url, 'https://example.com')
    return true
  } catch {
    return false
  }
}
```

### 4. 前端 Callback 页面路由方案

**决策**: 使用 React Router v7 的 `/auth/callback` 路由

**理由**:
- 前端已使用 React Router v7
- callback 页面需要独立渲染，不依赖先前的会话状态
- 使用 URL search params 传递 exchange code

## 替代方案评估

### 替代1: 单表存储所有 OAuth 临时数据

**拒绝原因**:
- 单表设计会使记录类型混乱
- 过期清理逻辑复杂
- 不如双表清晰

### 替代2: 使用 Cloudflare KV 存储 state

**拒绝原因**:
- D1 已是项目标配，引入 KV 增加复杂度
- D1 的 SQLite 查询足够快（state 读取是单次操作）
- 符合现有架构（只用 Drizzle ORM）

### 替代3: 前端直接使用 id_token 调用 /api/auth/google

**拒绝原因**:
- 不符合 Google OAuth 最佳实践
- Google 官方推荐使用 Authorization Code Flow
- 安全风险更高

## 实施顺序

基于技术决策，实施顺序如下：

1. **数据库层**: 创建 oauth_states 和 login_exchange_tokens 表 + 生成迁移
2. **服务端 - OAuth 流程**: 实现 `/google/start` → Google 授权页重定向
3. **服务端 - Callback**: 实现 `/google/callback` → token exchange + exchange code 签发
4. **服务端 - Exchange**: 实现 `/exchange` 端点
5. **前端 - Callback 页面**: 创建 `/auth/callback` 页面
6. **前端 - 登录入口**: 替换未登录态占位为真实 Google 登录按钮
7. **测试**: 补齐服务端和前端测试

## 已知风险

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| Google OAuth 配置复杂 | local/staging/prod 环境 URL 不同 | 文档明确列出每个环境的 callback URL |
| exchange code 时序问题 | 并发请求可能重复消费 | 使用数据库唯一约束 + 幂等处理 |
| 前端 callback 页面刷新 | 刷新后 exchange code 可能过期 | 错误提示 + 重新登录按钮 |
