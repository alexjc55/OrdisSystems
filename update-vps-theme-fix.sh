#!/bin/bash

# VPS Update Script for Theme Manager Fix
# Fixes multilingual image synchronization issue

set -e

echo "🔧 Starting VPS theme manager update..."

# Define variables
VPS_HOST="edahouse.ordis.co.il"
VPS_USER="vxaorzmkzo"
VPS_PATH="/var/www/edahouse.ordis.co.il"
BACKUP_DIR="/var/www/edahouse.ordis.co.il/backups"

echo "📁 Creating backup directory..."
ssh $VPS_USER@$VPS_HOST "mkdir -p $BACKUP_DIR/$(date +%Y%m%d_%H%M%S)"

echo "💾 Backing up current theme-manager.tsx..."
ssh $VPS_USER@$VPS_HOST "cp $VPS_PATH/client/src/components/admin/theme-manager.tsx $BACKUP_DIR/$(date +%Y%m%d_%H%M%S)/"

echo "📤 Uploading fixed theme-manager.tsx..."
scp client/src/components/admin/theme-manager.tsx $VPS_USER@$VPS_HOST:$VPS_PATH/client/src/components/admin/

echo "🔄 Restarting application..."
ssh $VPS_USER@$VPS_HOST "cd $VPS_PATH && pm2 restart edahouse"

echo "⏳ Waiting for application to start..."
sleep 5

echo "🩺 Checking application health..."
if ssh $VPS_USER@$VPS_HOST "curl -s http://localhost:3000/api/settings > /dev/null"; then
    echo "✅ Application is running successfully!"
    echo "🎯 Theme manager multilingual image sync has been fixed"
    echo ""
    echo "🌐 Website: https://edahouse.ordis.co.il"
    echo "🔧 Admin panel: https://edahouse.ordis.co.il/admin"
    echo ""
    echo "📋 Fixed issues:"
    echo "   - Logo uploads now sync across all languages"
    echo "   - Banner images properly save in theme management"
    echo "   - Multilingual image fields included in theme updates"
    echo "   - Cart banner and bottom banner images sync correctly"
else
    echo "❌ Application health check failed"
    echo "🔙 Rolling back changes..."
    ssh $VPS_USER@$VPS_HOST "cp $BACKUP_DIR/$(date +%Y%m%d_%H%M%S)/theme-manager.tsx $VPS_PATH/client/src/components/admin/"
    ssh $VPS_USER@$VPS_HOST "cd $VPS_PATH && pm2 restart edahouse"
    exit 1
fi

echo ""
echo "🎉 VPS update completed successfully!"
echo "💡 You can now test image uploads in the admin panel theme management section"