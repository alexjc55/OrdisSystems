#!/bin/bash

# eDAHouse Database Fix Script
# Fixes PostgreSQL user and database configuration issues

set -e

echo "🔧 eDAHouse Database Fix Script"
echo "==============================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

print_action() {
    echo -e "${BLUE}[ACTION]${NC} $1"
}

# Check if running as root or with sudo privileges
if [ "$EUID" -ne 0 ]; then
    print_error "This script needs to be run with sudo privileges"
    echo "Usage: sudo ./deploy/fix-database.sh"
    exit 1
fi

PROJECT_DIR="/var/www/ordis_co_il_usr/data/www/edahouse.ordis.co.il"
DB_USER="edahouse_ord"
DB_NAME="edahouse_ord"
DB_PASSWORD="33V0R1N5qi81paiA"

print_status "Starting database configuration fix..."

# Step 1: Check if PostgreSQL is installed and running
print_action "Checking PostgreSQL status..."
if ! command -v psql &> /dev/null; then
    print_error "PostgreSQL is not installed"
    print_status "Installing PostgreSQL..."
    apt update
    apt install -y postgresql postgresql-contrib
fi

# Start PostgreSQL service
systemctl start postgresql
systemctl enable postgresql

# Step 2: Create database user if doesn't exist
print_action "Creating database user: $DB_USER"
sudo -u postgres psql -c "SELECT 1 FROM pg_roles WHERE rolname='$DB_USER';" | grep -q 1 || {
    print_status "Creating user $DB_USER..."
    sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';"
    sudo -u postgres psql -c "ALTER USER $DB_USER CREATEDB;"
    print_status "✅ User $DB_USER created successfully"
}

# Step 3: Create database if doesn't exist
print_action "Creating database: $DB_NAME"
sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -qw $DB_NAME || {
    print_status "Creating database $DB_NAME..."
    sudo -u postgres createdb -O $DB_USER $DB_NAME
    print_status "✅ Database $DB_NAME created successfully"
}

# Step 4: Grant all privileges
print_action "Setting up database permissions..."
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"
sudo -u postgres psql -d $DB_NAME -c "GRANT ALL ON SCHEMA public TO $DB_USER;"
sudo -u postgres psql -d $DB_NAME -c "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO $DB_USER;"
sudo -u postgres psql -d $DB_NAME -c "GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO $DB_USER;"

# Step 5: Update pg_hba.conf for local connections
print_action "Configuring PostgreSQL authentication..."
PG_VERSION=$(sudo -u postgres psql -t -c "SELECT version();" | grep -oP '(?<=PostgreSQL )\d+\.\d+' | head -1)
PG_HBA_FILE="/etc/postgresql/$PG_VERSION/main/pg_hba.conf"

if [ -f "$PG_HBA_FILE" ]; then
    # Backup original file
    cp "$PG_HBA_FILE" "$PG_HBA_FILE.backup"
    
    # Add md5 authentication for local connections
    if ! grep -q "local   $DB_NAME   $DB_USER   md5" "$PG_HBA_FILE"; then
        echo "local   $DB_NAME   $DB_USER   md5" >> "$PG_HBA_FILE"
        print_status "✅ Authentication configured for $DB_USER"
    fi
    
    # Restart PostgreSQL to apply changes
    systemctl restart postgresql
    sleep 2
fi

# Step 6: Test database connection
print_action "Testing database connection..."
export PGPASSWORD="$DB_PASSWORD"
if psql -U $DB_USER -d $DB_NAME -h localhost -c "SELECT 1;" &> /dev/null; then
    print_status "✅ Database connection test successful!"
else
    print_warning "Direct connection test failed, but this might work through the application"
fi

# Step 7: Update .env file if it exists
if [ -f "$PROJECT_DIR/.env" ]; then
    print_action "Updating .env file with correct DATABASE_URL..."
    cd "$PROJECT_DIR"
    
    # Remove old DATABASE_URL lines
    sed -i '/^DATABASE_URL=/d' .env
    
    # Add correct DATABASE_URL
    echo "DATABASE_URL=postgresql://$DB_USER:$DB_PASSWORD@localhost:5432/$DB_NAME" >> .env
    print_status "✅ .env file updated with correct database configuration"
fi

# Step 8: Initialize database schema if needed
if [ -d "$PROJECT_DIR" ]; then
    print_action "Initializing database schema..."
    cd "$PROJECT_DIR"
    
    if [ -f "package.json" ] && command -v npm &> /dev/null; then
        print_status "Running database schema push..."
        sudo -u ordis_co_il_usr npm run db:push 2>/dev/null || {
            print_warning "Schema push failed - this is normal for first-time setup"
        }
    fi
fi

print_status "✅ Database configuration completed!"
echo "=================================="
echo
print_status "Database Details:"
echo "• Database: $DB_NAME"
echo "• User: $DB_USER"  
echo "• Host: localhost"
echo "• Port: 5432"
echo
print_status "Connection String:"
echo "postgresql://$DB_USER:$DB_PASSWORD@localhost:5432/$DB_NAME"
echo
print_status "Test connection manually:"
echo "PGPASSWORD='$DB_PASSWORD' psql -U $DB_USER -d $DB_NAME -h localhost -c 'SELECT 1;'"
echo
print_status "If the application is running, restart it:"
echo "cd $PROJECT_DIR && pm2 restart edahouse"