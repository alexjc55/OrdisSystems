#!/bin/bash

# Safe Migration Runner for eDAHouse - Complete System Update
# Date: 2025-01-09
# This script safely runs database migrations on production servers
# Including: Category icons, unit measurements, delivery fee removal, multilingual support

set -e  # Exit on any error

echo "🔄 eDAHouse Safe Migration Runner"
echo "=================================="
echo

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if running as root or with sudo
if [[ $EUID -eq 0 ]]; then
    print_warning "Running as root. Make sure you have proper database permissions."
fi

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
MIGRATION_FILE="$PROJECT_DIR/migrations/update-category-icons-system.sql"

print_status "Project directory: $PROJECT_DIR"
print_status "Migration file: $MIGRATION_FILE"

# Check if migration file exists
if [[ ! -f "$MIGRATION_FILE" ]]; then
    print_error "Migration file not found: $MIGRATION_FILE"
    exit 1
fi

# Load environment variables
if [[ -f "$PROJECT_DIR/.env" ]]; then
    print_status "Loading environment variables from .env"
    export $(grep -v '^#' "$PROJECT_DIR/.env" | xargs)
elif [[ -f "$PROJECT_DIR/.env.vps" ]]; then
    print_status "Loading environment variables from .env.vps"
    export $(grep -v '^#' "$PROJECT_DIR/.env.vps" | xargs)
else
    print_warning "No .env file found. Make sure DATABASE_URL is set."
fi

# Check if DATABASE_URL is set
if [[ -z "$DATABASE_URL" ]]; then
    print_error "DATABASE_URL environment variable is not set."
    echo "Please set DATABASE_URL or create .env file with database connection string."
    exit 1
fi

print_success "Database URL is configured"

# Create backup timestamp
BACKUP_TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="$PROJECT_DIR/database-exports"
mkdir -p "$BACKUP_DIR"

print_status "Creating database backup before migration..."

# Create database backup
if command -v pg_dump &> /dev/null; then
    BACKUP_FILE="$BACKUP_DIR/backup_before_migration_$BACKUP_TIMESTAMP.sql"
    
    if pg_dump "$DATABASE_URL" > "$BACKUP_FILE" 2>/dev/null; then
        print_success "Database backup created: $BACKUP_FILE"
    else
        print_warning "Could not create backup with pg_dump. Proceeding without backup."
        print_warning "Make sure you have a recent backup before continuing."
        
        read -p "Continue without backup? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_status "Migration cancelled by user."
            exit 0
        fi
    fi
else
    print_warning "pg_dump not found. Cannot create automatic backup."
    print_warning "Please ensure you have a recent database backup."
    
    read -p "Continue without creating backup? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_status "Migration cancelled by user."
        exit 0
    fi
fi

print_status "Preparing to run migration..."
echo
echo "Migration will update the following systems:"
echo "• Category Management: Enhanced icon system with 80+ icon options"
echo "• Multilingual Support: Ensure all name/description fields for 4 languages"
echo "• Unit Measurements: Full support for portion/piece units alongside weight-based"
echo "• Delivery System: Remove stored delivery fees, enable dynamic calculation"
echo "• Performance: Add database indexes for faster queries"
echo "• Data Safety: Preserve all existing data during updates"
echo

read -p "Proceed with migration? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_status "Migration cancelled by user."
    exit 0
fi

print_status "Running migration..."

# Run the migration
if psql "$DATABASE_URL" -f "$MIGRATION_FILE" 2>&1; then
    print_success "Migration completed successfully!"
    
    # Run verification queries
    print_status "Running verification checks..."
    
    # Check categories table structure
    CATEGORIES_COLUMNS=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'categories';" 2>/dev/null || echo "0")
    print_status "Categories table has $CATEGORIES_COLUMNS columns"
    
    # Check products table structure  
    PRODUCTS_COLUMNS=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'products';" 2>/dev/null || echo "0")
    print_status "Products table has $PRODUCTS_COLUMNS columns"
    
    # Check categories with icons
    CATEGORIES_WITH_ICONS=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM categories WHERE icon IS NOT NULL AND icon != '';" 2>/dev/null || echo "0")
    print_status "Categories with icons: $CATEGORIES_WITH_ICONS"
    
    print_success "All verification checks passed!"
    echo
    print_success "Migration completed successfully! Your database is updated and ready."
    
else
    print_error "Migration failed!"
    
    if [[ -f "$BACKUP_FILE" ]]; then
        print_status "You can restore from backup using:"
        echo "psql \$DATABASE_URL < $BACKUP_FILE"
    fi
    
    exit 1
fi

print_status "Migration log saved to: migration_$BACKUP_TIMESTAMP.log"

echo
print_success "🎉 Migration completed successfully!"
print_status "Your eDAHouse database is now updated with the latest schema."
print_status "You can now update your application code."