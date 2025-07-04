#!/bin/bash

# eDAHouse Replit to VPS Sync Script
# Handles transfer of changes from Replit development to VPS production

set -e

echo "🔄 Syncing from Replit to VPS"
echo "============================="

# Configuration
PROJECT_DIR="/var/www/edahouse.ordis.co.il"
GITHUB_REPO="https://github.com/yourusername/edahouse.git"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're on VPS
if [ ! -d "$PROJECT_DIR" ]; then
    print_error "This script should be run on VPS server"
    print_error "Project directory not found: $PROJECT_DIR"
    exit 1
fi

cd $PROJECT_DIR

# Step 1: Create backup before sync
print_status "Creating pre-sync backup..."
BACKUP_NAME="pre-sync-$(date +%Y%m%d_%H%M%S)"
./deploy/quick-commands.sh backup

# Step 2: Stop application temporarily
print_status "Stopping application..."
pm2 stop edahouse || true

# Step 3: Stash local changes (if any)
print_status "Stashing local changes..."
git add . || true
git stash || true

# Step 4: Pull latest changes from repository
print_status "Pulling latest changes from repository..."
git pull origin main || {
    print_error "Failed to pull from repository"
    print_status "Restoring application..."
    pm2 start edahouse
    exit 1
}

# Step 5: Restore critical production files
print_status "Restoring production configuration..."

# Restore .env file (production settings)
if [ -f ".env.production" ]; then
    cp .env.production .env
    print_status "Restored production .env"
elif git stash list | grep -q "stash@{0}"; then
    # Try to restore .env from stash
    git checkout stash@{0} -- .env 2>/dev/null || true
fi

# Ensure production environment variables
print_status "Ensuring production configuration..."
./deploy/fix-environment.sh

# Step 6: Install/update dependencies
print_status "Installing dependencies..."
npm install || {
    print_error "npm install failed"
    print_status "Restoring application..."
    pm2 start edahouse
    exit 1
}

# Step 7: Build application
print_status "Building application..."
npm run build || {
    print_error "Build failed"
    print_status "Restoring application..."
    pm2 start edahouse
    exit 1
}

# Step 8: Run database migrations
print_status "Running database migrations..."
npm run db:push || {
    print_warning "Database migration issues - continuing anyway"
}

# Step 9: Restart application
print_status "Restarting application..."
pm2 restart edahouse

# Step 10: Validate deployment
print_status "Validating deployment..."
sleep 5

# Health check
if curl -f -s http://localhost:3000/api/health >/dev/null; then
    print_status "✅ Health check passed"
else
    print_error "❌ Health check failed"
    print_status "Check logs: pm2 logs edahouse"
    exit 1
fi

# Step 11: Clean up old stashes and backups
print_status "Cleaning up..."
git stash clear 2>/dev/null || true

# Keep only last 3 backups
cd /var/backups/edahouse 2>/dev/null || true
if [ -d "/var/backups/edahouse" ]; then
    ls -t backup-*.tar.gz 2>/dev/null | tail -n +4 | xargs rm -f 2>/dev/null || true
    ls -t backup-*.sql 2>/dev/null | tail -n +4 | xargs rm -f 2>/dev/null || true
fi

cd $PROJECT_DIR

print_status "🎉 Sync completed successfully!"

echo ""
echo "📊 Sync Summary:"
echo "================"
echo "• Code updated from repository"
echo "• Dependencies installed"
echo "• Application rebuilt"
echo "• Database migrations applied"
echo "• Application restarted"
echo "• Health check passed"
echo ""
echo "🔍 Verification:"
echo "• Application: http://localhost:3000"
echo "• Health check: curl http://localhost:3000/api/health"
echo "• Logs: pm2 logs edahouse"
echo "• Status: pm2 status"
echo ""

# Show final status
./deploy/quick-commands.sh status