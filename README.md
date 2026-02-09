# 激活服务 (Activation Service)

一个用于 Windows 桌面软件的激活码联网验证服务，提供一次性激活码验证、设备绑定和离线 license 签名功能。

## 功能特性

- ✅ **一次性激活码**：激活码使用后自动作废
- ✅ **设备绑定**：激活时绑定设备码，防止滥用
- ✅ **离线验证**：返回 Ed25519 签名的 license，支持客户端离线校验
- ✅ **零成本部署**：一键部署到 Vercel，使用免费的 Serverless Functions
- ✅ **JSON 存储**：使用文件存储，无需数据库，适合早期验证
- ✅ **二维码支持**：提供激活码展示页面，可生成二维码交付

## 技术栈

- **框架**: Next.js 14 (App Router)
- **运行环境**: Vercel Serverless Functions
- **签名算法**: Ed25519
- **存储方案**: JSON 文件 (可扩展到 Vercel KV/Postgres)

## 快速开始

### 1. 部署到 Vercel

点击下方按钮一键部署：

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/YOUR_USERNAME/activation-service)

### 2. 配置环境变量

部署时需要配置以下环境变量：

| 变量名 | 说明 | 必填 |
|--------|------|------|
| `LICENSE_PRIVATE_KEY` | Ed25519 私钥（Base64 编码） | ✅ |
| `ADMIN_TOKEN` | 管理员 Token（用于管理接口） | ❌ |

#### 生成密钥对

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

⚠️  请将私钥配置到 Vercel 环境变量中:
   LICENSE_PRIVATE_KEY=abcdefghijklmnopqrstuvwxyz1234567890ABCDEFGHIJKLMNOP=

⚠️  请将公钥内置到客户端 EXE 中用于离线验证
```

将**私钥**配置到 Vercel 环境变量，将**公钥**保存到客户端代码中。

### 3. 生成激活码

```bash
# 生成 100 个永久激活码
pnpm generate:codes -n 100 -p lifetime -e 2099-12-31T23:59:59Z

# 生成 50 个试用激活码（1年有效期）
pnpm generate:codes -n 50 -p trial -e 2026-12-31T23:59:59Z

# 导出到 CSV
pnpm generate:codes -n 100 -p lifetime --export codes.csv
```

生成的激活码保存在 `data/codes.json` 文件中。

### 4. 上传激活码到 Vercel

由于 Vercel 部署时不会包含本地文件，需要手动上传激活码：

**方法 A: 通过 Git 提交**
```bash
git add data/codes.json
git commit -m "Add activation codes"
git push
```

**方法 B: 使用 Vercel CLI**
```bash
# 安装 Vercel CLI
npm i -g vercel

# 部署时包含数据文件
vercel --prod
```

**方法 C: 使用 Vercel KV（推荐生产环境）**

在 Vercel 项目中启用 KV 存储，修改 `lib/storage.ts` 使用 KV API。

## API 文档

### POST /api/activate

激活接口，用于验证激活码并返回签名的 license。

#### 请求

```http
POST /api/activate
Content-Type: application/json

{
  "code": "ACT-OuZr21_3SARvtb47Qg2_A",
  "device_hash": "SHA256:4c1bf40a60835318b399d6bfa882e93465a9457ab1be859",
  "app_id": "moments_ai",
  "app_version": "1.0.0"
}
```

#### 成功响应 (200)

```json
{
  "ok": true,
  "license": {
    "schema_version": 1,
    "license_id": "LIC-20260209-0001",
    "app_id": "moments_ai",
    "plan": "lifetime",
    "device_hash": "SHA256:4c1bf40a60835318b399d6bfa882e93465a9457ab1be859",
    "issued_at": "2026-02-09T10:30:00Z",
    "expires_at": "2099-12-31T23:59:59Z",
    "features": {
      "moments_interact": true,
      "ai_settings": true
    },
    "nonce": "abc123xyz789",
    "signature": "ed25519:BASE64_SIGNATURE_HERE"
  }
}
```

#### 错误响应

```json
{
  "ok": false,
  "error": {
    "code": "CODE_USED",
    "message": "激活码已被使用"
  }
}
```

错误码说明：

| 错误码 | 说明 |
|--------|------|
| `CODE_NOT_FOUND` | 激活码不存在 |
| `CODE_USED` | 激活码已被使用 |
| `CODE_EXPIRED` | 激活码已过期 |
| `INVALID_APP_ID` | 无效的应用 ID |
| `INVALID_REQUEST` | 请求参数错误 |

## 激活码页面

访问 `/a/{code}` 可以查看激活码详情，例如：

```
https://your-app.vercel.app/a/ACT-OuZr21_3SARvtb47Qg2_A
```

该页面提供：
- 激活码展示
- 一键复制功能
- 激活说明

可以将该 URL 生成二维码，方便用户扫码获取激活码。

## 客户端集成

### 1. 配置激活服务地址

在客户端 EXE 中配置：

```
ACTIVATION_BASE_URL=https://your-app.vercel.app
```

### 2. 调用激活接口

```python
import requests
import hashlib
import platform

def get_device_hash():
    """生成设备唯一标识"""
    machine_id = platform.node() + platform.machine()
    return "SHA256:" + hashlib.sha256(machine_id.encode()).hexdigest()

def activate(code):
    """激活软件"""
    url = "https://your-app.vercel.app/api/activate"
    data = {
        "code": code,
        "device_hash": get_device_hash(),
        "app_id": "moments_ai",
        "app_version": "1.0.0"
    }
    
    response = requests.post(url, json=data)
    result = response.json()
    
    if result["ok"]:
        license = result["license"]
        # 保存 license 到本地
        save_license(license)
        return True
    else:
        error = result["error"]
        print(f"激活失败: {error['message']}")
        return False
```

### 3. 离线验证 License

```python
import json
import base64
from nacl.signing import VerifyKey
from nacl.exceptions import BadSignatureError

PUBLIC_KEY = "QRSTUVWXYZ1234567890abcdefghijklmnopqrstuvwxyzABCDEF="  # 替换为实际公钥

def verify_license(license_data):
    """离线验证 license 签名"""
    try:
        # 提取签名
        signature_str = license_data.pop("signature")
        signature = base64.b64decode(signature_str.replace("ed25519:", ""))
        
        # 生成 canonical JSON
        canonical_json = json.dumps(license_data, sort_keys=True, separators=(',', ':'))
        message = canonical_json.encode('utf-8')
        
        # 验证签名
        verify_key = VerifyKey(base64.b64decode(PUBLIC_KEY))
        verify_key.verify(message, signature)
        
        return True
    except BadSignatureError:
        return False
```

## 本地开发

```bash
# 安装依赖
pnpm install

# 生成密钥对
pnpm tsx scripts/generate_keypair.ts

# 创建 .env 文件
cp .env.example .env
# 编辑 .env，填入 LICENSE_PRIVATE_KEY

# 生成测试激活码
pnpm generate:codes -n 10

# 启动开发服务器
pnpm dev
```

访问 http://localhost:3000

## 测试激活流程

```bash
# 使用 curl 测试激活接口
curl -X POST http://localhost:3000/api/activate \
  -H "Content-Type: application/json" \
  -d '{
    "code": "ACT-OuZr21_3SARvtb47Qg2_A",
    "device_hash": "SHA256:test123",
    "app_id": "moments_ai",
    "app_version": "1.0.0"
  }'
```

## 项目结构

```
activation-service/
├── app/
│   ├── api/
│   │   └── activate/
│   │       └── route.ts          # 激活接口
│   ├── a/
│   │   └── [code]/
│   │       └── page.tsx          # 激活码页面
│   ├── layout.tsx                # 根布局
│   └── page.tsx                  # 首页
├── lib/
│   ├── types.ts                  # 类型定义
│   ├── crypto.ts                 # 签名工具
│   └── storage.ts                # 存储层
├── scripts/
│   ├── generate_codes.ts         # 激活码生成脚本
│   └── generate_keypair.ts       # 密钥对生成脚本
├── data/
│   ├── codes.json                # 未使用的激活码
│   └── used_codes.json           # 已使用的激活码
├── package.json
├── tsconfig.json
├── next.config.js
├── vercel.json
└── README.md
```

## 安全建议

1. **私钥保护**：永远不要将 `LICENSE_PRIVATE_KEY` 提交到 Git 仓库
2. **HTTPS 强制**：生产环境必须使用 HTTPS
3. **设备绑定**：激活后绑定设备码，防止激活码转移
4. **激活码强度**：使用足够长的随机字符串（默认 16 字节）
5. **日志监控**：监控异常激活请求，及时发现滥用

## 扩展功能

### 使用 Vercel KV 存储

```typescript
// lib/storage.ts
import { kv } from '@vercel/kv';

export async function findCode(code: string) {
  return await kv.get(`code:${code}`);
}

export async function markCodeAsUsed(code: string, deviceHash: string) {
  const activationCode = await kv.get(`code:${code}`);
  if (!activationCode) return false;
  
  activationCode.used = true;
  activationCode.used_at = new Date().toISOString();
  activationCode.device_hash = deviceHash;
  
  await kv.set(`used:${code}`, activationCode);
  await kv.del(`code:${code}`);
  
  return true;
}
```

### 添加管理接口

```typescript
// app/api/admin/stats/route.ts
export async function GET(request: NextRequest) {
  const token = request.headers.get('Authorization');
  if (token !== `Bearer ${process.env.ADMIN_TOKEN}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const allCodes = getAllCodes();
  const usedCodes = getUsedCodes();
  
  return NextResponse.json({
    total: allCodes.length + usedCodes.length,
    unused: allCodes.length,
    used: usedCodes.length,
  });
}
```

## 常见问题

### Q: 激活码在 Vercel 部署后丢失？

A: Vercel 是无状态的，文件系统不持久化。建议：
- 将 `data/codes.json` 提交到 Git
- 或使用 Vercel KV 存储
- 或使用 Vercel Postgres

### Q: 如何批量导入激活码？

A: 编辑 `data/codes.json`，添加激活码数组，然后提交到 Git。

### Q: 如何撤销已使用的激活码？

A: 手动编辑 `data/used_codes.json`，将激活码移回 `data/codes.json` 并重置状态。

### Q: 如何支持多个应用？

A: 修改 `app/api/activate/route.ts` 中的 `ALLOWED_APP_IDS` 数组。

## License

MIT License

## 支持

如有问题，请提交 Issue 或 Pull Request。
