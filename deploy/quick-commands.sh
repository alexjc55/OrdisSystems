#!/bin/bash

# eDAHouse Quick Commands Script
# Helpful shortcuts for common operations

PROJECT_DIR="/var/www/edahouse.ordis.co.il"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

case "$1" in
    "status")
        echo -e "${GREEN}=== eDAHouse Status ===${NC}"
        echo "PM2 Status:"
        pm2 status | grep edahouse
        echo ""
        echo "Port 3000 Status:"
        netstat -tlnp | grep :3000
        echo ""
        echo "Health Check:"
        curl -s http://localhost:3000/api/health | head -1
        ;;
    
    "logs")
        echo -e "${GREEN}=== Recent Logs ===${NC}"
        pm2 logs edahouse --lines 20
        ;;
    
    "restart")
        echo -e "${GREEN}=== Restarting Application ===${NC}"
        cd $PROJECT_DIR
        pm2 restart edahouse
        echo "Waiting for startup..."
        sleep 3
        curl -s http://localhost:3000/api/health
        ;;
    
    "update")
        echo -e "${GREEN}=== Quick Update ===${NC}"
        cd $PROJECT_DIR
        ./deploy/update-project.sh
        ;;
    
    "fix")
        echo -e "${GREEN}=== Fixing Environment ===${NC}"
        cd $PROJECT_DIR
        ./deploy/fix-environment.sh
        pm2 restart edahouse
        ;;
    
    "backup")
        echo -e "${GREEN}=== Creating Backup ===${NC}"
        cd $PROJECT_DIR
        BACKUP_NAME="manual-backup-$(date +%Y%m%d_%H%M%S)"
        pg_dump -U edahouse_user edahouse_ord > "/var/backups/edahouse/$BACKUP_NAME.sql"
        tar -czf "/var/backups/edahouse/$BACKUP_NAME.tar.gz" --exclude=node_modules .
        echo "Backup created: $BACKUP_NAME"
        ;;
    
    "env")
        echo -e "${GREEN}=== Environment Check ===${NC}"
        cd $PROJECT_DIR
        echo "Node version: $(node --version)"
        echo "NPM version: $(npm --version)"
        echo "PM2 version: $(pm2 --version)"
        echo "PostgreSQL status: $(systemctl is-active postgresql)"
        echo ""
        echo "Environment file (.env):"
        grep -E "^(NODE_ENV|PORT|DATABASE_URL)" .env | sed 's/=.*/=***/'
        ;;
    
    "db")
        echo -e "${GREEN}=== Database Connection Test ===${NC}"
        psql -U edahouse_user -d edahouse_ord -c "SELECT 'Database connection OK' as status;"
        ;;
    
    *)
        echo -e "${GREEN}eDAHouse Quick Commands${NC}"
        echo "Usage: ./deploy/quick-commands.sh [command]"
        echo ""
        echo "Available commands:"
        echo "  status   - Show application status"
        echo "  logs     - Show recent logs"
        echo "  restart  - Restart application"
        echo "  update   - Update project"
        echo "  fix      - Fix environment issues"
        echo "  backup   - Create manual backup"
        echo "  env      - Check environment"
        echo "  db       - Test database connection"
        echo ""
        echo "Examples:"
        echo "  ./deploy/quick-commands.sh status"
        echo "  ./deploy/quick-commands.sh logs"
        echo "  ./deploy/quick-commands.sh restart"
        ;;
esac