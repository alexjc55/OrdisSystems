#!/bin/bash

# VPS Database Connection Fix Script
# Fixes DATABASE_URL to use local PostgreSQL instead of external Neon database

echo "🔧 Fixing database connection for VPS..."

# Backup current .env
cp .env .env.backup.$(date +%Y%m%d_%H%M%S)

# Create production .env with local PostgreSQL
cat > .env << 'EOF'
# VPS Production Environment Configuration
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

echo "✅ Updated .env file for VPS production environment"

# Update PM2 ecosystem config to use .env file
cat > ecosystem.config.cjs << 'EOF'
module.exports = {
  apps: [{
    name: 'edahouse',
    script: './dist/index.js',
    instances: 1,
    env_file: '.env',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      DATABASE_URL: 'postgresql://edahouse_ord:33V0R1N5qi81paiA@localhost:5432/edahouse_ord'
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
}
EOF

echo "✅ Updated PM2 configuration"

# Test database connection
echo "🧪 Testing database connection..."
node -e "
const { Client } = require('pg');
const client = new Client('postgresql://edahouse_ord:33V0R1N5qi81paiA@localhost:5432/edahouse_ord');
client.connect()
  .then(() => {
    console.log('✅ Database connection successful');
    return client.query('SELECT COUNT(*) FROM products');
  })
  .then(result => {
    console.log('✅ Found', result.rows[0].count, 'products in database');
    client.end();
  })
  .catch(err => {
    console.error('❌ Database connection failed:', err.message);
    client.end();
    process.exit(1);
  });
"

# Restart PM2 with new configuration
echo "🔄 Restarting application..."
pm2 delete edahouse 2>/dev/null || true
pm2 start ecosystem.config.cjs
pm2 save

echo "✅ Database connection fix completed!"
echo "🌐 Check your site: https://edahouse.ordis.co.il"