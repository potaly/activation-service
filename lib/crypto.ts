import * as ed from '@noble/ed25519';
import { canonicalBytes, canonicalStringify } from './canonical';

/**
 * 生成 Ed25519 密钥对
 */
export async function generateKeyPair() {
  const privateKey = ed.utils.randomPrivateKey();
  const publicKey = await ed.getPublicKeyAsync(privateKey);
  
  return {
    privateKey: Buffer.from(privateKey).toString('base64'),
    publicKey: Buffer.from(publicKey).toString('base64'),
  };
}

/**
 * 对数据进行签名
 */
export async function signData(data: any, privateKeyBase64: string): Promise<string> {
  // 生成 canonical JSON（与 Python json.dumps(sort_keys=True, separators=(',', ':')) 一致）
  // 使用递归排序确保所有层级的键都按字母排序
  const message = canonicalBytes(data);
  
  const privateKey = Buffer.from(privateKeyBase64, 'base64');
  const signature = await ed.signAsync(message, privateKey);
  
  return Buffer.from(signature).toString('base64');
}

/**
 * 验证签名（用于测试）
 */
export async function verifySignature(
  data: any,
  signatureBase64: string,
  publicKeyBase64: string
): Promise<boolean> {
  // 生成 canonical JSON（与 signData 一致）
  const message = canonicalBytes(data);
  
  const signature = Buffer.from(signatureBase64, 'base64');
  const publicKey = Buffer.from(publicKeyBase64, 'base64');
  
  return ed.verifyAsync(signature, message, publicKey);
}
