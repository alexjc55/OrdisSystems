# Safe Deployment & Auto-Update Guide

This guide explains how to safely deploy multiple instances of the project and enable automatic updates while preserving user data.

## 🚀 Initial Deployment

### 1. Server Setup (per instance)

```bash
# Create directories for each instance
mkdir -p /var/www/site1 /var/www/site2

# Clone the project
cd /var/www/site1
git clone https://github.com/your-repo/project.git .

# Copy and configure environment
cp .env.example .env
# Edit .env with instance-specific settings
```

### 2. Database Setup

Create separate databases for each instance:
```sql
CREATE DATABASE site1_db;
CREATE DATABASE site2_db;
CREATE USER site1_user WITH PASSWORD 'strong_password';
GRANT ALL PRIVILEGES ON DATABASE site1_db TO site1_user;
```

### 3. Environment Configuration

Create `.env` file for each instance:
```env
# Instance-specific configuration
DATABASE_URL=postgresql://site1_user:password@localhost:5432/site1_db
SESSION_SECRET=unique_session_secret_for_site1
PORT=3001
NODE_ENV=production
```

### 4. Initial Migration

```bash
# Install dependencies
npm install

# Run initial migrations
npm run db:generate
node scripts/run-migrations.js

# Seed initial data
npm run seed
```

## 🔄 Automatic Updates

### Safe Update Process

The project includes scripts for safe automatic updates that preserve user data:

```bash
# Run safe update (preserves uploads, .env, config)
./scripts/update-safe.sh
```

### What the update process does:

1. **Backs up user data**: uploads/, .env, config/
2. **Stashes local changes**: Preserves any customizations
3. **Pulls latest code**: Gets core application updates
4. **Restores user data**: Overwrites any conflicts with user data
5. **Updates dependencies**: Safely updates npm packages
6. **Runs migrations**: Applies new database changes only
7. **Creates backup**: Full database backup before changes

### PM2 Process Management

Setup PM2 for multiple instances:

```javascript
// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'site1',
      script: 'npm',
      args: 'start',
      cwd: '/var/www/site1',
      env: {
        PORT: 3001,
        NODE_ENV: 'production'
      }
    },
    {
      name: 'site2',
      script: 'npm',
      args: 'start', 
      cwd: '/var/www/site2',
      env: {
        PORT: 3002,
        NODE_ENV: 'production'
      }
    }
  ]
}
```

### Nginx Configuration

```nginx
# /etc/nginx/sites-available/multisite
server {
    server_name site1.com;
    
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
    
    location /uploads/ {
        alias /var/www/site1/uploads/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}

server {
    server_name site2.com;
    
    location / {
        proxy_pass http://localhost:3002;
        # ... same proxy settings
    }
    
    location /uploads/ {
        alias /var/www/site2/uploads/;
        # ... same cache settings
    }
}
```

## 🔐 Data Safety

### Protected Files & Directories

The update system automatically preserves:
- `uploads/` - User uploaded files
- `.env` - Environment configuration
- `config/` - Local configuration files
- Database content - Only structure is updated

### Backup Strategy

1. **Automatic backups** before each update
2. **Database dumps** before migrations
3. **File backups** of user data

Access backups in `backups/` directory:
```bash
ls backups/
# migration_backup_2024-01-15_14-30-00.sql
# 20240115_143000/  (full file backup)
```

## 🚨 Rollback Process

If an update fails:

1. **Restore database**:
```bash
psql $DATABASE_URL < backups/migration_backup_TIMESTAMP.sql
```

2. **Restore files**:
```bash
cp -r backups/TIMESTAMP/* ./
```

3. **Restart services**:
```bash
pm2 restart all
```

## 📋 Update Automation

### Cron Job Setup

Add to crontab for automatic updates:
```bash
# Update every night at 2 AM
0 2 * * * cd /var/www/site1 && ./scripts/update-safe.sh >> logs/update.log 2>&1
0 2 * * * cd /var/www/site2 && ./scripts/update-safe.sh >> logs/update.log 2>&1
```

### Webhook Updates

For immediate updates via webhook:
```bash
# Create webhook endpoint that calls:
cd /path/to/instance && ./scripts/update-safe.sh
pm2 restart instance-name
```

## ✅ Verification

After each update, verify:
1. Application starts without errors
2. Database migrations completed
3. User uploads are accessible
4. Store settings preserved
5. User accounts intact

## 🆘 Support

If updates fail:
1. Check logs in `logs/update.log`
2. Verify database connectivity
3. Ensure file permissions are correct
4. Check PM2 process status: `pm2 status`
5. Restore from backup if needed