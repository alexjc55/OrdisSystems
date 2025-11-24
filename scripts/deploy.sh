#!/bin/bash

# eDAHouse Deploy Script
# This script ensures Service Worker version is updated before each deployment

set -e

echo "🚀 Starting eDAHouse deployment process..."
echo ""

# Step 1: Update Service Worker version
echo "📝 Step 1/4: Updating Service Worker version..."
node scripts/update-sw-version.js
echo ""

# Step 2: Build the application
echo "🏗️  Step 2/4: Building application..."
npm run build
echo ""

# Step 3: Copy to VPS (if remote deployment)
if [ -n "$VPS_HOST" ]; then
  echo "📤 Step 3/4: Deploying to VPS..."
  
  # Copy dist folder
  rsync -avz --delete dist/ $VPS_USER@$VPS_HOST:/var/www/edahouse/dist/
  
  # Copy ecosystem config
  rsync -avz ecosystem.config.js $VPS_USER@$VPS_HOST:/var/www/edahouse/
  
  # Copy client folder for HTML (needed for meta injection)
  rsync -avz --delete client/ $VPS_USER@$VPS_HOST:/var/www/edahouse/client/
  
  echo ""
  
  echo "🔄 Step 4/4: Restarting PM2 with production environment..."
  ssh $VPS_USER@$VPS_HOST "cd /var/www/edahouse && pm2 restart ecosystem.config.js --env production --update-env"
else
  echo "⚠️  Step 3/4: VPS deployment skipped (VPS_HOST not set)"
  echo ""
  echo "ℹ️  Manual deployment instructions:"
  echo "   1. Copy dist/ folder to VPS:/var/www/edahouse/dist/"
  echo "   2. Copy ecosystem.config.js to VPS:/var/www/edahouse/"
  echo "   3. Copy client/ folder to VPS:/var/www/edahouse/client/"
  echo "   4. On VPS run: cd /var/www/edahouse && pm2 restart ecosystem.config.js --env production --update-env"
  echo ""
  echo "   Or set VPS_HOST and VPS_USER environment variables for automatic deployment:"
  echo "   export VPS_HOST=edahouse.ordis.co.il"
  echo "   export VPS_USER=your_username"
fi

echo ""
echo "✅ Deployment complete!"
echo "📦 Service Worker will auto-update for all users"
echo "🔍 SEO middleware will inject structured data for search engines"
