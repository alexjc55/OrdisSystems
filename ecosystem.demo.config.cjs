module.exports = {
  apps: [
    {
      name: 'edahouse-demo',
      script: './dist/index.js',
      instances: 1,
      exec_mode: 'fork', // ВАЖНО: fork mode для работы NODE_ENV
      
      env_production: {
        NODE_ENV: 'production',
        PORT: 5001, // Другой порт для demo
        DATABASE_URL: 'postgresql://edahouse_ord:33V0R1N5qi81paiA@localhost:5432/edahouse_ord',
        SESSION_SECRET: 'WAVl58TU5MAzQkQa6w8YTsuFYyyCwIl24D2j5BNsX4reNv1iYPdNQHtog2Y0CYQ39U1HGYYG1cNQhLIGfxPVNg==',
        ENABLE_REGISTRATION: 'true',
        ENABLE_GUEST_ORDERS: 'true',
        MAX_FILE_SIZE: '5242880',
        UPLOAD_PATH: './uploads',
        ALLOWED_ORIGINS: 'https://demo.ordis.co.il',
        STORE_NAME: 'edahouse-demo',
        STORE_DESCRIPTION: 'Food delivery service - Demo'
      },
      
      // Restart settings
      max_memory_restart: '1G',
      autorestart: true,
      watch: false,
      
      // Logging
      error_file: './logs/demo-err.log',
      out_file: './logs/demo-out.log',
      log_file: './logs/demo-combined.log',
      time: true,
      
      // Graceful shutdown
      kill_timeout: 5000,
      listen_timeout: 3000,
      
      // Health monitoring
      min_uptime: '10s',
      max_restarts: 10,
    }
  ]
};
