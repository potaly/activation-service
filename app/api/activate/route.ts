import { NextRequest, NextResponse } from 'next/server';
import { ActivateRequest, License, ApiResponse } from '@/lib/types';
import { findCode, markCodeAsUsedAtomic } from '@/lib/storage-redis';
import { signData } from '@/lib/crypto';

const ALLOWED_APP_IDS = ['moments_ai'];

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

    // 查找激活码
    console.log(`[Activate] Looking up activation code: ${code}`);
    const activationCode = await findCode(code);
    if (!activationCode) {
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

    console.log(`[Activate] Found activation code: ${code}, plan=${activationCode.plan}`);

    // 检查是否过期
    const expiresAt = new Date(activationCode.expires_at);
    if (expiresAt < new Date()) {
      console.log(`[Activate] Code expired: ${code}, expires_at=${activationCode.expires_at}`);
      return NextResponse.json<ApiResponse>(
        {
          ok: false,
          error: {
            code: 'CODE_EXPIRED',
            message: '激活码已过期',
          },
        },
        { status: 400 }
      );
    }

    // 生成 license
    const now = new Date();
    const licenseId = `LIC-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;

    console.log(`[Activate] Generated license_id: ${licenseId}`);

    // 原子性标记激活码为已使用（在生成签名之前）
    // 使用 SETNX 确保只有一个请求能成功
    console.log(`[Activate] Attempting atomic mark as used: ${code}`);
    const marked = await markCodeAsUsedAtomic(code, device_hash, licenseId);
    
    if (!marked) {
      console.log(`[Activate] Code already used (atomic check failed): ${code}`);
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
      plan: activationCode.plan,
      device_hash,
      issued_at: now.toISOString(),
      expires_at: activationCode.expires_at,
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
            code: 'INVALID_REQUEST',
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
