#!/bin/bash

# eDAHouse Environment Fix Script
# Fixes common issues when moving from Replit to VPS

set -e

echo "🔧 eDAHouse Environment Fix Script"
echo "=================================="

PROJECT_DIR="/var/www/edahouse.ordis.co.il"
cd $PROJECT_DIR

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Fix 1: Port Configuration
print_status "Fixing port configuration..."
if [ -f ".env" ]; then
    # Change PORT from 5000 to 3000
    sed -i 's/PORT=5000/PORT=3000/g' .env
    sed -i 's/PORT=5432/PORT=3000/g' .env
    
    # Ensure PORT is set to 3000
    if ! grep -q "PORT=3000" .env; then
        echo "PORT=3000" >> .env
    fi
    
    print_status "Port configuration updated to 3000"
else
    print_error ".env file not found"
fi

# Fix 2: Database Configuration
print_status "Fixing database configuration..."
if [ -f ".env" ]; then
    # Remove Neon database URL if present
    sed -i '/DATABASE_URL.*neon/d' .env
    
    # Add PostgreSQL configuration if not present
    if ! grep -q "DATABASE_URL=postgresql://" .env; then
        echo "DATABASE_URL=postgresql://edahouse_user:strong_password_here@localhost:5432/edahouse_ord" >> .env
    fi
    
    print_status "Database configuration updated for PostgreSQL"
fi

# Fix 3: Node Environment
print_status "Fixing Node.js environment..."
if [ -f ".env" ]; then
    # Ensure NODE_ENV is production
    sed -i 's/NODE_ENV=development/NODE_ENV=production/g' .env
    
    if ! grep -q "NODE_ENV=production" .env; then
        echo "NODE_ENV=production" >> .env
    fi
    
    print_status "Node environment set to production"
fi

# Fix 4: Import Meta Dirname Issue
print_status "Fixing import.meta.dirname compatibility..."

# Fix vite.config.ts
if [ -f "vite.config.ts" ]; then
    if grep -q "import.meta.dirname" vite.config.ts; then
        print_status "Fixing vite.config.ts..."
        cat > vite.config.ts << 'EOF'
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './client/src'),
      '@assets': path.resolve(__dirname, './attached_assets'),
    },
  },
  server: {
    port: 5000,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
EOF
    fi
fi

# Fix server/vite.ts if exists
if [ -f "server/vite.ts" ]; then
    if grep -q "import.meta.dirname" server/vite.ts; then
        print_status "Fixing server/vite.ts..."
        cat > server/vite.ts << 'EOF'
import { createServer } from 'vite';
import { fileURLToPath, URL } from 'node:url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function createViteServer() {
  const vite = await createServer({
    root: path.resolve(__dirname, '..'),
    server: { middlewareMode: true },
    appType: 'spa',
  });
  
  return vite;
}
EOF
    fi
fi

# Fix 5: Package.json scripts
print_status "Fixing package.json scripts..."
if [ -f "package.json" ]; then
    # Update start script for production
    if grep -q '"start":.*"tsx"' package.json; then
        sed -i 's/"start":.*"tsx.*"/"start": "node dist\/server\/index.js"/g' package.json
        print_status "Updated start script for production"
    fi
fi

# Fix 6: Create startup script
print_status "Creating startup script..."
cat > start-production.js << 'EOF'
// Production startup script
const { spawn } = require('child_process');
const path = require('path');

// Set environment variables
process.env.NODE_ENV = 'production';
process.env.PORT = process.env.PORT || '3000';

// Start the server
const serverPath = path.join(__dirname, 'server', 'index.js');
const server = spawn('node', [serverPath], {
  stdio: 'inherit',
  env: process.env
});

server.on('close', (code) => {
  console.log(`Server process exited with code ${code}`);
});

server.on('error', (error) => {
  console.error('Failed to start server:', error);
});
EOF

# Fix 7: Update PM2 configuration
print_status "Updating PM2 configuration..."
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'edahouse',
    script: 'tsx',
    args: 'server/index.ts',
    cwd: '/var/www/edahouse.ordis.co.il',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    env_file: '.env',
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    restart_delay: 1000,
    max_restarts: 10,
    min_uptime: '10s',
    watch: false,
    ignore_watch: ['node_modules', 'logs', 'uploads']
  }]
};
EOF

# Fix 8: Install tsx globally if not present
print_status "Ensuring tsx is available..."
if ! command -v tsx &> /dev/null; then
    npm install -g tsx
fi

# Fix 9: Create health check endpoint
print_status "Ensuring health check endpoint exists..."
if [ -f "server/routes.ts" ]; then
    if ! grep -q "/api/health" server/routes.ts; then
        print_status "Adding health check endpoint..."
        # Add health check to routes file
        sed -i '/export async function registerRoutes/a\
\
  // Health check endpoint\
  app.get("/api/health", (req, res) => {\
    res.json({ status: "ok", timestamp: new Date().toISOString() });\
  });' server/routes.ts
    fi
fi

# Fix 10: Set correct permissions
print_status "Setting correct permissions..."
chown -R www-data:www-data .
chmod +x start-production.js
chmod +x deploy/*.sh

print_status "Environment fixes completed!"

echo ""
echo "🎉 Environment Fix Summary:"
echo "=========================="
echo "• Port configuration: 3000"
echo "• Database: PostgreSQL"
echo "• Node environment: production"
echo "• Import meta dirname: fixed"
echo "• PM2 configuration: updated"
echo "• Health check: available"
echo ""
echo "🔄 Next Steps:"
echo "1. Restart the application: pm2 restart edahouse"
echo "2. Check logs: pm2 logs edahouse"
echo "3. Test health check: curl http://localhost:3000/api/health"
echo ""