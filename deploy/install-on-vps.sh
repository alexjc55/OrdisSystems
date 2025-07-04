#!/bin/bash

# eDAHouse VPS Installation Script for FastPanel
# This script handles complete installation on VPS with FastPanel

set -e

echo "🚀 eDAHouse VPS Installation Script"
echo "=================================="

# Configuration
PROJECT_NAME="edahouse"
PROJECT_DIR="/var/www/edahouse.ordis.co.il"
DB_NAME="edahouse_ord"
DB_USER="edahouse_user"
NODE_VERSION="18"
PORT="3000"

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

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   print_error "This script must be run as root"
   exit 1
fi

# Step 1: Install Node.js if not present
print_status "Checking Node.js installation..."
if ! command -v node &> /dev/null; then
    print_status "Installing Node.js ${NODE_VERSION}..."
    curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
    apt-get install -y nodejs
else
    print_status "Node.js already installed: $(node --version)"
fi

# Step 2: Install PM2 globally
print_status "Installing PM2..."
npm install -g pm2

# Step 3: Install PostgreSQL if not present
print_status "Checking PostgreSQL installation..."
if ! command -v psql &> /dev/null; then
    print_status "Installing PostgreSQL..."
    apt-get update
    apt-get install -y postgresql postgresql-contrib
    systemctl start postgresql
    systemctl enable postgresql
else
    print_status "PostgreSQL already installed"
fi

# Step 4: Create database and user
print_status "Setting up database..."
sudo -u postgres psql -c "CREATE DATABASE IF NOT EXISTS ${DB_NAME};"
sudo -u postgres psql -c "CREATE USER IF NOT EXISTS ${DB_USER} WITH ENCRYPTED PASSWORD 'strong_password_here';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};"

# Step 5: Create project directory
print_status "Creating project directory..."
mkdir -p ${PROJECT_DIR}
cd ${PROJECT_DIR}

# Step 6: Clone or download project
print_status "Downloading project files..."
if [ -d ".git" ]; then
    print_status "Updating existing repository..."
    git pull origin main
else
    print_status "Cloning repository..."
    git clone https://github.com/yourusername/edahouse.git .
fi

# Step 7: Install dependencies
print_status "Installing project dependencies..."
npm install

# Step 8: Create production environment file
print_status "Creating production environment configuration..."
cat > .env << EOF
# Production Environment Configuration
NODE_ENV=production
PORT=${PORT}

# Database Configuration
DATABASE_URL=postgresql://${DB_USER}:strong_password_here@localhost:5432/${DB_NAME}

# Session Configuration
SESSION_SECRET=$(openssl rand -base64 32)

# Application Configuration
VITE_API_URL=https://edahouse.ordis.co.il
EOF

# Step 9: Build the application
print_status "Building application..."
npm run build

# Step 10: Run database migrations
print_status "Running database migrations..."
npm run db:push

# Step 11: Create PM2 ecosystem file
print_status "Creating PM2 configuration..."
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: '${PROJECT_NAME}',
    script: 'npm',
    args: 'start',
    cwd: '${PROJECT_DIR}',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: ${PORT}
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    restart_delay: 1000,
    max_restarts: 10,
    min_uptime: '10s'
  }]
};
EOF

# Step 12: Create logs directory
mkdir -p logs

# Step 13: Set proper permissions
print_status "Setting file permissions..."
chown -R www-data:www-data ${PROJECT_DIR}
chmod -R 755 ${PROJECT_DIR}

# Step 14: Start application with PM2
print_status "Starting application..."
pm2 start ecosystem.config.js
pm2 save
pm2 startup

print_status "Installation completed successfully!"
print_status "Application is running on port ${PORT}"

echo ""
echo "🎉 Installation Summary:"
echo "======================"
echo "• Project Directory: ${PROJECT_DIR}"
echo "• Database: ${DB_NAME}"
echo "• Port: ${PORT}"
echo "• PM2 Process: ${PROJECT_NAME}"
echo ""
echo "📋 Useful Commands:"
echo "• Check logs: pm2 logs ${PROJECT_NAME}"
echo "• Restart app: pm2 restart ${PROJECT_NAME}"
echo "• Stop app: pm2 stop ${PROJECT_NAME}"
echo "• Check status: pm2 status"
echo ""
echo "🔧 Next Steps:"
echo "1. Update DATABASE_URL password in .env file"
echo "2. Configure domain and SSL in FastPanel"
echo "3. Test the application"
echo ""