module.exports = {
  apps: [{
    name: 'archive-management',
    script: 'server.js',
    cwd: __dirname,
    instances: 1,
    exec_mode: 'fork',
    
    // 环境配置
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      HOSTNAME: '0.0.0.0'
    },
    
    // 生产环境配置
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000,
      HOSTNAME: '0.0.0.0'
    },
    
    // 内存限制和重启策略
    max_memory_restart: '1G',
    min_uptime: '10s',
    max_restarts: 10,
    
    // 日志配置
    log_file: './logs/combined.log',
    out_file: './logs/out.log',
    error_file: './logs/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    
    // 日志轮转
    log_type: 'json',
    
    // 监控配置
    monitoring: false,
    
    // 自动重启
    watch: false,
    ignore_watch: [
      'node_modules',
      'logs',
      'data',
      '.next'
    ],
    
    // 进程管理
    kill_timeout: 5000,
    restart_delay: 4000,
    
    // 其他配置
    merge_logs: false,
    autorestart: true
  }]
};