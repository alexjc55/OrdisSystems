#!/bin/bash

# Clean Reinstall Script with Data Preservation
# Saves all user data, reinstalls application, restores data

echo "🔄 Starting clean reinstall with data preservation..."

# Step 1: Create data backup
echo "📦 Creating data backup..."
mkdir -p backup_$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="backup_$(date +%Y%m%d_%H%M%S)"

# Backup database
echo "💾 Backing up database..."
pg_dump -h localhost -U edahouse_ord -d edahouse_ord > $BACKUP_DIR/database_backup.sql

# Backup uploads directory
echo "📁 Backing up uploads..."
cp -r uploads $BACKUP_DIR/ 2>/dev/null || echo "No uploads directory found"

# Backup environment variables we want to keep
echo "⚙️ Backing up configuration..."
cat > $BACKUP_DIR/production.env << 'EOF'
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

echo "✅ Backup completed in $BACKUP_DIR"

# Step 2: Stop application
echo "⏹️ Stopping application..."
pm2 delete edahouse 2>/dev/null || true

# Step 3: Clean installation
echo "🧹 Removing old application files..."
rm -rf node_modules dist .env server client shared package-lock.json

# Step 4: Download fresh code
echo "⬇️ Downloading fresh application code..."
git fetch origin
git reset --hard origin/main
git clean -fd

# Step 5: Install dependencies
echo "📦 Installing dependencies..."
npm install

# Step 6: Apply production configuration
echo "⚙️ Applying production configuration..."
cp $BACKUP_DIR/production.env .env

# Update package.json scripts for production
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

# Step 7: Build application
echo "🔨 Building application..."
npm run build

# Step 8: Restore uploads
echo "📁 Restoring uploads..."
cp -r $BACKUP_DIR/uploads . 2>/dev/null || echo "No uploads to restore"

# Step 9: Start application
echo "🚀 Starting application..."
pm2 start ecosystem.config.cjs
pm2 save

# Step 10: Test
echo "🧪 Testing application..."
sleep 5

# Test database connection
node -e "
const { Client } = require('pg');
const client = new Client('postgresql://edahouse_ord:33V0R1N5qi81paiA@localhost:5432/edahouse_ord');
client.connect()
  .then(() => client.query('SELECT COUNT(*) FROM products'))
  .then(result => {
    console.log('✅ Database connected - Products:', result.rows[0].count);
    client.end();
  })
  .catch(err => {
    console.log('❌ Database error:', err.message);
    client.end();
  });
"

# Test API
echo "🌐 Testing API endpoints..."
sleep 2
echo "Products API: $(curl -s https://edahouse.ordis.co.il/api/products | head -c 100)..."
echo "Health check: $(curl -s https://edahouse.ordis.co.il/api/health)"

echo ""
echo "✅ Clean reinstall completed!"
echo "📊 PM2 Status:"
pm2 status
echo ""
echo "📁 Data backup saved in: $BACKUP_DIR"
echo "🌐 Site: https://edahouse.ordis.co.il"