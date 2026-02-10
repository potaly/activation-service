import { NextRequest, NextResponse } from 'next/server';
import { ActivateRequest, License, ApiResponse } from '@/lib/types';
import { codeExists, markCodeAsUsed } from '@/lib/storage-redis';
import { signData } from '@/lib/crypto';

const ALLOWED_APP_IDS = ['moments_ai'];
const LICENSE_EXPIRES_AT = '2099-12-31T23:59:59Z';

export async function POST(request: NextRequest) {
  try {
    console.log('[Activate] Received activation request');
    
    // 解析请求体
    const body: ActivateRequest = await request.json();
    const { code, device_hash, app_id, app_version } = body;

    console.log(`[Activate] Request: code=${code}, app_id=${app_id}, device_hash=${device_hash?.substring(0, 8)}...`);

    // 验证必填字段
    if (!code || !device_hash || !app_id || !app_version) {
      console.log('[Activate] Missing required fields');
      return NextResponse.json<ApiResponse>(
        {
          ok: false,
          error: {
            code: 'INVALID_REQUEST',
            message: '缺少必填字段',
          },
        },
        { status: 400 }
      );
    }

    // 验证 app_id
    if (!ALLOWED_APP_IDS.includes(app_id)) {
      console.log(`[Activate] Invalid app_id: ${app_id}`);
      return NextResponse.json<ApiResponse>(
        {
          ok: false,
          error: {
            code: 'INVALID_APP_ID',
            message: '无效的应用 ID',
          },
        },
        { status: 400 }
      );
    }

    // 检查激活码是否存在
    console.log(`[Activate] Checking if code exists: ${code}`);
    const exists = await codeExists(code);
    if (!exists) {
      console.log(`[Activate] Code not found: ${code}`);
      return NextResponse.json<ApiResponse>(
        {
          ok: false,
          error: {
            code: 'CODE_NOT_FOUND',
            message: '激活码不存在',
          },
        },
        { status: 404 }
      );
    }

    console.log(`[Activate] Code exists: ${code}`);

    // 生成 license ID
    const now = new Date();
    const licenseId = `LIC-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;

    console.log(`[Activate] Generated license_id: ${licenseId}`);

    // 原子性标记激活码为已使用
    console.log(`[Activate] Attempting to mark code as used: ${code}`);
    const marked = await markCodeAsUsed(code, device_hash, licenseId);
    
    if (!marked) {
      console.log(`[Activate] Code already used or marking failed: ${code}`);
      return NextResponse.json<ApiResponse>(
        {
          ok: false,
          error: {
            code: 'CODE_USED',
            message: '激活码已被使用',
          },
        },
        { status: 400 }
      );
    }

    console.log(`[Activate] Successfully marked code as used: ${code}`);

    // 构建 License 对象
    const license: License = {
      schema_version: 1,
      license_id: licenseId,
      app_id,
      plan: 'lifetime',
      device_hash,
      issued_at: now.toISOString(),
      expires_at: LICENSE_EXPIRES_AT,
      features: {
        moments_interact: true,
        ai_settings: true,
      },
      nonce: Math.random().toString(36).substring(2, 15),
    };

    // 签名
    const privateKey = process.env.LICENSE_PRIVATE_KEY;
    if (!privateKey) {
      console.error('[Activate] Missing LICENSE_PRIVATE_KEY');
      return NextResponse.json<ApiResponse>(
        {
          ok: false,
          error: {
            code: 'SERVER_ERROR',
            message: '服务器配置错误：缺少私钥',
          },
        },
        { status: 500 }
      );
    }

    console.log('[Activate] Signing license...');
    const signature = await signData(license, privateKey);
    license.signature = `ed25519:${signature}`;

    console.log(`[Activate] Activation successful: ${code} -> ${licenseId}`);

    // 返回成功响应
    return NextResponse.json<ApiResponse>({
      ok: true,
      license,
    });
  } catch (error: any) {
    // 详细的错误日志
    console.error('[Activate] Error:', error);
    console.error('[Activate] Error stack:', error.stack);
    console.error('[Activate] Error message:', error.message);
    
    return NextResponse.json<ApiResponse>(
      {
        ok: false,
        error: {
          code: 'SERVER_ERROR',
          message: process.env.NODE_ENV === 'development' 
            ? `服务器内部错误: ${error.message}`
            : '服务器内部错误',
        },
      },
      { status: 500 }
    );
  }
}
