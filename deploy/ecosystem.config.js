module.exports = {
  apps: [
    {
      name: 'love-letter',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3000',
      cwd: '/var/www/love-letter',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      error_file: '/var/log/love-letter/error.log',
      out_file: '/var/log/love-letter/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
  ],
};
