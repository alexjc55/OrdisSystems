#!/bin/bash

# Final fix for database connection issues on VPS
echo "🔧 Applying final database connection fix..."

# 1. Remove Neon database package completely
echo "📦 Removing Neon database package..."
npm uninstall @neondatabase/serverless

# 2. Ensure PostgreSQL packages are installed
echo "📦 Installing PostgreSQL packages..."
npm install pg @types/pg

# 3. Fix .env file with correct local PostgreSQL URL
echo "🔧 Fixing .env file..."
cat > .env << 'EOF'
# Database Configuration (VPS PostgreSQL)
DATABASE_URL=postgresql://edahouse_ord:33V0R1N5qi81paiA@localhost:5432/edahouse_ord

# Server Configuration  
PORT=3000
NODE_ENV=production
SESSION_SECRET=WAVl58TU5MAzQkQa6w8YTsuFYyyCwIl24D2j5BNsX4reNv1iYPdNQHtog2Y0CYQ39U1HGYYG1cNQhLIGfxPVNg==

# Application Settings
ENABLE_REGISTRATION=true
ENABLE_GUEST_ORDERS=true
MAX_FILE_SIZE=5242880
UPLOAD_PATH=./uploads
ALLOWED_ORIGINS=https://edahouse.ordis.co.il
STORE_NAME=edahouse
STORE_DESCRIPTION=Food delivery service
EOF

# 4. Test database connectivity directly
echo "🔌 Testing database connectivity..."
export DATABASE_URL="postgresql://edahouse_ord:33V0R1N5qi81paiA@localhost:5432/edahouse_ord"
node -e "
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query('SELECT COUNT(*) FROM products')
  .then(result => {
    console.log('✅ Database connection successful! Products count:', result.rows[0].count);
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Database connection failed:', err.message);
    process.exit(1);
  });
"

if [ $? -ne 0 ]; then
  echo "❌ Database connectivity test failed. Please check PostgreSQL service:"
  echo "   sudo systemctl status postgresql"
  exit 1
fi

# 5. Rebuild application with clean dependencies
echo "🏗️ Rebuilding application..."
npm run build

if [ $? -ne 0 ]; then
  echo "❌ Build failed!"
  exit 1
fi

# 6. Verify built application has no Neon references
echo "🔍 Checking for Neon references in built application..."
NEON_REFS=$(grep -c "neondatabase\|neon-serverless" dist/index.js || echo "0")
if [ "$NEON_REFS" -gt 0 ]; then
  echo "⚠️ Warning: Found $NEON_REFS Neon references in built application"
else
  echo "✅ No Neon references found in built application"
fi

# 7. Restart PM2 with updated environment
echo "🔄 Restarting PM2..."
pm2 stop edahouse 2>/dev/null || true
pm2 delete edahouse 2>/dev/null || true
pm2 start ecosystem.config.cjs --env production

# 8. Wait for startup and test endpoints
echo "⏳ Waiting for application startup..."
sleep 10

# 9. Test all endpoints
echo "🧪 Testing endpoints..."
echo "Health endpoint:"
curl -s http://localhost:3000/api/health || echo "❌ Health endpoint failed"

echo -e "\nProducts endpoint:"
curl -s http://localhost:3000/api/products | head -c 100 || echo "❌ Products endpoint failed"

echo -e "\nExternal access:"
curl -s https://edahouse.ordis.co.il/api/health || echo "❌ External access failed"

# 10. Check PM2 status
echo -e "\n📊 PM2 Status:"
pm2 status

echo -e "\n✅ Database fix completed!"
echo "If endpoints are still failing, check PM2 logs: pm2 logs edahouse"