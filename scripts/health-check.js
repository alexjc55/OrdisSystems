#!/usr/bin/env node

/**
 * Health check script for deployment verification
 * Verifies that the application is running correctly after updates
 */

import { execSync } from 'child_process';
import fs from 'fs';

const checks = {
  database: false,
  uploads: false,
  settings: false,
  server: false
};

console.log('🔍 Running post-update health checks...');

// Check database connectivity
try {
  console.log('📊 Checking database connectivity...');
  execSync('node -e "import(\\"./server/db.js\\").then(db => db.pool.query(\\"SELECT 1\\")).then(() => process.exit(0)).catch(() => process.exit(1))"', { stdio: 'pipe' });
  checks.database = true;
  console.log('✅ Database connection OK');
} catch (error) {
  console.log('❌ Database connection failed');
}

// Check uploads directory
try {
  console.log('📁 Checking uploads directory...');
  if (fs.existsSync('uploads') && fs.statSync('uploads').isDirectory()) {
    checks.uploads = true;
    console.log('✅ Uploads directory OK');
  } else {
    console.log('❌ Uploads directory missing');
  }
} catch (error) {
  console.log('❌ Uploads directory check failed');
}

// Check environment configuration
try {
  console.log('⚙️ Checking environment configuration...');
  if (fs.existsSync('.env') && process.env.DATABASE_URL && process.env.SESSION_SECRET) {
    checks.settings = true;
    console.log('✅ Environment configuration OK');
  } else {
    console.log('❌ Environment configuration incomplete');
  }
} catch (error) {
  console.log('❌ Environment check failed');
}

// Check if server can start (quick test)
try {
  console.log('🚀 Checking server startup...');
  const result = execSync('timeout 10s npm start 2>&1 || echo "timeout"', { encoding: 'utf8' });
  if (!result.includes('Error') && !result.includes('timeout')) {
    checks.server = true;
    console.log('✅ Server startup OK');
  } else {
    console.log('❌ Server startup issues detected');
  }
} catch (error) {
  console.log('❌ Server startup check failed');
}

// Summary
const passedChecks = Object.values(checks).filter(Boolean).length;
const totalChecks = Object.keys(checks).length;

console.log(`\n📋 Health Check Results: ${passedChecks}/${totalChecks} passed`);

if (passedChecks === totalChecks) {
  console.log('🎉 All health checks passed! Deployment is ready.');
  process.exit(0);
} else {
  console.log('⚠️ Some health checks failed. Please review the issues above.');
  process.exit(1);
}