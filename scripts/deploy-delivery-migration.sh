#!/bin/bash

# Deployment script for delivery fee migration on VPS
# This script removes the delivery_fee column from orders table
# as part of the dynamic delivery calculation update

set -e  # Exit on any error

echo "🚀 Starting delivery fee migration deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if database environment variables are set
if [ -z "$DATABASE_URL" ] && [ -z "$PGDATABASE" ]; then
    print_error "Database connection not configured. Please set DATABASE_URL or PGDATABASE environment variables."
    exit 1
fi

# Create backup directory if it doesn't exist
BACKUP_DIR="./database-exports"
mkdir -p "$BACKUP_DIR"

# Generate backup filename with timestamp
BACKUP_FILE="$BACKUP_DIR/backup_before_delivery_migration_$(date +%Y%m%d_%H%M%S).sql"

print_status "Creating database backup..."

# Create database backup
if [ -n "$DATABASE_URL" ]; then
    # Use DATABASE_URL if available
    pg_dump "$DATABASE_URL" > "$BACKUP_FILE"
else
    # Use individual environment variables
    pg_dump -h "${PGHOST:-localhost}" -U "${PGUSER}" -d "${PGDATABASE}" > "$BACKUP_FILE"
fi

if [ $? -eq 0 ]; then
    print_status "Database backup created: $BACKUP_FILE"
else
    print_error "Failed to create database backup. Aborting migration."
    exit 1
fi

# Check if migration file exists
MIGRATION_FILE="./migrations/remove-delivery-fee-from-orders.sql"
if [ ! -f "$MIGRATION_FILE" ]; then
    print_error "Migration file not found: $MIGRATION_FILE"
    exit 1
fi

print_status "Executing delivery fee migration..."

# Execute the migration
if [ -n "$DATABASE_URL" ]; then
    psql "$DATABASE_URL" -f "$MIGRATION_FILE"
else
    psql -h "${PGHOST:-localhost}" -U "${PGUSER}" -d "${PGDATABASE}" -f "$MIGRATION_FILE"
fi

if [ $? -eq 0 ]; then
    print_status "Migration executed successfully!"
else
    print_error "Migration failed. Please check the error messages above."
    print_warning "Database backup is available at: $BACKUP_FILE"
    exit 1
fi

# Verify migration was successful
print_status "Verifying migration..."

VERIFICATION_QUERY="SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'delivery_fee';"

if [ -n "$DATABASE_URL" ]; then
    COLUMN_COUNT=$(psql "$DATABASE_URL" -t -c "$VERIFICATION_QUERY" | tr -d ' ')
else
    COLUMN_COUNT=$(psql -h "${PGHOST:-localhost}" -U "${PGUSER}" -d "${PGDATABASE}" -t -c "$VERIFICATION_QUERY" | tr -d ' ')
fi

if [ "$COLUMN_COUNT" = "0" ]; then
    print_status "✅ Migration verification successful - delivery_fee column removed"
else
    print_error "❌ Migration verification failed - delivery_fee column still exists"
    exit 1
fi

# Optional: Restart application if PM2 is available
if command -v pm2 &> /dev/null; then
    print_status "Restarting application with PM2..."
    pm2 restart all
    print_status "Application restarted"
else
    print_warning "PM2 not found. Please restart your application manually."
fi

print_status "🎉 Delivery fee migration completed successfully!"
print_status "📋 Next steps:"
echo "   1. Test order creation and delivery fee calculation"
echo "   2. Verify admin panel shows correct delivery fees"
echo "   3. Check store settings can modify delivery costs"
echo "   4. Backup file saved at: $BACKUP_FILE"

print_warning "Important: The application now calculates delivery fees dynamically from store settings."
print_warning "Make sure your application code is updated to the latest version."

echo ""
print_status "Migration deployment complete! 🚀"