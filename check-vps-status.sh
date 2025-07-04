#!/bin/bash
echo "=== VPS Application Diagnostic ==="

echo "1. PM2 Status:"
pm2 status

echo -e "\n2. Recent Error Logs:"
pm2 logs edahouse --lines 10 --nostream | grep -A 3 -B 3 -i "error\|failed\|exception"

echo -e "\n3. Process Environment Check:"
pm2 env 0

echo -e "\n4. Database Connection Test:"
export DATABASE_URL="postgresql://edahouse_ord:33V0R1N5qi81paiA@localhost:5432/edahouse_ord"
node -e "
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query('SELECT name FROM products LIMIT 1')
  .then(result => console.log('✅ DB Test - First product:', result.rows[0]?.name))
  .catch(err => console.error('❌ DB Test failed:', err.message));
"

echo -e "\n5. Check if server is listening on port 3000:"
netstat -tlnp | grep :3000 || echo "❌ No process listening on port 3000"

echo -e "\n6. Test direct server connection:"
curl -v http://localhost:3000/api/health 2>&1 | grep -E "(Connected|HTTP|error|refused)"
