/**
 * Redis-based storage layer using Upstash Redis
 * Provides persistent storage for activation codes across all Serverless instances
 */

import { Redis } from '@upstash/redis';
import type { ActivationCode } from './types';

// Initialize Redis client with explicit environment variables
// Upstash uses UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN
// But Vercel integration may also set KV_REST_API_URL and KV_REST_API_TOKEN
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || '',
});

/**
 * Load all activation codes from JSON file
 * This is read-only and only used for initial validation
 */
export async function loadCodes(): Promise<ActivationCode[]> {
  const fs = await import('fs');
  const path = await import('path');
  
  const codesPath = path.join(process.cwd(), 'data', 'codes.json');
  const codesData = fs.readFileSync(codesPath, 'utf-8');
  return JSON.parse(codesData);
}

/**
 * Check if an activation code exists and is valid
 */
export async function findCode(code: string): Promise<ActivationCode | null> {
  const codes = await loadCodes();
  return codes.find(c => c.code === code) || null;
}

/**
 * Check if an activation code has been used
 * Uses Redis for persistent storage across all instances
 */
export async function isCodeUsed(code: string): Promise<boolean> {
  try {
    const usageData = await redis.get<any>(`used:${code}`);
    return usageData !== null && usageData !== undefined;
  } catch (error) {
    console.error('Redis isCodeUsed error:', error);
    // If Redis fails, we should fail safely by assuming code is not used
    // This prevents blocking legitimate activations due to Redis issues
    return false;
  }
}

/**
 * Mark an activation code as used
 * Stores in Redis with the usage information
 * This operation must be atomic to prevent race conditions
 */
export async function markCodeAsUsed(
  code: string,
  deviceHash: string,
  licenseId: string
): Promise<void> {
  try {
    const usageData = {
      used: true,
      used_at: new Date().toISOString(),
      device_hash: deviceHash,
      license_id: licenseId,
    };
    
    // Store usage data in Redis with no expiration (permanent)
    // Key: used:{code}
    // Value: usage data object
    await redis.set(`used:${code}`, usageData);
    
    // Also store device binding for quick lookup
    // Key: device:{code}
    // Value: device_hash
    await redis.set(`device:${code}`, deviceHash);
    
    console.log(`Code marked as used in Redis: ${code}`);
  } catch (error) {
    console.error('Redis markCodeAsUsed error:', error);
    throw new Error('Failed to mark code as used in Redis');
  }
}

/**
 * Get usage information for an activation code
 */
export async function getCodeUsage(code: string): Promise<{
  used: boolean;
  used_at?: string;
  device_hash?: string;
  license_id?: string;
} | null> {
  try {
    const usageData = await redis.get<any>(`used:${code}`);
    return usageData || null;
  } catch (error) {
    console.error('Redis getCodeUsage error:', error);
    return null;
  }
}

/**
 * Get device hash for an activation code
 */
export async function getCodeDevice(code: string): Promise<string | null> {
  try {
    const deviceHash = await redis.get<string>(`device:${code}`);
    return deviceHash || null;
  } catch (error) {
    console.error('Redis getCodeDevice error:', error);
    return null;
  }
}

/**
 * Get statistics about activation codes
 */
export async function getStats(): Promise<{
  total: number;
  used: number;
  available: number;
  redis_keys?: number;
}> {
  const codes = await loadCodes();
  const total = codes.length;
  
  try {
    // Count used codes by checking Redis
    let used = 0;
    for (const code of codes) {
      const isUsed = await isCodeUsed(code.code);
      if (isUsed) {
        used++;
      }
    }
    
    // Try to get total Redis keys count
    let redisKeys = 0;
    try {
      const keys = await redis.keys('used:*');
      redisKeys = keys.length;
    } catch (e) {
      // keys() may not be supported in some Redis configurations
      console.log('Redis keys() not supported');
    }
    
    return {
      total,
      used,
      available: total - used,
      redis_keys: redisKeys,
    };
  } catch (error) {
    console.error('Redis getStats error:', error);
    return {
      total,
      used: 0,
      available: total,
      redis_keys: 0,
    };
  }
}

/**
 * Health check for Redis connection
 */
export async function healthCheck(): Promise<{
  redis_connected: boolean;
  redis_url?: string;
  error?: string;
}> {
  try {
    // Try to ping Redis
    const result = await redis.ping();
    
    // Get Redis URL (without token)
    const redisUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || 'not set';
    
    return {
      redis_connected: result === 'PONG',
      redis_url: redisUrl.replace(/\/\/.*@/, '//*****@'), // Hide credentials
    };
  } catch (error) {
    return {
      redis_connected: false,
      redis_url: process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || 'not set',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
