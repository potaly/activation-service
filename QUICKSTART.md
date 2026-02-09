# 快速开始指南

5 分钟快速部署激活服务到 Vercel。

## 步骤 1: 克隆或下载项目

```bash
# 克隆项目
git clone https://github.com/YOUR_USERNAME/activation-service.git
cd activation-service

# 或解压下载的 ZIP 文件
unzip activation-service.zip
cd activation-service
```

## 步骤 2: 安装依赖

```bash
pnpm install
```

## 步骤 3: 生成密钥对

```bash
pnpm tsx scripts/generate_keypair.ts
```

**输出示例**：
```
🔐 生成 Ed25519 密钥对

私钥 (LICENSE_PRIVATE_KEY):
abcdefghijklmnopqrstuvwxyz1234567890ABCDEFGHIJKLMNOP=

公钥 (用于客户端验证):
QRSTUVWXYZ1234567890abcdefghijklmnopqrstuvwxyzABCDEF=
```

**保存私钥和公钥**，稍后会用到。

## 步骤 4: 生成激活码

```bash
# 生成 10 个测试激活码
pnpm generate:codes -n 10 -p lifetime -e 2099-12-31T23:59:59Z
```

查看生成的激活码：
```bash
cat data/codes.json
```

## 步骤 5: 推送到 GitHub

```bash
# 初始化 Git（如果还没有）
git init
git add .
git commit -m "Initial commit"

# 添加远程仓库（替换为你的 GitHub 用户名）
git remote add origin https://github.com/YOUR_USERNAME/activation-service.git

# 推送代码
git branch -M main
git push -u origin main
```

## 步骤 6: 部署到 Vercel

### 方法 A: 网页部署（推荐新手）

1. 访问 [vercel.com](https://vercel.com)
2. 点击 **Add New...** → **Project**
3. 选择 **Import Git Repository**
4. 选择你的 `activation-service` 仓库
5. 在 **Environment Variables** 中添加：
   - Key: `LICENSE_PRIVATE_KEY`
   - Value: `你的私钥（从步骤 3 获取）`
6. 点击 **Deploy**

### 方法 B: CLI 部署（推荐开发者）

```bash
# 安装 Vercel CLI
npm i -g vercel

# 登录
vercel login

# 部署
vercel

# 添加环境变量
vercel env add LICENSE_PRIVATE_KEY
# 粘贴私钥

# 生产部署
vercel --prod
```

## 步骤 7: 获取部署地址

部署成功后，Vercel 会显示你的服务地址：

```
https://activation-service-abc123.vercel.app
```

## 步骤 8: 测试激活

```bash
# 从 data/codes.json 中复制一个激活码
CODE="ACT-OuZr21_3SARvtb47Qg2_A"

# 替换为你的 Vercel 地址
URL="https://activation-service-abc123.vercel.app"

# 测试激活
curl -X POST $URL/api/activate \
  -H "Content-Type: application/json" \
  -d '{
    "code": "'$CODE'",
    "device_hash": "SHA256:test123",
    "app_id": "moments_ai",
    "app_version": "1.0.0"
  }'
```

**成功响应**：
```json
{
  "ok": true,
  "license": {
    "schema_version": 1,
    "license_id": "LIC-20260209-0001",
    ...
  }
}
```

## 步骤 9: 配置客户端

在你的 Windows 桌面软件中：

```python
# 配置激活服务地址
ACTIVATION_BASE_URL = "https://activation-service-abc123.vercel.app"

# 配置公钥（从步骤 3 获取）
PUBLIC_KEY = "QRSTUVWXYZ1234567890abcdefghijklmnopqrstuvwxyzABCDEF="
```

参考 `examples/client_example.py` 集成激活功能。

## 完成！

现在你的激活服务已经运行在 Vercel 上了！

## 下一步

- 📖 阅读 [README.md](./README.md) 了解详细功能
- 🚀 阅读 [DEPLOYMENT.md](./DEPLOYMENT.md) 了解部署细节
- 💻 查看 [examples/client_example.py](./examples/client_example.py) 学习客户端集成

## 常见问题

### Q: 激活码在哪里？

A: 在 `data/codes.json` 文件中。

### Q: 如何添加更多激活码？

A: 运行 `pnpm generate:codes -n 100`，然后 `git push`。

### Q: 如何查看已使用的激活码？

A: 查看 `data/used_codes.json` 文件。

### Q: 如何自定义域名？

A: 在 Vercel 项目设置中添加域名，参考 [DEPLOYMENT.md](./DEPLOYMENT.md)。

## 需要帮助？

提交 Issue 或查看文档：
- [README.md](./README.md)
- [DEPLOYMENT.md](./DEPLOYMENT.md)
