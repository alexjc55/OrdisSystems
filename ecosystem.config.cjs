module.exports = {
  apps: [
    {
      name: 'edahouse',
      script: './dist/index.js',
      instances: 1,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        DATABASE_URL: 'postgresql://edahouse_ord:33V0R1N5qi81paiA@localhost:5432/edahouse_ord',
        SESSION_SECRET: 'WAVl58TU5MAzQkQa6w8YTsuFYyyCwIl24D2j5BNsX4reNv1iYPdNQHtog2Y0CYQ39U1HGYYG1cNQhLIGfxPVNg==',
        ENABLE_REGISTRATION: 'true',
        ENABLE_GUEST_ORDERS: 'true',
        MAX_FILE_SIZE: '5242880',
        UPLOAD_PATH: './uploads',
        ALLOWED_ORIGINS: 'https://edahouse.ordis.co.il',
        STORE_NAME: 'edahouse',
        STORE_DESCRIPTION: 'Food delivery service'
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
        DATABASE_URL: 'postgresql://edahouse_ord:33V0R1N5qi81paiA@localhost:5432/edahouse_ord',
        SESSION_SECRET: 'WAVl58TU5MAzQkQa6w8YTsuFYyyCwIl24D2j5BNsX4reNv1iYPdNQHtog2Y0CYQ39U1HGYYG1cNQhLIGfxPVNg==',
        ENABLE_REGISTRATION: 'true',
        ENABLE_GUEST_ORDERS: 'true',
        MAX_FILE_SIZE: '5242880',
        UPLOAD_PATH: './uploads',
        ALLOWED_ORIGINS: 'https://edahouse.ordis.co.il',
        STORE_NAME: 'edahouse',
        STORE_DESCRIPTION: 'Food delivery service'
      },
      // Restart settings
      max_memory_restart: '1G',
      autorestart: true,
      watch: false,
      
      // Logging
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_file: './logs/combined.log',
      time: true,
      
      // Graceful shutdown
      kill_timeout: 5000,
      listen_timeout: 3000,
      
      // Health monitoring
      min_uptime: '10s',
      max_restarts: 10,
    }
  ],
  
  // Deployment configuration
  deploy: {
    production: {
      user: 'deployer',
      host: 'your-server-ip',
      ref: 'origin/main',
      repo: 'git@github.com:username/edahouse.git',
      path: '/var/www/edahouse',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env production',
      'pre-setup': 'git clone git@github.com:username/edahouse.git .',
    }
  }
};