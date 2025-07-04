#!/bin/bash

# eDAHouse Installation Validation Script
# Checks if everything is working correctly

set -e

echo "🔍 eDAHouse Installation Validation"
echo "==================================="

PROJECT_DIR="/var/www/ordis_co_il_usr/data/www/edahouse.ordis.co.il"
EXPECTED_PORT="3000"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

passed=0
failed=0

check_pass() {
    echo -e "${GREEN}✓${NC} $1"
    ((passed++))
}

check_fail() {
    echo -e "${RED}✗${NC} $1"
    ((failed++))
}

check_warn() {
    echo -e "${YELLOW}⚠${NC} $1"
}

echo ""
echo "🔧 System Dependencies Check"
echo "============================"

# Check Node.js
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    check_pass "Node.js installed: $NODE_VERSION"
else
    check_fail "Node.js not found"
fi

# Check npm
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    check_pass "npm installed: $NPM_VERSION"
else
    check_fail "npm not found"
fi

# Check PM2
if command -v pm2 &> /dev/null; then
    check_pass "PM2 installed"
else
    check_fail "PM2 not found"
fi

# Check PostgreSQL
if command -v psql &> /dev/null; then
    if systemctl is-active --quiet postgresql; then
        check_pass "PostgreSQL installed and running"
    else
        check_fail "PostgreSQL installed but not running"
    fi
else
    check_fail "PostgreSQL not found"
fi

echo ""
echo "📁 Project Files Check"
echo "====================="

# Check project directory
if [ -d "$PROJECT_DIR" ]; then
    check_pass "Project directory exists: $PROJECT_DIR"
    cd "$PROJECT_DIR"
else
    check_fail "Project directory not found: $PROJECT_DIR"
    exit 1
fi

# Check essential files
FILES=("package.json" ".env" "ecosystem.config.js")
for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        check_pass "$file exists"
    else
        check_fail "$file missing"
    fi
done

# Check node_modules
if [ -d "node_modules" ]; then
    check_pass "Dependencies installed"
else
    check_fail "Dependencies not installed (run npm install)"
fi

# Check dist directory
if [ -d "dist" ]; then
    check_pass "Application built"
else
    check_warn "Application not built (run npm run build)"
fi

echo ""
echo "🗄️ Database Check"
echo "================"

# Check database connection
if [ -f ".env" ]; then
    DB_URL=$(grep "DATABASE_URL" .env | cut -d'=' -f2-)
    if [[ $DB_URL == *"postgresql://"* ]]; then
        check_pass "Database URL configured"
        
        # Test database connection
        if psql "$DB_URL" -c "SELECT 1;" &> /dev/null; then
            check_pass "Database connection successful"
        else
            check_fail "Cannot connect to database"
        fi
    else
        check_fail "Invalid database URL in .env"
    fi
else
    check_fail "Environment file (.env) not found"
fi

echo ""
echo "🚀 Application Check"
echo "==================="

# Check PM2 process
if pm2 list | grep -q "edahouse"; then
    STATUS=$(pm2 list | grep "edahouse" | awk '{print $10}')
    if [[ $STATUS == "online" ]]; then
        check_pass "PM2 process running"
    else
        check_fail "PM2 process not online (status: $STATUS)"
    fi
else
    check_fail "PM2 process not found"
fi

# Check port
if netstat -tlnp | grep -q ":$EXPECTED_PORT"; then
    check_pass "Port $EXPECTED_PORT is in use"
else
    check_fail "Port $EXPECTED_PORT not in use"
fi

# Check health endpoint
if curl -f -s "http://localhost:$EXPECTED_PORT/api/health" &> /dev/null; then
    check_pass "Health endpoint responding"
else
    check_fail "Health endpoint not responding"
fi

# Check main page
if curl -f -s "http://localhost:$EXPECTED_PORT" &> /dev/null; then
    check_pass "Main page accessible"
else
    check_fail "Main page not accessible"
fi

echo ""
echo "📊 Configuration Check"
echo "====================="

if [ -f ".env" ]; then
    # Check PORT setting
    if grep -q "PORT=$EXPECTED_PORT" .env; then
        check_pass "Port configured correctly ($EXPECTED_PORT)"
    else
        check_fail "Port not configured correctly"
    fi
    
    # Check NODE_ENV
    if grep -q "NODE_ENV=production" .env; then
        check_pass "Production environment set"
    else
        check_warn "NODE_ENV not set to production"
    fi
    
    # Check SESSION_SECRET
    if grep -q "SESSION_SECRET=" .env; then
        check_pass "Session secret configured"
    else
        check_fail "Session secret not configured"
    fi
fi

echo ""
echo "📋 Summary"
echo "=========="
echo -e "Passed: ${GREEN}$passed${NC}"
echo -e "Failed: ${RED}$failed${NC}"

if [ $failed -eq 0 ]; then
    echo -e "\n${GREEN}🎉 All checks passed! Application is ready.${NC}"
    echo ""
    echo "✅ Next steps:"
    echo "• Test the application in browser"
    echo "• Configure SSL in FastPanel"
    echo "• Set up monitoring"
    exit 0
else
    echo -e "\n${RED}❌ Some checks failed. Please fix the issues above.${NC}"
    echo ""
    echo "🔧 Suggested fixes:"
    echo "• Run: ./deploy/fix-environment.sh"
    echo "• Check logs: pm2 logs edahouse"
    echo "• Restart: pm2 restart edahouse"
    exit 1
fi