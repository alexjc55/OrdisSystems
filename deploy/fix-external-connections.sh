#!/bin/bash

echo "🔍 Fixing external connection issues..."

# Check current DATABASE_URL
echo "Current DATABASE_URL:"
grep DATABASE_URL .env

# Force local database URL
echo "Setting correct local DATABASE_URL..."
sed -i 's|DATABASE_URL=.*|DATABASE_URL=postgresql://edahouse_ord:33V0R1N5qi81paiA@localhost:5432/edahouse_ord|g' .env

# Check for any Neon references in the code
echo "Checking for external database references..."
grep -r "neon.tech\|ep-black-bonus" . --exclude-dir=node_modules --exclude-dir=.git || echo "No external refs found"

# Check drizzle config
echo "Checking drizzle.config.ts..."
cat drizzle.config.ts

# Update drizzle config if needed
cat > drizzle.config.ts << 'EOF'
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: './shared/schema.ts',
  out: './migrations',
  dbCredentials: {
    url: 'postgresql://edahouse_ord:33V0R1N5qi81paiA@localhost:5432/edahouse_ord'
  }
});
EOF

# Test database connection directly
echo "Testing direct database connection..."
node -e "
const { Client } = require('pg');
const client = new Client('postgresql://edahouse_ord:33V0R1N5qi81paiA@localhost:5432/edahouse_ord');
client.connect()
  .then(() => {
    console.log('✅ Direct DB connection successful');
    return client.query('SELECT COUNT(*) as count FROM products');
  })
  .then(result => {
    console.log('✅ Products count:', result.rows[0].count);
    return client.query('SELECT COUNT(*) as count FROM store_settings');
  })
  .then(result => {
    console.log('✅ Store settings count:', result.rows[0].count);
    client.end();
  })
  .catch(err => {
    console.error('❌ Database error:', err.message);
    client.end();
  });
"

# Restart with clean environment
echo "Restarting application with clean environment..."
pm2 delete edahouse
pm2 start ecosystem.config.cjs
sleep 5

# Test API endpoints
echo "Testing API endpoints..."
echo "Health: $(curl -s http://localhost:3000/api/health)"
echo "Products: $(curl -s http://localhost:3000/api/products | head -c 100)..."

echo "✅ Fix completed!"