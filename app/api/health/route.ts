import { NextRequest, NextResponse } from 'next/server';
import { getStats, healthCheck } from '@/lib/storage-redis';

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
  
  // 检查 Redis 连接
  const redisHealth = await healthCheck();
  
  // 获取激活码统计
  const stats = await getStats();
  
  // 检查环境变量
  const hasRedisEnv = !!(
    process.env.KV_REST_API_URL || 
    process.env.UPSTASH_REDIS_REST_URL ||
    process.env.REDIS_URL
  );
  
  return NextResponse.json({
    status: redisHealth.redis_connected ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    environment: {
      has_private_key: hasPrivateKey,
      decoded_key_length: decodedKeyLength,
      private_key_error: privateKeyError,
      has_admin_token: !!process.env.ADMIN_TOKEN,
      has_redis_env: hasRedisEnv,
    },
    redis: redisHealth,
    codes: stats,
    info: [
      'Using Upstash Redis for persistent storage',
      'Activation codes are strictly one-time use',
      'All Serverless instances share the same state',
    ],
  });
}
