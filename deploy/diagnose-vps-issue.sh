#!/bin/bash

echo "🔍 VPS Application Diagnostics"
echo "================================"

echo "📊 PM2 Status:"
pm2 status

echo ""
echo "📋 Latest Application Logs:"
pm2 logs edahouse --lines 10 --raw

echo ""
echo "🌐 Testing API Endpoints:"
echo "Health: $(curl -s https://edahouse.ordis.co.il/api/health)"
echo "Products: $(curl -s https://edahouse.ordis.co.il/api/products | head -c 100)..."

echo ""
echo "💾 Database Connection Test:"
node -e "
const { Client } = require('pg');
const client = new Client('postgresql://edahouse_ord:33V0R1N5qi81paiA@localhost:5432/edahouse_ord');
client.connect()
  .then(() => client.query('SELECT COUNT(*) FROM products'))
  .then(result => {
    console.log('✅ Database OK - Products:', result.rows[0].count);
    client.end();
  })
  .catch(err => {
    console.log('❌ Database Error:', err.message);
    client.end();
  });
"

echo ""
echo "🔧 Environment Check:"
echo "PORT from .env: $(grep PORT .env)"
echo "DATABASE_URL from .env: $(grep DATABASE_URL .env | cut -c1-80)..."

echo ""
echo "🔄 Process Details:"
pm2 show edahouse | grep -E "(pid|status|memory|cpu|restart)"