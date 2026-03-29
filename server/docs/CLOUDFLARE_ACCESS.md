# Cloudflare Access 零信任网络访问

## 什么是 Cloudflare Access

Cloudflare Access 是一个**零信任网络访问**（Zero Trust）产品，用于在不暴露服务端口的情况下安全访问内部资源。

### 工作原理

**传统方式（暴露端口）：**
```
用户 → 直接访问你的服务（暴露公网IP:端口）→ 服务
```

**Cloudflare Access 方式：**
```
用户 → Cloudflare Gate → 验证身份 → 你的服务
```

所有流量都经过 Cloudflare 代理，用户无法直接访问到你的源站。

---

## 核心特点

### 1. 替代传统 VPN
- 不需要远程接入 VPN
- 员工/用户通过 Cloudflare 全球网络安全访问内部系统
- 只需 DNS 解析到 Cloudflare，无需开放防火墙端口

### 2. 多种身份验证方式
- Google Workspace
- GitHub
- Okta、SAML 协议
- One-time PIN（一次性密码）
- 支持添加多个身份提供商（IdP）

### 3. 设备姿态检查（Device Posture）
- 要求用户设备符合安全策略
- 例如：必须安装杀毒软件、操作系统版本要求、硬盘加密等

### 4. 访问日志审计
- 记录谁、在什么时间、访问了什么资源
- 可用于合规审计和安全分析

---

## 适用场景

| 场景 | 适合用 Access？ | 原因 |
|------|----------------|------|
| 公开 API（移动 App） | ❌ 不适合 | App 无法完成 OAuth 登录流程 |
| 内部管理后台 | ✅ 非常适合 | 团队成员可通过 SSO 登录 |
| 面向合作伙伴的 Portal | ✅ 适合 | 合作伙伴可通过企业 IdP 登录 |
| 团队内部工具 | ✅ 适合 | 无需 VPN，开箱即用 |

---

## 套餐对比

| 套餐 | 价格 | 适用场景 |
|------|------|----------|
| **Free** | $0 | 基础体验，5 用户限制 |
| **Pro** | $20/月 | 小团队，20 用户 |
| **Business** | $200/月 | 中型企业，自定义规则 |
| **Enterprise** | 定制 | 大型组织，SLA 保障 |

---

## Cloudflare Access vs API Key vs DDoS 防护

这是三个不同层面的保护，需要组合使用：

| 保护类型 | 作用 | 解决的问题 |
|----------|------|-----------|
| **API Key 认证** | 身份验证 | 防止未授权应用/用户访问 API |
| **速率限制** | 流量控制 | 防止高频请求刷接口 |
| **Cloudflare DDoS 防护** | 可用性保护 | 防止大流量攻击使服务下线 |
| **Cloudflare Access** | 网络层保护 | 保护内部系统免受直接暴露 |

---

## MoneyJar 项目的建议

对于 MoneyJar 移动端 API：
- **API Key 认证**：✅ 推荐，用于保护公开 API
- **Cloudflare Access**：❌ 当前不需要，未来有管理后台时考虑
- **速率限制**：✅ 推荐，防止恶意刷接口
- **DDoS 防护**：Cloudflare 自动提供，Free 套餐够用

---

## 更多资料

- [Cloudflare Access 官方文档](https://developers.cloudflare.com/cloudflare-one/policies/access/)
- [零信任安全模型介绍](https://www.cloudflare.com/learning/security/what-is-zero-trust/)
