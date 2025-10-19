const fs = require('fs');
const path = require('path');

// 颜色输出
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkEnvFile() {
  log('blue', '🔍 Checking .env file...');
  
  if (!fs.existsSync('.env')) {
    log('red', '❌ .env file not found');
    log('yellow', 'Please create a .env file with your configuration');
    return false;
  }
  
  log('green', '✅ .env file found');
  return true;
}

function checkRequiredEnvVars() {
  log('blue', '🔍 Checking required environment variables...');
  
  const envContent = fs.readFileSync('.env', 'utf8');
  const requiredVars = [
    'POSTGRES_URL',
    'DEFAULT_PAYMENT_PROVIDER',
    'BASE_URL',
    'AUTH_SECRET'
  ];
  
  const paymentVars = {
    stripe: ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'],
    paypal: ['PAYPAL_CLIENT_ID', 'PAYPAL_CLIENT_SECRET']
  };
  
  let allValid = true;
  
  // 检查必需变量
  for (const varName of requiredVars) {
    if (!envContent.includes(`${varName}=`) || envContent.includes(`${varName}=***`)) {
      log('red', `❌ ${varName} is missing or not configured`);
      allValid = false;
    } else {
      log('green', `✅ ${varName} is configured`);
    }
  }
  
  // 检查支付提供商配置
  const providerMatch = envContent.match(/DEFAULT_PAYMENT_PROVIDER=(.+)/);
  if (providerMatch) {
    const provider = providerMatch[1].trim();
    log('blue', `📦 Payment provider: ${provider}`);
    
    const requiredPaymentVars = paymentVars[provider];
    if (requiredPaymentVars) {
      for (const varName of requiredPaymentVars) {
        if (!envContent.includes(`${varName}=`) || envContent.includes(`${varName}=***`)) {
          log('red', `❌ ${varName} is missing or not configured`);
          allValid = false;
        } else {
          log('green', `✅ ${varName} is configured`);
        }
      }
    }
  }
  
  return allValid;
}

function checkPostgresConnection() {
  log('blue', '🔍 Checking PostgreSQL connection format...');
  
  const envContent = fs.readFileSync('.env', 'utf8');
  const postgresMatch = envContent.match(/POSTGRES_URL=(.+)/);
  
  if (!postgresMatch) {
    log('red', '❌ POSTGRES_URL not found');
    return false;
  }
  
  const postgresUrl = postgresMatch[1].trim();
  
  // 检查PostgreSQL URL格式
  const postgresRegex = /^postgresql:\/\/[^:]+:[^@]+@[^:]+:\d+\/.+$/;
  if (postgresRegex.test(postgresUrl)) {
    log('green', '✅ PostgreSQL URL format is valid');
    return true;
  } else {
    log('red', '❌ PostgreSQL URL format is invalid');
    log('yellow', 'Expected format: postgresql://username:password@host:port/database');
    return false;
  }
}

function checkBaseUrl() {
  log('blue', '🔍 Checking BASE_URL...');
  
  const envContent = fs.readFileSync('.env', 'utf8');
  const baseUrlMatch = envContent.match(/BASE_URL=(.+)/);
  
  if (!baseUrlMatch) {
    log('red', '❌ BASE_URL not found');
    return false;
  }
  
  const baseUrl = baseUrlMatch[1].trim();
  
  if (baseUrl.startsWith('http://') || baseUrl.startsWith('https://')) {
    log('green', `✅ BASE_URL is valid: ${baseUrl}`);
    return true;
  } else {
    log('red', '❌ BASE_URL format is invalid');
    log('yellow', 'Expected format: http://localhost:3000 or https://yourdomain.com');
    return false;
  }
}

function checkAuthSecret() {
  log('blue', '🔍 Checking AUTH_SECRET...');
  
  const envContent = fs.readFileSync('.env', 'utf8');
  const authSecretMatch = envContent.match(/AUTH_SECRET=(.+)/);
  
  if (!authSecretMatch) {
    log('red', '❌ AUTH_SECRET not found');
    return false;
  }
  
  const authSecret = authSecretMatch[1].trim();
  
  if (authSecret.length >= 32) {
    log('green', '✅ AUTH_SECRET length is valid');
    return true;
  } else {
    log('red', '❌ AUTH_SECRET is too short (minimum 32 characters)');
    log('yellow', 'Generate a new one with: openssl rand -base64 32');
    return false;
  }
}

function generateAuthSecret() {
  const crypto = require('crypto');
  return crypto.randomBytes(32).toString('hex');
}

function showNextSteps() {
  log('blue', '📋 Next steps:');
  console.log('');
  console.log('1. Run database migrations:');
  console.log('   pnpm db:migrate');
  console.log('');
  console.log('2. Migrate payment data:');
  console.log('   npx tsx lib/db/migrate-payment-data.ts migrate');
  console.log('');
  console.log('3. Seed the database:');
  console.log('   pnpm db:seed');
  console.log('');
  console.log('4. Start the development server:');
  console.log('   pnpm dev');
  console.log('');
  console.log('5. Visit http://localhost:3000');
  console.log('');
  console.log('Default login:');
  console.log('  Email: test@test.com');
  console.log('  Password: admin123');
}

function main() {
  console.log('🔧 Configuration Check Tool');
  console.log('================================');
  console.log('');
  
  if (!checkEnvFile()) {
    process.exit(1);
  }
  
  const checks = [
    checkRequiredEnvVars,
    checkPostgresConnection,
    checkBaseUrl,
    checkAuthSecret
  ];
  
  let allPassed = true;
  
  for (const check of checks) {
    if (!check()) {
      allPassed = false;
    }
    console.log('');
  }
  
  if (allPassed) {
    log('green', '🎉 All configuration checks passed!');
    console.log('');
    showNextSteps();
  } else {
    log('red', '❌ Some configuration checks failed');
    console.log('');
    log('yellow', 'Please fix the issues above and run this check again.');
    console.log('');
    log('blue', 'For detailed setup instructions, see: ENVIRONMENT_SETUP_GUIDE.md');
    process.exit(1);
  }
}

// 如果作为脚本运行
if (require.main === module) {
  main();
}

module.exports = { main, generateAuthSecret };
