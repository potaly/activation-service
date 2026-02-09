#!/usr/bin/env tsx

import fs from 'fs';
import path from 'path';
import { randomBytes } from 'crypto';
import { ActivationCode } from '../lib/types';

interface GenerateOptions {
  count: number;
  plan: 'lifetime' | 'trial';
  expiresAt: string;
}

/**
 * 生成随机激活码
 */
function generateCode(): string {
  const bytes = randomBytes(12);
  const base64 = bytes.toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
  return `ACT-${base64}`;
}

/**
 * 批量生成激活码
 */
function generateActivationCodes(options: GenerateOptions): ActivationCode[] {
  const codes: ActivationCode[] = [];
  
  for (let i = 0; i < options.count; i++) {
    codes.push({
      code: generateCode(),
      plan: options.plan,
      expires_at: options.expiresAt,
      used: false,
      used_at: null,
      device_hash: null,
    });
  }
  
  return codes;
}

/**
 * 保存激活码到文件
 */
function saveCodes(codes: ActivationCode[]) {
  const dataDir = path.join(process.cwd(), 'data');
  const codesFile = path.join(dataDir, 'codes.json');
  
  // 确保目录存在
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  // 读取现有激活码
  let existingCodes: ActivationCode[] = [];
  if (fs.existsSync(codesFile)) {
    const data = fs.readFileSync(codesFile, 'utf-8');
    existingCodes = JSON.parse(data);
  }
  
  // 合并并保存
  const allCodes = [...existingCodes, ...codes];
  fs.writeFileSync(codesFile, JSON.stringify(allCodes, null, 2));
  
  console.log(`✓ 成功生成 ${codes.length} 个激活码`);
  console.log(`✓ 已保存到 ${codesFile}`);
  console.log(`✓ 当前总计 ${allCodes.length} 个激活码`);
}

/**
 * 导出激活码到 CSV
 */
function exportToCsv(codes: ActivationCode[], filename: string) {
  const csvContent = [
    'code,plan,expires_at',
    ...codes.map(c => `${c.code},${c.plan},${c.expires_at}`),
  ].join('\n');
  
  fs.writeFileSync(filename, csvContent);
  console.log(`✓ 已导出到 ${filename}`);
}

/**
 * 解析命令行参数
 */
function parseArgs(): GenerateOptions & { export?: string } {
  const args = process.argv.slice(2);
  const options: any = {
    count: 10,
    plan: 'lifetime',
    expiresAt: '2099-12-31T23:59:59Z',
  };
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--help' || arg === '-h') {
      console.log(`
使用方法:
  tsx scripts/generate_codes.ts [选项]

选项:
  -n, --count <number>      生成激活码数量 (默认: 10)
  -p, --plan <type>         激活码类型: lifetime | trial (默认: lifetime)
  -e, --expires <date>      过期时间 ISO8601 格式 (默认: 2099-12-31T23:59:59Z)
  --export <filename>       导出到 CSV 文件
  -h, --help                显示帮助信息

示例:
  tsx scripts/generate_codes.ts -n 100 -p lifetime -e 2099-12-31T23:59:59Z
  tsx scripts/generate_codes.ts -n 50 -p trial -e 2026-12-31T23:59:59Z --export codes.csv
      `);
      process.exit(0);
    }
    
    if (arg === '-n' || arg === '--count') {
      options.count = parseInt(args[++i], 10);
    } else if (arg === '-p' || arg === '--plan') {
      options.plan = args[++i];
    } else if (arg === '-e' || arg === '--expires') {
      options.expiresAt = args[++i];
    } else if (arg === '--export') {
      options.export = args[++i];
    }
  }
  
  return options;
}

/**
 * 主函数
 */
function main() {
  console.log('🚀 激活码生成器\n');
  
  const options = parseArgs();
  
  // 验证参数
  if (options.count <= 0) {
    console.error('❌ 错误: 数量必须大于 0');
    process.exit(1);
  }
  
  if (!['lifetime', 'trial'].includes(options.plan)) {
    console.error('❌ 错误: plan 必须是 lifetime 或 trial');
    process.exit(1);
  }
  
  console.log(`配置:`);
  console.log(`  数量: ${options.count}`);
  console.log(`  类型: ${options.plan}`);
  console.log(`  过期时间: ${options.expiresAt}\n`);
  
  // 生成激活码
  const codes = generateActivationCodes(options);
  
  // 保存到 JSON
  saveCodes(codes);
  
  // 导出到 CSV（如果指定）
  if (options.export) {
    exportToCsv(codes, options.export);
  }
  
  // 显示示例
  console.log(`\n示例激活码:`);
  codes.slice(0, 3).forEach(c => {
    console.log(`  ${c.code}`);
  });
  
  if (codes.length > 3) {
    console.log(`  ... 还有 ${codes.length - 3} 个`);
  }
}

main();
