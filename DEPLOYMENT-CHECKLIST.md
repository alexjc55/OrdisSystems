# Production Deployment Checklist

## ✅ Pre-Deployment Setup

### Server Requirements
- [ ] Node.js 18+ installed
- [ ] PostgreSQL 13+ running
- [ ] PM2 process manager installed
- [ ] Nginx web server configured
- [ ] SSL certificates obtained

### Database Setup
- [ ] Create separate database for each instance
- [ ] Create database user with appropriate permissions
- [ ] Test database connectivity
- [ ] Set up regular database backups

### Application Setup
- [ ] Clone repository to deployment directory
- [ ] Copy `.env.example` to `.env`
- [ ] Configure environment variables
- [ ] Install dependencies: `npm install`
- [ ] Generate initial migrations: `npx drizzle-kit generate`
- [ ] Run migrations: `node scripts/run-migrations.js`
- [ ] Create uploads directory: `mkdir -p uploads`
- [ ] Set correct file permissions

## ✅ Multi-Site Configuration

### For Each Site Instance
- [ ] Unique database name/credentials
- [ ] Unique port number
- [ ] Unique session secret
- [ ] Separate uploads directory
- [ ] Individual PM2 app configuration
- [ ] Domain-specific Nginx configuration

### PM2 Configuration
```bash
# ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'site1',
      script: 'server/index.js',
      cwd: '/var/www/site1',
      env: { PORT: 3001, NODE_ENV: 'production' }
    }
  ]
}
```

### Nginx Configuration
```nginx
server {
    server_name site1.com;
    location / {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
    }
    location /uploads/ {
        alias /var/www/site1/uploads/;
    }
}
```

## ✅ Auto-Update System

### Initial Setup
- [ ] Verify git repository access
- [ ] Test update script: `./scripts/update-safe.sh`
- [ ] Configure automated backups
- [ ] Set up cron jobs for automatic updates
- [ ] Test rollback procedure

### Update Process Verification
- [ ] User data preserved during updates
- [ ] Database migrations applied safely
- [ ] Environment configuration maintained
- [ ] Uploads directory intact
- [ ] Application restarts successfully

## ✅ Security Checklist

### Environment Security
- [ ] Strong session secrets (32+ characters)
- [ ] Database passwords are secure
- [ ] File permissions set correctly (644 for files, 755 for directories)
- [ ] Uploads directory has correct permissions
- [ ] Log files are not publicly accessible

### Application Security
- [ ] Admin account created with strong password
- [ ] Default credentials changed
- [ ] HTTPS enabled for production
- [ ] CORS configured for production domains
- [ ] Rate limiting configured (if needed)

## ✅ Monitoring & Maintenance

### Health Monitoring
- [ ] PM2 monitoring dashboard
- [ ] Database connection monitoring
- [ ] Disk space monitoring
- [ ] Log rotation configured
- [ ] Error notification setup

### Backup Strategy
- [ ] Automated database backups
- [ ] File backup schedule
- [ ] Backup retention policy
- [ ] Backup restoration tested

### Performance
- [ ] Application performance baseline
- [ ] Database query optimization
- [ ] Static file caching
- [ ] Image optimization for uploads

## ✅ Post-Deployment Testing

### Functionality Tests
- [ ] User registration/login works
- [ ] Product catalog displays correctly
- [ ] Shopping cart functionality
- [ ] Order placement process
- [ ] Admin panel access and operations
- [ ] File uploads working
- [ ] Email notifications (if configured)

### Integration Tests
- [ ] WhatsApp integration functional
- [ ] Payment processing (if configured)
- [ ] Database queries performing well
- [ ] All API endpoints responding
- [ ] Static assets loading correctly

## ✅ Auto-Update Commands

### Manual Update
```bash
cd /var/www/site1
./scripts/update-safe.sh
pm2 restart site1
```

### Health Check
```bash
node scripts/health-check.js
```

### Rollback (if needed)
```bash
# Restore database
psql $DATABASE_URL < backups/migration_backup_TIMESTAMP.sql

# Restore files
cp -r backups/TIMESTAMP/* ./

# Restart application
pm2 restart site1
```

## ✅ Troubleshooting

### Common Issues
- [ ] Database connection errors → Check DATABASE_URL
- [ ] Permission denied → Check file permissions
- [ ] Port already in use → Check PM2 status and ports
- [ ] Migration failures → Check database logs
- [ ] Upload issues → Check uploads directory permissions

### Log Locations
- Application logs: `pm2 logs site1`
- Update logs: `logs/update.log`
- Database logs: System-specific location
- Nginx logs: `/var/log/nginx/`

## ✅ Final Verification

### Production Ready
- [ ] All tests passing
- [ ] Performance acceptable
- [ ] Security measures in place
- [ ] Monitoring active
- [ ] Backup system working
- [ ] Update system tested
- [ ] Documentation complete
- [ ] Team trained on procedures

### Go-Live Checklist
- [ ] DNS configured correctly
- [ ] SSL certificates active
- [ ] All domains pointing to correct instances
- [ ] User acceptance testing completed
- [ ] Support team notified
- [ ] Rollback plan ready