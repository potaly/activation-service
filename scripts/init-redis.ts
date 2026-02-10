/**
 * Initialize Redis with activation codes
 * Run this script once to populate the database
 * 
 * Usage: npx tsx scripts/init-redis.ts
 */

import { initializeActivationCodes } from '../lib/storage-redis';
import { ACTIVATION_CODES } from '../lib/activation-codes';

async function main() {
  console.log('='.repeat(60));
  console.log('Initializing Redis with activation codes');
  console.log('='.repeat(60));
  console.log();
  
  const codes = ACTIVATION_CODES.map(c => c.code);
  
  console.log(`Total codes to initialize: ${codes.length}`);
  console.log();
  
  const result = await initializeActivationCodes(codes);
  
  console.log();
  console.log('='.repeat(60));
  console.log('Initialization Result');
  console.log('='.repeat(60));
  console.log(`Success: ${result.success}`);
  console.log(`Initialized: ${result.initialized}`);
  console.log(`Skipped: ${result.skipped}`);
  console.log(`Errors: ${result.errors.length}`);
  
  if (result.errors.length > 0) {
    console.log();
    console.log('Errors:');
    result.errors.forEach(error => console.log(`  - ${error}`));
  }
  
  console.log();
  
  if (result.success) {
    console.log('✅ Redis initialization completed successfully!');
    process.exit(0);
  } else {
    console.log('❌ Redis initialization completed with errors.');
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
