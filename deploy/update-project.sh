#!/bin/bash

# eDAHouse Project Update Script
# This script handles safe updates preserving user data

set -e

echo "🔄 eDAHouse Project Update Script"
echo "================================="

# Configuration
PROJECT_NAME="edahouse"
PROJECT_DIR="/var/www/edahouse.ordis.co.il"
BACKUP_DIR="/var/backups/edahouse"
PORT="3000"

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

# Check if project exists
if [ ! -d "$PROJECT_DIR" ]; then
    print_error "Project directory not found: $PROJECT_DIR"
    print_error "Please run install-on-vps.sh first"
    exit 1
fi

cd $PROJECT_DIR

# Step 1: Create backup
print_status "Creating backup..."
mkdir -p $BACKUP_DIR
BACKUP_NAME="backup-$(date +%Y%m%d_%H%M%S)"
BACKUP_PATH="$BACKUP_DIR/$BACKUP_NAME"

# Backup database
print_status "Backing up database..."
pg_dump -U edahouse_user -h localhost edahouse_ord > "$BACKUP_PATH.sql"

# Backup files
print_status "Backing up files..."
tar -czf "$BACKUP_PATH.tar.gz" --exclude=node_modules --exclude=.git .

# Step 2: Stop application
print_status "Stopping application..."
pm2 stop $PROJECT_NAME || true

# Step 3: Backup critical files
print_status "Backing up critical configuration..."
cp .env .env.backup || true
cp -r uploads uploads.backup || true

# Step 4: Update code
print_status "Updating project code..."
git pull origin main || {
    print_error "Git pull failed"
    print_status "Restoring application..."
    pm2 start $PROJECT_NAME
    exit 1
}

# Step 5: Install/update dependencies
print_status "Installing dependencies..."
npm install || {
    print_error "npm install failed"
    print_status "Restoring application..."
    pm2 start $PROJECT_NAME
    exit 1
}

# Step 6: Restore critical files
print_status "Restoring configuration..."
if [ -f ".env.backup" ]; then
    cp .env.backup .env
    rm .env.backup
fi

if [ -d "uploads.backup" ]; then
    rm -rf uploads
    mv uploads.backup uploads
fi

# Step 7: Build application
print_status "Building application..."
npm run build || {
    print_error "Build failed"
    print_status "Restoring application..."
    pm2 start $PROJECT_NAME
    exit 1
}

# Step 8: Run database migrations
print_status "Running database migrations..."
npm run db:push || {
    print_warning "Database migration failed - continuing anyway"
}

# Step 9: Restart application
print_status "Restarting application..."
pm2 restart $PROJECT_NAME

# Step 10: Health check
print_status "Running health check..."
sleep 5
curl -f http://localhost:$PORT/api/health || {
    print_error "Health check failed"
    print_status "Check logs with: pm2 logs $PROJECT_NAME"
    exit 1
}

# Step 11: Cleanup old backups (keep last 5)
print_status "Cleaning old backups..."
cd $BACKUP_DIR
ls -t backup-*.tar.gz | tail -n +6 | xargs rm -f || true
ls -t backup-*.sql | tail -n +6 | xargs rm -f || true

print_status "Update completed successfully!"
print_status "Application is running on port $PORT"
print_status "Backup saved to: $BACKUP_PATH"

echo ""
echo "🎉 Update Summary:"
echo "=================="
echo "• Project updated successfully"
echo "• Database backup: $BACKUP_PATH.sql"
echo "• Files backup: $BACKUP_PATH.tar.gz"
echo "• Application restarted"
echo ""
echo "📋 Useful Commands:"
echo "• Check logs: pm2 logs $PROJECT_NAME"
echo "• Check status: pm2 status"
echo "• Restart if needed: pm2 restart $PROJECT_NAME"
echo ""