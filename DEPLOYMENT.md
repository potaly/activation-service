# 部署指南

本文档详细说明如何将激活服务部署到 Vercel。

## 前置准备

1. **GitHub 账号**：用于托管代码
2. **Vercel 账号**：用于部署服务（可使用 GitHub 登录）
3. **Node.js 环境**：用于本地测试（可选）

## 部署步骤

### 第一步：创建 GitHub 仓库

1. 登录 [GitHub](https://github.com)
2. 点击右上角 `+` → `New repository`
3. 填写仓库信息：
   - Repository name: `activation-service`
   - Description: `Activation code verification service`
   - 选择 `Public` 或 `Private`
4. 点击 `Create repository`

### 第二步：上传代码到 GitHub

```bash
# 进入项目目录
cd /path/to/activation-service

# 添加远程仓库（替换为你的 GitHub 用户名）
git remote add origin https://github.com/YOUR_USERNAME/activation-service.git

# 推送代码
git branch -M main
git push -u origin main
```

### 第三步：生成密钥对

在本地运行以下命令生成密钥对：

```bash
# 安装依赖
pnpm install

# 生成密钥对
pnpm tsx scripts/generate_keypair.ts
```

输出示例：
```
🔐 生成 Ed25519 密钥对

私钥 (LICENSE_PRIVATE_KEY):
abcdefghijklmnopqrstuvwxyz1234567890ABCDEFGHIJKLMNOP=

公钥 (用于客户端验证):
QRSTUVWXYZ1234567890abcdefghijklmnopqrstuvwxyzABCDEF=
```

**重要**：
- 将**私钥**保存到安全的地方，稍后配置到 Vercel
- 将**公钥**保存到客户端代码中，用于离线验证

### 第四步：生成激活码

```bash
# 生成 100 个永久激活码
pnpm generate:codes -n 100 -p lifetime -e 2099-12-31T23:59:59Z

# 查看生成的激活码
cat data/codes.json
```

### 第五步：提交激活码到 GitHub

```bash
# 提交激活码
git add data/codes.json
git commit -m "Add activation codes"
git push
```

### 第六步：部署到 Vercel

#### 方法 A: 通过 Vercel 网站部署（推荐）

1. 访问 [Vercel](https://vercel.com)
2. 点击 `Add New...` → `Project`
3. 选择 `Import Git Repository`
4. 选择你的 `activation-service` 仓库
5. 配置项目：
   - Framework Preset: `Next.js`
   - Root Directory: `./`
   - Build Command: `next build`
   - Output Directory: `.next`
6. 点击 `Environment Variables`，添加环境变量：
   - Key: `LICENSE_PRIVATE_KEY`
   - Value: `你的私钥（从第三步获取）`
7. 点击 `Deploy`

#### 方法 B: 通过 Vercel CLI 部署

```bash
# 安装 Vercel CLI
npm i -g vercel

# 登录 Vercel
vercel login

# 部署
vercel

# 添加环境变量
vercel env add LICENSE_PRIVATE_KEY

# 生产部署
vercel --prod
```

### 第七步：获取部署地址

部署成功后，Vercel 会提供一个地址，例如：

```
https://activation-service-abc123.vercel.app
```

这就是你的**激活服务地址**（`ACTIVATION_BASE_URL`）。

### 第八步：测试激活接口

使用 curl 测试激活接口：

```bash
# 从 data/codes.json 中复制一个激活码
CODE="ACT-OuZr21_3SARvtb47Qg2_A"

# 测试激活
curl -X POST https://activation-service-abc123.vercel.app/api/activate \
  -H "Content-Type: application/json" \
  -d '{
    "code": "'$CODE'",
    "device_hash": "SHA256:test123",
    "app_id": "moments_ai",
    "app_version": "1.0.0"
  }'
```

成功响应示例：
```json
{
  "ok": true,
  "license": {
    "schema_version": 1,
    "license_id": "LIC-20260209-0001",
    "app_id": "moments_ai",
    "plan": "lifetime",
    "device_hash": "SHA256:test123",
    "issued_at": "2026-02-09T10:30:00Z",
    "expires_at": "2099-12-31T23:59:59Z",
    "features": {
      "moments_interact": true,
      "ai_settings": true
    },
    "nonce": "abc123xyz789",
    "signature": "ed25519:..."
  }
}
```

### 第九步：配置客户端

在你的 Windows 桌面软件中配置激活服务地址：

```python
ACTIVATION_BASE_URL = "https://activation-service-abc123.vercel.app"
PUBLIC_KEY = "QRSTUVWXYZ1234567890abcdefghijklmnopqrstuvwxyzABCDEF="  # 从第三步获取
```

参考 `examples/client_example.py` 集成激活功能。

## 自定义域名（可选）

如果你有自己的域名，可以在 Vercel 中配置：

1. 进入 Vercel 项目设置
2. 点击 `Domains`
3. 添加你的域名，例如 `activate.yourdomain.com`
4. 按照提示配置 DNS 记录

配置完成后，激活服务地址变为：
```
https://activate.yourdomain.com
```

## 更新激活码

### 方法 A: 通过 Git 更新

```bash
# 生成新的激活码
pnpm generate:codes -n 50 -p lifetime

# 提交并推送
git add data/codes.json
git commit -m "Add more activation codes"
git push

# Vercel 会自动重新部署
```

### 方法 B: 使用 Vercel KV（推荐生产环境）

1. 在 Vercel 项目中启用 KV 存储
2. 修改 `lib/storage.ts` 使用 KV API
3. 通过 API 或管理界面添加激活码

## 监控和日志

### 查看部署日志

1. 进入 Vercel 项目页面
2. 点击 `Deployments`
3. 选择一个部署，查看构建日志

### 查看运行日志

1. 进入 Vercel 项目页面
2. 点击 `Logs`
3. 查看实时日志

### 监控激活请求

在 `app/api/activate/route.ts` 中添加日志：

```typescript
console.log('Activation request:', {
  code: code.substring(0, 10) + '...',
  device_hash: device_hash.substring(0, 20) + '...',
  app_id,
  timestamp: new Date().toISOString(),
});
```

## 故障排查

### 问题 1: 激活码不存在

**原因**：`data/codes.json` 文件未提交到 Git 或为空

**解决**：
```bash
# 确认文件存在且有内容
cat data/codes.json

# 提交到 Git
git add data/codes.json
git commit -m "Add activation codes"
git push
```

### 问题 2: 签名验证失败

**原因**：环境变量 `LICENSE_PRIVATE_KEY` 未配置或配置错误

**解决**：
1. 进入 Vercel 项目设置
2. 点击 `Environment Variables`
3. 检查 `LICENSE_PRIVATE_KEY` 是否正确
4. 重新部署项目

### 问题 3: 激活后再次激活失败

**原因**：激活码已被使用，移动到了 `data/used_codes.json`

**解决**：这是正常行为。如需重置，手动编辑 JSON 文件。

### 问题 4: 部署后文件丢失

**原因**：Vercel 是无状态的，运行时写入的文件不会持久化

**解决**：
- 将激活码提交到 Git
- 或使用 Vercel KV 存储
- 或使用 Vercel Postgres

## 成本估算

### Vercel 免费计划限制

- 100 GB 带宽/月
- 100 小时 Serverless 执行时间/月
- 无限部署次数

### 估算

假设每次激活请求：
- 执行时间：~100ms
- 带宽：~2KB

则免费计划可支持：
- **100 小时 ÷ 0.1 秒 = 360 万次激活请求/月**
- **100 GB ÷ 2KB = 5000 万次激活请求/月**

对于早期产品验证，完全足够。

## 升级到生产环境

当激活量增大时，建议：

1. **使用 Vercel KV 存储**：替代 JSON 文件
2. **启用 CDN**：加速全球访问
3. **添加监控**：使用 Vercel Analytics
4. **设置告警**：异常激活请求通知
5. **备份数据**：定期导出激活记录

## 安全加固

1. **限流**：防止暴力破解激活码
2. **IP 白名单**：限制管理接口访问
3. **日志审计**：记录所有激活请求
4. **密钥轮换**：定期更换签名密钥

## 总结

完成以上步骤后，你的激活服务已成功部署到 Vercel，可以开始使用了！

**关键信息汇总**：
- 激活服务地址：`https://your-app.vercel.app`
- 激活接口：`POST /api/activate`
- 激活码页面：`/a/{code}`
- 私钥：配置在 Vercel 环境变量
- 公钥：内置到客户端 EXE

如有问题，请参考 [README.md](./README.md) 或提交 Issue。
