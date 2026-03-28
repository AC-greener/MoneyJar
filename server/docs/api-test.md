# MoneyJar API 测试命令

启动本地服务器后，在另一个终端执行以下命令。

## 创建交易 (POST /api/transactions)

### 支出测试
```bash
curl -X POST http://localhost:8787/api/transactions \
  -H "Content-Type: application/json" \
  -d '{"type":"expense","amount":35.5,"category":"生鲜","note":"买菜"}'
```

### 收入测试
```bash
curl -X POST http://localhost:8787/api/transactions \
  -H "Content-Type: application/json" \
  -d '{"type":"income","amount":5000,"category":"工资","note":"月薪"}'
```

### 验证必填字段缺失 - 应返回 400
```bash
curl -X POST http://localhost:8787/api/transactions \
  -H "Content-Type: application/json" \
  -d '{"amount":35.5}'
```

### 验证 type 无效 - 应返回 400
```bash
curl -X POST http://localhost:8787/api/transactions \
  -H "Content-Type: application/json" \
  -d '{"type":"invalid","amount":35.5,"category":"餐饮"}'
```

---

## 查询交易列表 (GET /api/transactions)

### 获取所有交易
```bash
curl http://localhost:8787/api/transactions
```

### 本周统计
```bash
curl "http://localhost:8787/api/transactions?period=week"
```

### 本月统计
```bash
curl "http://localhost:8787/api/transactions?period=month"
```

---

## 查询单笔交易 (GET /api/transactions/:id)

```bash
curl http://localhost:8787/api/transactions/1
```

### 查询不存在的 ID - 应返回 404
```bash
curl http://localhost:8787/api/transactions/99999
```

---

## 删除交易 (DELETE /api/transactions/:id)

```bash
curl -X DELETE http://localhost:8787/api/transactions/1
```

### 删除不存在的 ID - 应返回 404
```bash
curl -X DELETE http://localhost:8787/api/transactions/99999
```

---

## 完整测试流程示例

```bash
# 1. 创建一笔支出
curl -X POST http://localhost:8787/api/transactions \
  -H "Content-Type: application/json" \
  -d '{"type":"expense","amount":35.5,"category":"生鲜","note":"买菜"}'

# 2. 创建一笔收入
curl -X POST http://localhost:8787/api/transactions \
  -H "Content-Type: application/json" \
  -d '{"type":"income","amount":5000,"category":"工资","note":"月薪"}'

# 3. 查看所有交易
curl http://localhost:8787/api/transactions

# 4. 查看本月统计
curl "http://localhost:8787/api/transactions?period=month"

# 5. 查看单笔交易 (假设 id=1)
curl http://localhost:8787/api/transactions/1

# 6. 删除交易 (假设 id=1)
curl -X DELETE http://localhost:8787/api/transactions/1
```
