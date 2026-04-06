# API Contract: MoneyJar H5 Frontend

**Date**: 2026-04-05
**Feature**: 001-voice-expense-tracking
**Backend Base**: `http://localhost:8787` (开发环境)

## 认证接口

### POST /api/auth/google
Google OAuth 登录

**Request**:
```json
{
  "id_token": "string (Google ID Token)"
}
```

**Response** (200):
```json
{
  "access_token": "string (JWT)",
  "refresh_token": "string",
  "user": {
    "id": "uuid",
    "email": "string",
    "name": "string | null",
    "avatarUrl": "string | null",
    "plan": "free | pro"
  }
}
```

**Errors**:
- 400: Invalid request body
- 401: Invalid Google Token

---

### POST /api/auth/test-token
开发环境测试 Token（仅 development/staging）

**Request**:
```json
{}
```

**Headers**:
```
Authorization: Bearer <TEST_AUTH_TOKEN>
```

**Response** (200):
```json
{
  "access_token": "string (JWT)",
  "refresh_token": "string",
  "user": {
    "id": "uuid",
    "email": "string",
    "name": "string | null",
    "avatarUrl": "string | null",
    "plan": "free | pro"
  }
}
```

**Errors**:
- 401: Unauthorized (invalid TEST_AUTH_TOKEN)
- 404: Not available in production

---

### POST /api/auth/refresh
刷新 Access Token

**Request**:
```json
{
  "refresh_token": "string"
}
```

**Response** (200):
```json
{
  "access_token": "string (JWT)"
}
```

**Errors**:
- 400: Invalid request body
- 401: Invalid/Expired/Revoked refresh token

---

### POST /api/auth/logout
登出（软吊销 refresh_token）

**Request**:
```json
{
  "refresh_token": "string"
}
```

**Response** (200):
```json
{
  "message": "已登出"
}
```

**Errors**:
- 400: Invalid request body

---

### GET /api/auth/me
获取当前登录用户信息

**Headers**:
```
Authorization: Bearer <access_token>
```

**Response** (200):
```json
{
  "id": "uuid",
  "email": "string",
  "name": "string | null",
  "avatarUrl": "string | null",
  "plan": "free | pro"
}
```

**Errors**:
- 401: Unauthorized (missing/invalid token)
- 404: User not found

---

## 交易接口

### POST /api/transactions/
创建交易

**Headers**:
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request**:
```json
{
  "type": "income | expense",
  "amount": "number (正数)",
  "category": "string (1-50字符)",
  "note": "string (可选, 0-256字符)",
  "created_at": "string (可选, ISO时间字符串)"
}
```

**Response** (201):
```json
{
  "id": "number",
  "type": "income | expense",
  "amount": "number",
  "category": "string",
  "note": "string | null",
  "createdAt": "string (ISO时间字符串)"
}
```

**Errors**:
- 400: Invalid request body / Validation error
- 401: Unauthorized
- 403: QUOTA_EXCEEDED (免费用户限额)

---

### GET /api/transactions/
获取交易列表或汇总

**Headers**:
```
Authorization: Bearer <access_token>
```

**Query Parameters**:
| 参数 | 类型 | 说明 |
|------|------|------|
| period | `week` \| `month` \| undefined | 时间范围 |

- 无 period: 返回交易列表
- period=week: 返回本周汇总
- period=month: 返回本月汇总

**Response (无 period)** (200):
```json
[
  {
    "id": "number",
    "type": "income | expense",
    "amount": "number",
    "category": "string",
    "note": "string | null",
    "createdAt": "string"
  }
]
```

**Response (有 period=week/month)** (200):
```json
{
  "total": "number (总金额)",
  "income": "number (收入总计)",
  "expense": "number (支出总计)",
  "transactions": [...],
  "byCategory": {
    "餐饮": "number",
    "交通": "number"
  }
}
```

**Errors**:
- 400: Invalid query parameters
- 401: Unauthorized

---

### GET /api/transactions/:id
获取单个交易

**Headers**:
```
Authorization: Bearer <access_token>
```

**Response** (200):
```json
{
  "id": "number",
  "type": "income | expense",
  "amount": "number",
  "category": "string",
  "note": "string | null",
  "createdAt": "string"
}
```

**Errors**:
- 400: Invalid id
- 401: Unauthorized
- 404: Transaction not found (或无权访问)

---

### DELETE /api/transactions/:id
删除交易（软删除）

**Headers**:
```
Authorization: Bearer <access_token>
```

**Response** (200):
```json
{
  "message": "Transaction deleted"
}
```

**Errors**:
- 400: Invalid id
- 401: Unauthorized
- 404: Transaction not found

---

## 通用错误响应格式

```json
{
  "error": "string (错误信息或错误码)",
  "requestId": "string (请求追踪ID)"
}
```

**常见错误码**:
- `INVALID_GOOGLE_TOKEN`: Google Token 无效
- `TOKEN_EXPIRED`: Access Token 过期
- `INVALID_REFRESH_TOKEN`: Refresh Token 无效
- `TOKEN_REVOKED`: Refresh Token 已吊销
- `QUOTA_EXCEEDED`: 超出限额（免费用户）

---

## 认证流程

```
1. 登录 (Google OAuth 或 Test Token)
   ↓
2. 获得 access_token + refresh_token
   ↓
3. 访问受保护资源
   ├─ 成功 → 返回数据
   └─ 401 → 尝试 refresh token
            ↓
4. 用 refresh_token 换取新的 access_token
   ├─ 成功 → 用新 token 重试请求
   └─ 失败 → 跳转登录页面
```

---

## 前端存储策略

| 数据 | 存储位置 | 说明 |
|------|---------|------|
| access_token | Memory | 不持久化，页面关闭即丢失 |
| refresh_token | localStorage | 持久化，需加密 |
| user info | Zustand Store | 内存状态 |
| 离线交易 | localStorage | 待同步队列 |
