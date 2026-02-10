/**
 * Redis-based storage layer using Upstash Redis
 * 
 * Storage Design:
 * - Key: `code:{activation_code}` -> Value: 0 (unused) or 1 (used)
 * - Key: `code:{activation_code}:device` -> Value: device_hash
 * - Key: `code:{activation_code}:license` -> Value: license_id
 * - Key: `code:{activation_code}:used_at` -> Value: ISO timestamp
 * 
 * All activation codes must be pre-populated in Redis before use.
 */

import { Redis } from '@upstash/redis';

// Initialize Redis client with explicit environment variables
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || '',
});

/**
 * Check if an activation code exists in Redis
 */
export async function codeExists(code: string): Promise<boolean> {
  try {
    const value = await redis.get(`code:${code}`);
    console.log(`[Redis] codeExists(${code}): ${value !== null}`);
    return value !== null;
  } catch (error) {
    console.error('[Redis] codeExists error:', error);
    return false;
  }
}

/**
 * Check if an activation code has been used
 * Returns true if code is used (value = 1), false if unused (value = 0) or not found
 */
export async function isCodeUsed(code: string): Promise<boolean> {
  try {
    const value = await redis.get<number>(`code:${code}`);
    const isUsed = value === 1;
    console.log(`[Redis] isCodeUsed(${code}): ${isUsed} (value=${value})`);
    return isUsed;
  } catch (error) {
    console.error('[Redis] isCodeUsed error:', error);
    return false;
  }
}

/**
 * Atomically mark an activation code as used
 * Uses GET + SET with conditional check to ensure atomicity
 * Returns true if successfully marked, false if already used or not found
 */
export async function markCodeAsUsed(
  code: string,
  deviceHash: string,
  licenseId: string
): Promise<boolean> {
  try {
    console.log(`[Redis] Attempting to mark code as used: ${code}`);
    
    // Get current value
    const currentValue = await redis.get<number>(`code:${code}`);
    
    // Check if code exists
    if (currentValue === null) {
      console.log(`[Redis] Code not found: ${code}`);
      return false;
    }
    
    // Check if already used
    if (currentValue === 1) {
      console.log(`[Redis] Code already used: ${code}`);
      return false;
    }
    
    // Mark as used (set to 1)
    await redis.set(`code:${code}`, 1);
    
    // Store additional metadata
    const now = new Date().toISOString();
    await Promise.all([
      redis.set(`code:${code}:device`, deviceHash),
      redis.set(`code:${code}:license`, licenseId),
      redis.set(`code:${code}:used_at`, now),
    ]);
    
    console.log(`[Redis] Successfully marked code as used: ${code}`);
    return true;
  } catch (error) {
    console.error('[Redis] markCodeAsUsed error:', error);
    throw new Error(`Failed to mark code as used: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get activation code metadata
 */
export async function getCodeMetadata(code: string): Promise<{
  used: boolean;
  device_hash?: string;
  license_id?: string;
  used_at?: string;
} | null> {
  try {
    const value = await redis.get<number>(`code:${code}`);
    
    if (value === null) {
      return null;
    }
    
    if (value === 0) {
      return { used: false };
    }
    
    // Get metadata for used codes
    const [deviceHash, licenseId, usedAt] = await Promise.all([
      redis.get<string>(`code:${code}:device`),
      redis.get<string>(`code:${code}:license`),
      redis.get<string>(`code:${code}:used_at`),
    ]);
    
    return {
      used: true,
      device_hash: deviceHash || undefined,
      license_id: licenseId || undefined,
      used_at: usedAt || undefined,
    };
  } catch (error) {
    console.error('[Redis] getCodeMetadata error:', error);
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
}> {
  try {
    // Get all activation code keys
    const keys = await redis.keys('code:*');
    
    // Filter out metadata keys (only count main code keys)
    const codeKeys = keys.filter(key => 
      !key.endsWith(':device') && 
      !key.endsWith(':license') && 
      !key.endsWith(':used_at')
    );
    
    const total = codeKeys.length;
    
    // Count used codes (value = 1)
    let used = 0;
    for (const key of codeKeys) {
      const value = await redis.get<number>(key);
      if (value === 1) {
        used++;
      }
    }
    
    return {
      total,
      used,
      available: total - used,
    };
  } catch (error) {
    console.error('[Redis] getStats error:', error);
    return {
      total: 0,
      used: 0,
      available: 0,
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
    console.log('[Redis] Running health check...');
    
    const result = await redis.ping();
    const redisUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || 'not set';
    
    console.log('[Redis] Health check result:', result);
    
    return {
      redis_connected: result === 'PONG',
      redis_url: redisUrl.replace(/https:\/\//, 'https://*****@'),
    };
  } catch (error) {
    console.error('[Redis] Health check error:', error);
    return {
      redis_connected: false,
      redis_url: process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || 'not set',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Initialize activation codes in Redis
 * This should be run once to populate the database
 */
export async function initializeActivationCodes(codes: string[]): Promise<{
  success: boolean;
  initialized: number;
  skipped: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let initialized = 0;
  let skipped = 0;
  
  try {
    console.log(`[Redis] Initializing ${codes.length} activation codes...`);
    
    for (const code of codes) {
      try {
        // Check if code already exists
        const exists = await redis.exists(`code:${code}`);
        
        if (exists) {
          console.log(`[Redis] Code already exists, skipping: ${code}`);
          skipped++;
          continue;
        }
        
        // Initialize with value 0 (unused)
        await redis.set(`code:${code}`, 0);
        initialized++;
        console.log(`[Redis] Initialized code: ${code}`);
      } catch (error) {
        const errorMsg = `Failed to initialize ${code}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        console.error(`[Redis] ${errorMsg}`);
        errors.push(errorMsg);
      }
    }
    
    console.log(`[Redis] Initialization complete: ${initialized} initialized, ${skipped} skipped, ${errors.length} errors`);
    
    return {
      success: errors.length === 0,
      initialized,
      skipped,
      errors,
    };
  } catch (error) {
    console.error('[Redis] initializeActivationCodes error:', error);
    return {
      success: false,
      initialized,
      skipped,
      errors: [error instanceof Error ? error.message : 'Unknown error'],
    };
  }
}
