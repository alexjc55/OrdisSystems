#!/bin/bash

echo "🔧 FINAL VPS DATABASE FIX - Eliminating ALL Neon connections"

# Stop the application first
pm2 stop edahouse 2>/dev/null || true
pm2 delete edahouse 2>/dev/null || true

# 1. Complete cleanup of node_modules and package-lock
echo "🧹 Complete cleanup of dependencies..."
rm -rf node_modules package-lock.json
npm cache clean --force

# 2. Remove ALL Neon packages and install PostgreSQL
echo "📦 Installing clean PostgreSQL dependencies..."
npm install --save pg@^8.11.3 @types/pg@^8.10.9
npm uninstall @neondatabase/serverless drizzle-orm/neon-serverless 2>/dev/null || true

# 3. Fix .env with explicit PostgreSQL configuration
echo "🔧 Setting PostgreSQL-only configuration..."
cat > .env << 'EOF'
# VPS PostgreSQL Configuration
DATABASE_URL=postgresql://edahouse_ord:33V0R1N5qi81paiA@localhost:5432/edahouse_ord
PORT=3000
NODE_ENV=production
SESSION_SECRET=WAVl58TU5MAzQkQa6w8YTsuFYyyCwIl24D2j5BNsX4reNv1iYPdNQHtog2Y0CYQ39U1HGYYG1cNQhLIGfxPVNg==
ENABLE_REGISTRATION=true
ENABLE_GUEST_ORDERS=true
MAX_FILE_SIZE=5242880
UPLOAD_PATH=./uploads
ALLOWED_ORIGINS=https://edahouse.ordis.co.il
STORE_NAME=edahouse
STORE_DESCRIPTION=Food delivery service
EOF

# 4. Ensure database connection file is PostgreSQL-only
echo "🗄️ Creating PostgreSQL-only database connection..."
cat > server/db-universal.ts << 'EOF'
// Pure PostgreSQL connection for VPS deployment
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}

// Disable all SSL and WebSocket attempts
const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: false,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  max: 10
});

export const db = drizzle({ client: pool, schema });
export { pool };
EOF

# 5. Test database connectivity before building
echo "🔌 Testing PostgreSQL connectivity..."
export DATABASE_URL="postgresql://edahouse_ord:33V0R1N5qi81paiA@localhost:5432/edahouse_ord"
node -e "
const { Pool } = require('pg');
const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: false
});
pool.query('SELECT COUNT(*) as count FROM products')
  .then(result => {
    console.log('✅ PostgreSQL connection successful! Products:', result.rows[0].count);
    pool.end();
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ PostgreSQL connection failed:', err.message);
    pool.end();
    process.exit(1);
  });
"

if [ $? -ne 0 ]; then
  echo "❌ Database connection failed. Aborting."
  exit 1
fi

# 6. Clean build with PostgreSQL-only dependencies
echo "🏗️ Building application with clean PostgreSQL setup..."
rm -rf dist
npm run build

if [ $? -ne 0 ]; then
  echo "❌ Build failed!"
  exit 1
fi

# 7. Verify NO Neon references in built application
echo "🔍 Verifying Neon references are completely eliminated..."
NEON_COUNT=$(grep -c "neon\|443" dist/index.js 2>/dev/null || echo "0")
if [ "$NEON_COUNT" -gt 0 ]; then
  echo "⚠️ Found $NEON_COUNT potential Neon references in built app"
else
  echo "✅ Built application is clean - no Neon references"
fi

# 8. Create PM2 config with explicit environment
echo "⚙️ Creating PostgreSQL-specific PM2 configuration..."
cat > ecosystem.config.cjs << 'EOF'
module.exports = {
  apps: [{
    name: 'edahouse',
    script: './dist/index.js',
    instances: 1,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      DATABASE_URL: 'postgresql://edahouse_ord:33V0R1N5qi81paiA@localhost:5432/edahouse_ord',
      SESSION_SECRET: 'WAVl58TU5MAzQkQa6w8YTsuFYyyCwIl24D2j5BNsX4reNv1iYPdNQHtog2Y0CYQ39U1HGYYG1cNQHtog2Y0CYQ39U1HGYYG1cNQhLIGfxPVNg==',
      ENABLE_REGISTRATION: 'true',
      ENABLE_GUEST_ORDERS: 'true',
      MAX_FILE_SIZE: '5242880',
      UPLOAD_PATH: './uploads',
      ALLOWED_ORIGINS: 'https://edahouse.ordis.co.il',
      STORE_NAME: 'edahouse',
      STORE_DESCRIPTION: 'Food delivery service'
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    max_memory_restart: '1G',
    autorestart: true
  }]
};
EOF

# 9. Start PM2 with clean configuration
echo "🚀 Starting application with PostgreSQL-only configuration..."
mkdir -p logs
pm2 start ecosystem.config.cjs

# 10. Wait and test endpoints extensively
echo "⏳ Waiting for application startup..."
sleep 15

echo "🧪 Testing all endpoints..."
echo "=== Health Endpoint ==="
curl -s http://localhost:3000/api/health | jq . 2>/dev/null || curl -s http://localhost:3000/api/health

echo -e "\n=== Products Endpoint ==="
curl -s http://localhost:3000/api/products | head -c 200

echo -e "\n=== Categories Endpoint ==="  
curl -s http://localhost:3000/api/categories | head -c 200

echo -e "\n=== Store Settings Endpoint ==="
curl -s http://localhost:3000/api/settings | head -c 200

echo -e "\n=== External Access Test ==="
curl -s https://edahouse.ordis.co.il/api/health | jq . 2>/dev/null || curl -s https://edahouse.ordis.co.il/api/health

echo -e "\n📊 Final PM2 Status:"
pm2 status

echo -e "\n🔍 Checking for any remaining connection errors:"
pm2 logs edahouse --lines 10 --nostream | grep -E "(443|neon|ECONNREFUSED)" || echo "✅ No connection errors found"

echo -e "\n✅ VPS DATABASE FIX COMPLETED!"
echo "If any endpoints still fail, the issue is not database-related."