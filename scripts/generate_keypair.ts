#!/usr/bin/env tsx

import { generateKeyPair } from '../lib/crypto';

async function main() {
  console.log('🔐 生成 Ed25519 密钥对\n');
  
  const { privateKey, publicKey } = await generateKeyPair();
  
  console.log('私钥 (LICENSE_PRIVATE_KEY):');
  console.log(privateKey);
  console.log('\n公钥 (用于客户端验证):');
  console.log(publicKey);
  
  console.log('\n⚠️  请将私钥配置到 Vercel 环境变量中:');
  console.log('   LICENSE_PRIVATE_KEY=' + privateKey);
  console.log('\n⚠️  请将公钥内置到客户端 EXE 中用于离线验证');
}

main();
