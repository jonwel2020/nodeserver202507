/**
 * PM2生产环境配置文件
 * 企业级部署和进程管理配置
 */

module.exports = {
  apps: [
    {
      // 应用基本信息
      name: 'express-api-framework',
      script: 'server.js',
      cwd: './',
      
      // 运行时配置
      instances: 'max', // 使用所有CPU核心
      exec_mode: 'cluster',
      
      // 环境配置
      env: {
        NODE_ENV: 'development',
        PORT: 3000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      env_staging: {
        NODE_ENV: 'staging',
        PORT: 3001
      },
      
      // 内存和CPU配置
      max_memory_restart: '500M',
      max_restarts: 10,
      min_uptime: '10s',
      
      // 日志配置
      log_file: './logs/pm2-combined.log',
      out_file: './logs/pm2-out.log',
      error_file: './logs/pm2-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      log_type: 'json',
      
      // 监控配置
      watch: false, // 生产环境不建议开启
      ignore_watch: [
        'node_modules',
        'logs',
        'uploads',
        'temp',
        '.git'
      ],
      
      // 健康检查
      health_check_grace_period: 3000,
      
      // 自动重启配置
      autorestart: true,
      
      // 优雅关闭
      kill_timeout: 5000,
      listen_timeout: 3000,
      
      // 源码映射
      source_map_support: true,
      
      // 进程标题
      instance_var: 'INSTANCE_ID',
      
      // 额外的环境变量
      env_file: '.env'
    }
  ],
  
  // 部署配置
  deploy: {
    production: {
      user: 'deploy',
      host: ['your-server.com'],
      ref: 'origin/main',
      repo: 'git@github.com:your-org/express-api-framework.git',
      path: '/var/www/express-api-framework',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && npm run build:prod && pm2 reload ecosystem.config.js --env production',
      'pre-setup': '',
      'ssh_options': 'StrictHostKeyChecking=no'
    },
    
    staging: {
      user: 'deploy',
      host: ['staging-server.com'],
      ref: 'origin/develop',
      repo: 'git@github.com:your-org/express-api-framework.git',
      path: '/var/www/express-api-framework-staging',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env staging',
      'ssh_options': 'StrictHostKeyChecking=no'
    }
  }
}; 