module.exports = {
  apps: [
    {
      name: 'gynecrm-api',
      script: 'src/server.js',
      instances: 1,
      exec_mode: 'fork',
      env_production: {
        NODE_ENV: 'production',
        PORT: 8082,
      },
      max_memory_restart: '500M',
      autorestart: true,
      watch: false,
      time: true,
    },
  ],
};