/**
 * Redis-based storage layer using Upstash Redis
 * Provides persistent storage for activation codes across all Serverless instances
 */

import { Redis } from '@upstash/redis';
import type { ActivationCode } from './types';

// Initialize Redis client from environment variables
// Vercel automatically sets these when Upstash Redis is connected
const redis = Redis.fromEnv();

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
  const used = await redis.get<boolean>(`used:${code}`);
  return used === true;
}

/**
 * Mark an activation code as used
 * Stores in Redis with the usage information
 */
export async function markCodeAsUsed(
  code: string,
  deviceHash: string,
  licenseId: string
): Promise<void> {
  const usageData = {
    used: true,
    used_at: new Date().toISOString(),
    device_hash: deviceHash,
    license_id: licenseId,
  };
  
  // Store usage data in Redis
  // Key: used:{code}
  // Value: usage data object
  await redis.set(`used:${code}`, usageData);
  
  // Also store device binding for quick lookup
  // Key: device:{code}
  // Value: device_hash
  await redis.set(`device:${code}`, deviceHash);
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
  const usageData = await redis.get<any>(`used:${code}`);
  return usageData || null;
}

/**
 * Get device hash for an activation code
 */
export async function getCodeDevice(code: string): Promise<string | null> {
  const deviceHash = await redis.get<string>(`device:${code}`);
  return deviceHash || null;
}

/**
 * Get statistics about activation codes
 */
export async function getStats(): Promise<{
  total: number;
  used: number;
  available: number;
}> {
  const codes = await loadCodes();
  const total = codes.length;
  
  // Count used codes by checking Redis
  let used = 0;
  for (const code of codes) {
    const isUsed = await isCodeUsed(code.code);
    if (isUsed) {
      used++;
    }
  }
  
  return {
    total,
    used,
    available: total - used,
  };
}

/**
 * Health check for Redis connection
 */
export async function healthCheck(): Promise<{
  redis_connected: boolean;
  error?: string;
}> {
  try {
    // Try to ping Redis
    await redis.ping();
    return { redis_connected: true };
  } catch (error) {
    return {
      redis_connected: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
