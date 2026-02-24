module.exports = {
  apps: [{
    name: 'archive-management',
    script: 'server.js',
    cwd: __dirname,
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      HOSTNAME: '0.0.0.0'
    },
    max_memory_restart: '1G',
    min_uptime: '10s',
    log_file: './logs/combined.log',
    out_file: './logs/out.log',
    error_file: './logs/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    watch: false,
    ignore_watch: ['node_modules', 'logs', 'data', '.next'],
    kill_timeout: 5000,
    restart_delay: 4000,
    autorestart: true
  }]
}
