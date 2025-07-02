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
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
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