#!/usr/bin/env node

import * as ed from '@noble/ed25519';

const PUBLIC_KEY = "n0nHDOGGIt/II6hWbtdQOSJgI8fekhqML/yC5oEjMEg=";

const licenseData = {
  "schema_version": 1,
  "license_id": "LIC-20260209-7992",
  "app_id": "moments_ai",
  "plan": "lifetime",
  "device_hash": "SHA256:python_test_device",
  "issued_at": "2026-02-09T10:22:34.868Z",
  "expires_at": "2099-12-31T23:59:59Z",
  "features": {
    "moments_interact": true,
    "ai_settings": true
  },
  "nonce": "13nhsnbirp5"
};

const signatureStr = "ed25519:oFRYzZ4hbieymPbz+r4xMuHINVscNX3JSoVz41mZwKhR5aBONO6NCj1aVgXaRRuzK5Km+6znPkJ3ruaR7XQBCg==";

// 生成 canonical JSON（与服务端相同的方式）
const sortedKeys = Object.keys(licenseData).sort();
const canonicalJson = JSON.stringify(licenseData, sortedKeys, 0).replace(/\s/g, '');

console.log("Canonical JSON:");
console.log(canonicalJson);
console.log("\nJSON 长度:", canonicalJson.length);

const message = new TextEncoder().encode(canonicalJson);
const signature = Buffer.from(signatureStr.replace("ed25519:", ""), 'base64');
const publicKey = Buffer.from(PUBLIC_KEY, 'base64');

console.log("\n公钥长度:", publicKey.length);
console.log("签名长度:", signature.length);
console.log("消息长度:", message.length);

try {
  const isValid = await ed.verifyAsync(signature, message, publicKey);
  console.log("\n✓ 签名验证成功！");
  console.log("验证结果:", isValid);
} catch (error) {
  console.log("\n✗ 签名验证失败");
  console.log("错误:", error.message);
}
