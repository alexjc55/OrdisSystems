#!/bin/bash

# QUICK PRODUCTION DATABASE FIX SCRIPT
# This script fixes the missing columns issue on the production server

echo "🔧 Starting production database fix..."

# Check if we're in the right directory
if [ ! -f "production-database-update.sql" ]; then
    echo "❌ Error: production-database-update.sql not found in current directory"
    echo "Please make sure you're in the project directory and the SQL file exists"
    exit 1
fi

# Execute database update
echo "📊 Updating database schema..."
psql -U edahouse_usr -h localhost -d edahouse -f production-database-update.sql

if [ $? -eq 0 ]; then
    echo "✅ Database update completed successfully"
    
    # Restart the application
    echo "🔄 Restarting application..."
    pm2 restart demo
    
    if [ $? -eq 0 ]; then
        echo "✅ Application restarted successfully"
        echo "🎉 Fix completed! The /api/settings endpoint should now work correctly."
        echo ""
        echo "To verify:"
        echo "1. Check PM2 logs: pm2 logs demo --lines 10"
        echo "2. Test the API: curl -s http://localhost:PORT/api/settings | head -1"
        echo "3. Open the website and check if admin panel works"
    else
        echo "❌ Failed to restart application"
        echo "Please manually restart: pm2 restart demo"
    fi
else
    echo "❌ Database update failed"
    echo "Please check the error messages above and try again"
    exit 1
fi