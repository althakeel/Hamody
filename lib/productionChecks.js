/**
 * Production Environment Variables Checker
 * Run this to verify all required environment variables are set
 */

export function checkProductionEnv() {
  const required = [
    'MONGODB_URI',
    'FIREBASE_SERVICE_ACCOUNT_KEY',
    'NEXT_PUBLIC_FIREBASE_API_KEY',
    'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
    'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  ];

  const optional = [
    'AWS_ACCESS_KEY_ID',
    'AWS_SECRET_ACCESS_KEY',
    'AWS_S3_BUCKET',
    'AWS_REGION',
    'IMAGEKIT_PRIVATE_KEY',
    'NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT',
  ];

  const missing = [];
  const warnings = [];

  // Check required variables
  required.forEach(key => {
    if (!process.env[key]) {
      missing.push(key);
    }
  });

  // Check optional but recommended
  optional.forEach(key => {
    if (!process.env[key]) {
      warnings.push(key);
    }
  });

  if (missing.length > 0) {
    console.error('❌ MISSING REQUIRED ENVIRONMENT VARIABLES:');
    missing.forEach(key => console.error(`   - ${key}`));
    return false;
  }

  if (warnings.length > 0) {
    console.warn('⚠️  OPTIONAL ENVIRONMENT VARIABLES NOT SET:');
    warnings.forEach(key => console.warn(`   - ${key}`));
  }

  console.log('✅ All required environment variables are configured');
  return true;
}
