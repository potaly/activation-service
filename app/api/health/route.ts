import { NextRequest, NextResponse } from 'next/server';
import { getCodesStats } from '@/lib/storage';

export async function GET(request: NextRequest) {
  // 检查 ADMIN_TOKEN
  const adminToken = process.env.ADMIN_TOKEN;
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');
  
  if (adminToken && token !== adminToken) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }
  
  // 检查私钥配置
  const privateKeyBase64 = process.env.LICENSE_PRIVATE_KEY;
  let hasPrivateKey = false;
  let decodedKeyLength = 0;
  let privateKeyError = null;
  
  if (privateKeyBase64) {
    hasPrivateKey = true;
    try {
      const decoded = Buffer.from(privateKeyBase64, 'base64');
      decodedKeyLength = decoded.length;
    } catch (error: any) {
      privateKeyError = error.message;
    }
  }
  
  // 获取激活码统计
  const stats = getCodesStats();
  
  return NextResponse.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: {
      has_private_key: hasPrivateKey,
      decoded_key_length: decodedKeyLength,
      private_key_error: privateKeyError,
      has_admin_token: !!process.env.ADMIN_TOKEN,
    },
    codes: stats,
    warnings: [
      'Vercel Serverless uses read-only filesystem',
      'Used codes are cached in memory only',
      'Cache is lost on instance restart',
      'Consider using Vercel KV for production',
    ],
  });
}
