import fs from 'fs';
import path from 'path';
import { ActivationCode } from './types';

const DATA_DIR = path.join(process.cwd(), 'data');
const CODES_FILE = path.join(DATA_DIR, 'codes.json');
const USED_CODES_FILE = path.join(DATA_DIR, 'used_codes.json');

/**
 * 确保数据目录和文件存在
 */
function ensureDataFiles() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  
  if (!fs.existsSync(CODES_FILE)) {
    fs.writeFileSync(CODES_FILE, JSON.stringify([], null, 2));
  }
  
  if (!fs.existsSync(USED_CODES_FILE)) {
    fs.writeFileSync(USED_CODES_FILE, JSON.stringify([], null, 2));
  }
}

/**
 * 读取所有激活码
 */
export function getAllCodes(): ActivationCode[] {
  ensureDataFiles();
  const data = fs.readFileSync(CODES_FILE, 'utf-8');
  return JSON.parse(data);
}

/**
 * 读取已使用的激活码
 */
export function getUsedCodes(): ActivationCode[] {
  ensureDataFiles();
  const data = fs.readFileSync(USED_CODES_FILE, 'utf-8');
  return JSON.parse(data);
}

/**
 * 查找激活码
 */
export function findCode(code: string): ActivationCode | null {
  const allCodes = getAllCodes();
  const usedCodes = getUsedCodes();
  
  // 先在未使用的激活码中查找
  const foundCode = allCodes.find(c => c.code === code);
  if (foundCode) return foundCode;
  
  // 再在已使用的激活码中查找
  const usedCode = usedCodes.find(c => c.code === code);
  if (usedCode) return usedCode;
  
  return null;
}

/**
 * 标记激活码为已使用
 */
export function markCodeAsUsed(code: string, deviceHash: string): boolean {
  ensureDataFiles();
  
  const allCodes = getAllCodes();
  const usedCodes = getUsedCodes();
  
  // 从未使用列表中找到激活码
  const index = allCodes.findIndex(c => c.code === code);
  if (index === -1) return false;
  
  // 更新激活码状态
  const activationCode = allCodes[index];
  activationCode.used = true;
  activationCode.used_at = new Date().toISOString();
  activationCode.device_hash = deviceHash;
  
  // 从未使用列表中移除
  allCodes.splice(index, 1);
  
  // 添加到已使用列表
  usedCodes.push(activationCode);
  
  // 保存到文件
  fs.writeFileSync(CODES_FILE, JSON.stringify(allCodes, null, 2));
  fs.writeFileSync(USED_CODES_FILE, JSON.stringify(usedCodes, null, 2));
  
  return true;
}

/**
 * 添加激活码（用于生成脚本）
 */
export function addCodes(codes: ActivationCode[]): void {
  ensureDataFiles();
  const allCodes = getAllCodes();
  allCodes.push(...codes);
  fs.writeFileSync(CODES_FILE, JSON.stringify(allCodes, null, 2));
}
