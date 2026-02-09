#!/usr/bin/env node
/**
 * 测试 canonical JSON 生成是否与客户端一致
 */

/**
 * 递归排序对象的所有键
 */
function sortKeysDeep(obj) {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(sortKeysDeep);
  }
  
  const sorted = {};
  const keys = Object.keys(obj).sort();
  
  for (const key of keys) {
    sorted[key] = sortKeysDeep(obj[key]);
  }
  
  return sorted;
}

/**
 * 生成 Canonical JSON 字符串
 */
function canonicalStringify(obj) {
  const sorted = sortKeysDeep(obj);
  return JSON.stringify(sorted);
}

// 测试数据
const license = {
  "schema_version": 1,
  "license_id": "LIC-20260209-4511",
  "app_id": "moments_ai",
  "plan": "lifetime",
  "device_hash": "SHA256:a4c1bf40a60835318b399d6bfa882e93465a9457ab1be8598820a11156acc154",
  "issued_at": "2026-02-09T11:59:51.955Z",
  "expires_at": "2099-12-31T23:59:59Z",
  "features": {
    "moments_interact": true,
    "ai_settings": true
  },
  "nonce": "65j1ebfko0g"
};

// 客户端期望的格式
const clientExpected = '{"app_id":"moments_ai","device_hash":"SHA256:a4c1bf40a60835318b399d6bfa882e93465a9457ab1be8598820a11156acc154","expires_at":"2099-12-31T23:59:59Z","features":{"ai_settings":true,"moments_interact":true},"issued_at":"2026-02-09T11:59:51.955Z","license_id":"LIC-20260209-4511","nonce":"65j1ebfko0g","plan":"lifetime","schema_version":1}';

console.log('=== 测试 Canonical JSON 生成 ===\n');

const serverGenerated = canonicalStringify(license);

console.log('Server generated:');
console.log(serverGenerated);
console.log();

console.log('Client expected:');
console.log(clientExpected);
console.log();

console.log('Comparison:');
console.log('  Server length:', serverGenerated.length);
console.log('  Client length:', clientExpected.length);
console.log('  Match:', serverGenerated === clientExpected);

if (serverGenerated !== clientExpected) {
  console.log('\n❌ Mismatch! Finding differences...');
  for (let i = 0; i < Math.max(serverGenerated.length, clientExpected.length); i++) {
    if (serverGenerated[i] !== clientExpected[i]) {
      console.log(`  Position ${i}:`);
      console.log(`    Server: "${serverGenerated.substring(i, i + 50)}..."`);
      console.log(`    Client: "${clientExpected.substring(i, i + 50)}..."`);
      break;
    }
  }
} else {
  console.log('\n✅ Perfect match!');
}
