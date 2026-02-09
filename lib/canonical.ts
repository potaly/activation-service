/**
 * Canonical JSON 序列化
 * 
 * 与 Python 的 json.dumps(obj, sort_keys=True, separators=(',', ':')) 完全一致：
 * 1. 所有层级的对象键按字母排序
 * 2. 无空格（逗号后无空格，冒号后无空格）
 * 3. 递归处理嵌套对象
 */

/**
 * 递归排序对象的所有键
 */
function sortKeysDeep(obj: any): any {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(sortKeysDeep);
  }
  
  const sorted: Record<string, any> = {};
  const keys = Object.keys(obj).sort();
  
  for (const key of keys) {
    sorted[key] = sortKeysDeep(obj[key]);
  }
  
  return sorted;
}

/**
 * 生成 Canonical JSON 字符串
 * 
 * 与 Python json.dumps(obj, sort_keys=True, separators=(',', ':')) 一致
 */
export function canonicalStringify(obj: any): string {
  const sorted = sortKeysDeep(obj);
  // JSON.stringify 默认就是 separators=(',', ':')（无空格）
  return JSON.stringify(sorted);
}

/**
 * 生成 Canonical JSON 的 UTF-8 字节
 */
export function canonicalBytes(obj: any): Uint8Array {
  const str = canonicalStringify(obj);
  return new TextEncoder().encode(str);
}
