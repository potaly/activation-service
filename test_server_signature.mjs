#!/usr/bin/env node
/**
 * 测试服务端签名生成是否与客户端验证一致
 */
import * as ed from '@noble/ed25519';

// 私钥（Base64）
const PRIVATE_KEY_B64 = 'b3XYu9+JS9k1aZ+AmjzfUpnHWBqqt0WKRypEOVcPOfY=';

// 公钥（Base64）
const PUBLIC_KEY_B64 = 'n0nHDOGGIt/II6hWbtdQOSJgI8fekhqML/yC5oEjMEg=';

// 实际返回的 license（不含 signature）
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

// 实际返回的签名
const ACTUAL_SIGNATURE = 'M8iL+Qqdw8PnbbeEB1k4uf+iVcjAdOrRj5czuBrnSnCzF+JxnOrYxxEcaqllVIfunuyF3gO2E4/HeQctLmXoAA==';

async function test() {
  console.log('=== 测试服务端签名生成 ===\n');
  
  // 1. 生成 canonical JSON（与客户端一致）
  const canonicalJson = JSON.stringify(license, Object.keys(license).sort());
  console.log('1. Canonical JSON (with spaces):');
  console.log(canonicalJson);
  console.log();
  
  // 2. 移除空格（与客户端一致：separators=(',', ':')）
  const canonicalJsonNoSpaces = JSON.stringify(license, Object.keys(license).sort()).replace(/\s+/g, '');
  console.log('2. Canonical JSON (no spaces):');
  console.log(canonicalJsonNoSpaces);
  console.log();
  
  // 3. 客户端期望的格式
  const clientExpected = '{"app_id":"moments_ai","device_hash":"SHA256:a4c1bf40a60835318b399d6bfa882e93465a9457ab1be8598820a11156acc154","expires_at":"2099-12-31T23:59:59Z","features":{"ai_settings":true,"moments_interact":true},"issued_at":"2026-02-09T11:59:51.955Z","license_id":"LIC-20260209-4511","nonce":"65j1ebfko0g","plan":"lifetime","schema_version":1}';
  console.log('3. Client expected:');
  console.log(clientExpected);
  console.log();
  
  console.log('4. Comparison:');
  console.log('   Server length:', canonicalJsonNoSpaces.length);
  console.log('   Client length:', clientExpected.length);
  console.log('   Match:', canonicalJsonNoSpaces === clientExpected);
  console.log();
  
  // 5. 签名
  const message = new TextEncoder().encode(clientExpected);
  const privateKey = Buffer.from(PRIVATE_KEY_B64, 'base64');
  const signature = await ed.signAsync(message, privateKey);
  const signatureB64 = Buffer.from(signature).toString('base64');
  
  console.log('5. Signature:');
  console.log('   Generated:', signatureB64);
  console.log('   Actual:   ', ACTUAL_SIGNATURE);
  console.log('   Match:', signatureB64 === ACTUAL_SIGNATURE);
  console.log();
  
  // 6. 验证
  const publicKey = Buffer.from(PUBLIC_KEY_B64, 'base64');
  const actualSigBytes = Buffer.from(ACTUAL_SIGNATURE, 'base64');
  const isValid = await ed.verifyAsync(actualSigBytes, message, publicKey);
  
  console.log('6. Verification:');
  console.log('   Actual signature valid:', isValid);
}

test().catch(console.error);
