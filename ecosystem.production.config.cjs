module.exports = {
  apps: [{
    name: 'edahouse',
    script: 'server/index.js',
    cwd: '/var/www/edahouse.ordis.co.il',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      HOST: '0.0.0.0',
      DATABASE_URL: 'postgresql://edahouse_usr:edahouse_password@localhost:5432/edahouse',
      PGHOST: 'localhost',
      PGPORT: 5432,
      PGDATABASE: 'edahouse',
      PGUSER: 'edahouse_usr',
      PGPASSWORD: 'edahouse_password',
      SESSION_SECRET: 'WAVl58TU5MAzQkQa6w8YTsuFYyyCwIl24D2j5BNsX4reNv1iYPdNQHtog2Y0CYQ39U1HGYYG1cNQhLIGfxPVNg==',
      ENABLE_REGISTRATION: 'true',
      ENABLE_GUEST_ORDERS: 'true',
      MAX_FILE_SIZE: '5242880',
      UPLOAD_PATH: './uploads',
      ALLOWED_ORIGINS: 'https://edahouse.ordis.co.il',
      STORE_NAME: 'edahouse',
      STORE_DESCRIPTION: 'Food delivery service'
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};