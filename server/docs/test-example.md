# MoneyJar API 测试命令

启动本地服务器后，在另一个终端执行以下命令。

## 创建交易 (POST /api/transactions)

### 支出测试
```bash
curl -X POST http://localhost:8787/api/transactions \
  -H "Content-Type: application/json" \
  -d '{"type":"expense","amount":35.5,"category":"生鲜","note":"买菜"}'
```
curl -X POST https://server.zhu15929774304.workers.dev/api/transactions \
  -H "Content-Type: application/json" \
  -d '{"type":"expense","amount":35.5,"category":"生鲜","note":"买菜"}'
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

## MCP 远程调用 (ALL /api/mcp)

### 先确认你要走哪条链路

- 如果你在调试 **Cloudflare 上的远程 MCP**，建议让 `curl` 走本地代理，这样更接近你在 Cursor / Claude Desktop 里的真实访问路径。
- 如果你在调试 **本地 `wrangler dev`**，通常不要走代理，直接访问 `http://localhost:8787/api/mcp` 即可。
- 如果你的本地代理端口不是 `7890`，把下面示例里的地址改成你自己的代理端口。

### 通过本地代理访问远程 MCP

下面示例假设：
- 远程 MCP 地址是 `https://server.zhu15929774304.workers.dev/api/mcp`
- 本地代理是 `http://127.0.0.1:7890`
- MCP Token 是 `dev-mcp-token`
- MCP 协议版本是 `2025-06-18`

这里我们用 `--proxy` 显式指定代理，避免环境变量影响别的命令。

### 初始化 MCP 连接
```bash
curl --proxy http://127.0.0.1:7890 -X POST https://server.zhu15929774304.workers.dev/api/mcp \
  -H "Authorization: Bearer dev-mcp-token" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Mcp-Protocol-Version: 2025-06-18" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "protocolVersion": "2025-06-18",
      "capabilities": {},
      "clientInfo": {
        "name": "manual-test-client",
        "version": "1.0.0"
      }
    }
  }'
```

### 查询 MCP tools 列表
```bash
curl --proxy http://127.0.0.1:7890 -X POST https://server.zhu15929774304.workers.dev/api/mcp \
  -H "Authorization: Bearer dev-mcp-token" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Mcp-Protocol-Version: 2025-06-18" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/list",
    "params": {}
  }'
```

### 通过 MCP 创建一笔交易
```bash
curl --proxy http://127.0.0.1:7890 -X POST https://server.zhu15929774304.workers.dev/api/mcp \
  -H "Authorization: Bearer dev-mcp-token" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Mcp-Protocol-Version: 2025-06-18" \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "tools/call",
    "params": {
      "name": "create_transaction",
      "arguments": {
        "type": "expense",
        "amount": 135.5,
        "category": "生鲜",
        "note": "MCP西红柿"
      }
    }
  }'
```

### 通过 MCP 查询单笔交易
```bash
curl --proxy http://127.0.0.1:7890 -X POST https://server.zhu15929774304.workers.dev/api/mcp \
  -H "Authorization: Bearer dev-mcp-token" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Mcp-Protocol-Version: 2025-06-18" \
  -d '{
    "jsonrpc": "2.0",
    "id": 4,
    "method": "tools/call",
    "params": {
      "name": "get_transaction",
      "arguments": {
        "id": 1
      }
    }
  }'
```

### 通过 MCP 查询最近交易
```bash
curl --proxy http://127.0.0.1:7890 -X POST https://server.zhu15929774304.workers.dev/api/mcp \
  -H "Authorization: Bearer dev-mcp-token" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Mcp-Protocol-Version: 2025-06-18" \
  -d '{
    "jsonrpc": "2.0",
    "id": 5,
    "method": "tools/call",
    "params": {
      "name": "list_transactions",
      "arguments": {
        "limit": 10
      }
    }
  }'
```

### 通过 MCP 查询本月汇总
```bash
curl --proxy http://127.0.0.1:7890 -X POST https://server.zhu15929774304.workers.dev/api/mcp \
  -H "Authorization: Bearer dev-mcp-token" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{
    "jsonrpc": "2.0",
    "id": 6,
    "method": "tools/call",
    "params": {
      "name": "get_balance_report",
      "arguments": {
        "period": "month"
      }
    }
  }'
```

### 通过 MCP 删除一笔交易
```bash
curl --proxy http://127.0.0.1:7890 -X POST https://server.zhu15929774304.workers.dev/api/mcp \
  -H "Authorization: Bearer dev-mcp-token" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{
    "jsonrpc": "2.0",
    "id": 7,
    "method": "tools/call",
    "params": {
      "name": "delete_transaction",
      "arguments": {
        "id": 1
      }
    }
  }'
```

### 鉴权失败示例
```bash
curl --proxy http://127.0.0.1:7890 -X POST https://server.zhu15929774304.workers.dev/api/mcp \
  -H "Authorization: Bearer wrong-token" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Mcp-Protocol-Version: 2025-06-18" \
  -d '{
    "jsonrpc": "2.0",
    "id": 8,
    "method": "tools/list",
    "params": {}
  }'
```

### 如果你要直连本地 wrangler dev

本地调试时可以不用代理，直接把地址换回 `http://localhost:8787/api/mcp`。

如果你的系统环境里已经设置了全局代理，而你想明确绕过它，可以加：

```bash
curl --noproxy localhost,127.0.0.1 -X POST http://localhost:8787/api/mcp \
  -H "Authorization: Bearer dev-mcp-token" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{
    "jsonrpc": "2.0",
    "id": 9,
    "method": "tools/list",
    "params": {}
  }'
```

这里 `--noproxy localhost,127.0.0.1` 的意思是：
- `localhost` 和 `127.0.0.1` 不走代理
- 其余地址仍然可以继续按系统代理规则处理

### MCP Inspector 调试

#### 前置条件

- 本地服务已启动，地址为 `http://localhost:8787`
- `MCP_TOKEN` 已配置为 `dev-mcp-token`

#### 启动 Inspector

```bash
npx @modelcontextprotocol/inspector
```

#### Inspector 连接配置

- `Transport Type` 选择 `Streamable HTTP`
- `URL` 填入 `http://localhost:8787/api/mcp`
- `Authorization` 里填入 `Bearer dev-mcp-token`

#### 验证顺序

1. 先执行 `tools/list`
2. 再执行 `create_transaction`
3. 接着执行 `get_transaction` 和 `list_transactions`
4. 最后执行 `get_balance_report`

#### 期望结果

- `tools/list` 能看到 `create_transaction`、`get_transaction`、`list_transactions`、`delete_transaction`、`get_balance_report`
- `create_transaction` 能返回新创建的交易
- `list_transactions` 能返回最近交易，且默认限制生效
- `get_balance_report` 能返回周/月汇总
- 鉴权错误时能明确看到 401 或对应 tool error

#### 调试结论

- 这套流程已经在当前代码上实际跑通

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

---

## MCP 客户端联调建议

如果你用 Claude Desktop、Claude Code 或 Cursor 连接这个 MCP，可以先确认下面三点：

1. 远程地址指向 `http://localhost:8787/api/mcp`
2. 鉴权头使用 `Authorization: Bearer dev-mcp-token`
3. 先跑 `tools/list`，确认能看到 `create_transaction`、`get_transaction`、`list_transactions`、`delete_transaction`、`get_balance_report`
