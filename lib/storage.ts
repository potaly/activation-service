import fs from 'fs';
import path from 'path';
import { ActivationCode } from './types';

const DATA_DIR = path.join(process.cwd(), 'data');
const CODES_FILE = path.join(DATA_DIR, 'codes.json');

// 内存缓存：已使用的激活码
// 注意：Vercel Serverless 是无状态的，每次请求可能在不同实例
// 这个缓存只在单个实例生命周期内有效
const usedCodesCache = new Map<string, ActivationCode>();

/**
 * 读取所有激活码（从只读文件）
 */
export function getAllCodes(): ActivationCode[] {
  try {
    const data = fs.readFileSync(CODES_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Failed to read codes file:', error);
    return [];
  }
}

/**
 * 查找激活码
 */
export function findCode(code: string): ActivationCode | null {
  // 先检查内存缓存
  if (usedCodesCache.has(code)) {
    return usedCodesCache.get(code)!;
  }
  
  // 从文件中查找
  const allCodes = getAllCodes();
  const foundCode = allCodes.find(c => c.code === code);
  
  return foundCode || null;
}

/**
 * 检查激活码是否已使用
 */
export function isCodeUsed(code: string): boolean {
  // 检查内存缓存
  if (usedCodesCache.has(code)) {
    const cachedCode = usedCodesCache.get(code)!;
    return cachedCode.used === true;
  }
  
  // 从文件中检查
  const foundCode = findCode(code);
  if (!foundCode) return false;
  
  return foundCode.used === true;
}

/**
 * 标记激活码为已使用（仅在内存中）
 * 
 * 注意：由于 Vercel Serverless 是只读文件系统，无法持久化到文件。
 * 这个实现使用内存缓存，但有以下限制：
 * 1. 缓存只在单个实例生命周期内有效
 * 2. 不同实例之间不共享状态
 * 3. 实例重启后缓存丢失
 * 
 * 生产环境建议使用：
 * - Vercel KV (Redis)
 * - Vercel Postgres
 * - 外部数据库
 */
export function markCodeAsUsed(code: string, deviceHash: string): boolean {
  const foundCode = findCode(code);
  if (!foundCode) {
    console.error(`Code not found: ${code}`);
    return false;
  }
  
  // 检查是否已使用
  if (isCodeUsed(code)) {
    console.warn(`Code already used: ${code}`);
    return false;
  }
  
  // 更新激活码状态（仅在内存中）
  const usedCode: ActivationCode = {
    ...foundCode,
    used: true,
    used_at: new Date().toISOString(),
    device_hash: deviceHash,
  };
  
  // 保存到内存缓存
  usedCodesCache.set(code, usedCode);
  
  console.log(`Code marked as used (in-memory): ${code}`);
  return true;
}

/**
 * 获取激活码统计信息
 */
export function getCodesStats() {
  const allCodes = getAllCodes();
  const usedInCache = usedCodesCache.size;
  const usedInFile = allCodes.filter(c => c.used === true).length;
  
  return {
    total: allCodes.length,
    used_in_cache: usedInCache,
    used_in_file: usedInFile,
    available: allCodes.length - usedInFile - usedInCache,
  };
}

/**
 * 获取已使用的激活码列表（从缓存）
 */
export function getUsedCodesFromCache(): ActivationCode[] {
  return Array.from(usedCodesCache.values());
}
