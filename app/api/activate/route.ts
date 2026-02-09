import { NextRequest, NextResponse } from 'next/server';
import { ActivateRequest, License, ApiResponse } from '@/lib/types';
import { findCode, markCodeAsUsed } from '@/lib/storage';
import { signData } from '@/lib/crypto';

const ALLOWED_APP_IDS = ['moments_ai'];

export async function POST(request: NextRequest) {
  try {
    // 解析请求体
    const body: ActivateRequest = await request.json();
    const { code, device_hash, app_id, app_version } = body;

    // 验证必填字段
    if (!code || !device_hash || !app_id || !app_version) {
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
    const activationCode = findCode(code);
    if (!activationCode) {
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

    // 检查是否已使用
    if (activationCode.used) {
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

    // 检查是否过期
    const expiresAt = new Date(activationCode.expires_at);
    if (expiresAt < new Date()) {
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

    // 标记激活码为已使用
    const success = markCodeAsUsed(code, device_hash);
    if (!success) {
      return NextResponse.json<ApiResponse>(
        {
          ok: false,
          error: {
            code: 'CODE_NOT_FOUND',
            message: '激活码标记失败',
          },
        },
        { status: 500 }
      );
    }

    // 生成 license
    const now = new Date();
    const licenseId = `LIC-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;

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

    const signature = await signData(license, privateKey);
    license.signature = `ed25519:${signature}`;

    // 返回成功响应
    return NextResponse.json<ApiResponse>({
      ok: true,
      license,
    });
  } catch (error) {
    console.error('Activation error:', error);
    return NextResponse.json<ApiResponse>(
      {
        ok: false,
        error: {
          code: 'INVALID_REQUEST',
          message: '服务器内部错误',
        },
      },
      { status: 500 }
    );
  }
}
