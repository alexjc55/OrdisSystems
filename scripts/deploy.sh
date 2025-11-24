#!/bin/bash

# eDAHouse Deploy Script
# This script ensures Service Worker version is updated before each deployment

set -e

echo "🚀 Starting eDAHouse deployment process..."
echo ""

# Step 1: Update Service Worker version
echo "📝 Step 1/3: Updating Service Worker version..."
node scripts/update-sw-version.js
echo ""

# Step 2: Build the application
echo "🏗️  Step 2/3: Building application..."
npm run build
echo ""

# Step 3: Copy to VPS (if remote deployment)
if [ -n "$VPS_HOST" ]; then
  echo "📤 Step 3/3: Deploying to VPS..."
  rsync -avz --delete dist/ $VPS_USER@$VPS_HOST:/var/www/edahouse/
  echo ""
  
  echo "🔄 Restarting PM2 on VPS..."
  ssh $VPS_USER@$VPS_HOST "cd /var/www/edahouse && pm2 restart edahouse"
else
  echo "⚠️  Step 3/3: VPS deployment skipped (VPS_HOST not set)"
  echo "ℹ️  Build files are in ./dist/ folder"
fi

echo ""
echo "✅ Deployment complete!"
echo "📦 Service Worker will auto-update for all users"
