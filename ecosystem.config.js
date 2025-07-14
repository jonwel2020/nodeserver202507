/**
 * PM2 生产环境配置文件
 * 支持集群模式、自动重启、日志管理和部署配置
 */
module.exports = {
  apps: [
    {
      // 应用名称
      name: 'express-api',
      
      // 启动脚本
      script: './server.js',
      
      // 集群模式配置
      instances: 'max', // 使用所有CPU核心
      exec_mode: 'cluster',
      
      // 开发环境配置
      env: {
        NODE_ENV: 'development',
        PORT: 3000,
        DB_HOST: 'localhost',
        REDIS_HOST: 'localhost'
      },
      
      // 生产环境配置
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
        
        // 数据库配置
        DB_HOST: process.env.DB_HOST || 'localhost',
        DB_PORT: process.env.DB_PORT || 3306,
        DB_NAME: process.env.DB_NAME || 'express_api_db',
        DB_USER: process.env.DB_USER || 'api_user',
        DB_PASSWORD: process.env.DB_PASSWORD,
        
        // Redis配置
        REDIS_HOST: process.env.REDIS_HOST || 'localhost',
        REDIS_PORT: process.env.REDIS_PORT || 6379,
        REDIS_PASSWORD: process.env.REDIS_PASSWORD,
        
        // JWT配置
        JWT_SECRET: process.env.JWT_SECRET,
        JWT_EXPIRES_IN: '24h',
        JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
        JWT_REFRESH_EXPIRES_IN: '7d',
        
        // 管理端JWT配置
        ADMIN_JWT_SECRET: process.env.ADMIN_JWT_SECRET,
        ADMIN_JWT_EXPIRES_IN: '2h',
        ADMIN_ALLOWED_IPS: process.env.ADMIN_ALLOWED_IPS || '127.0.0.1,::1',
        
        // 邮件配置
        SMTP_HOST: process.env.SMTP_HOST,
        SMTP_PORT: process.env.SMTP_PORT || 587,
        SMTP_USER: process.env.SMTP_USER,
        SMTP_PASS: process.env.SMTP_PASS,
        
        // 文件上传配置
        UPLOAD_PATH: './uploads',
        MAX_FILE_SIZE: 5242880,
        ALLOWED_FILE_TYPES: 'jpg,jpeg,png,gif,pdf,doc,docx',
        
        // 日志配置
        LOG_LEVEL: 'info',
        LOG_FILE: './logs/app.log',
        LOG_MAX_SIZE: '10m',
        LOG_MAX_FILES: 5,
        
        // 限流配置
        RATE_LIMIT_WINDOW: 15,
        RATE_LIMIT_MAX_REQUESTS: 100
      },
      
      // 测试环境配置
      env_testing: {
        NODE_ENV: 'testing',
        PORT: 3001,
        DB_NAME: 'express_api_test_db',
        REDIS_DB: 1,
        LOG_LEVEL: 'error'
      },
      
      // 日志配置
      log_file: './logs/pm2-combined.log',
      out_file: './logs/pm2-out.log',
      error_file: './logs/pm2-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      
      // 进程管理配置
      min_uptime: '10s',          // 最小运行时间
      max_restarts: 10,           // 最大重启次数
      autorestart: true,          // 自动重启
      restart_delay: 4000,        // 重启延迟
      
      // 监控配置
      watch: false,               // 不监听文件变化（生产环境）
      ignore_watch: [             // 忽略监听的目录
        'node_modules',
        'logs',
        'uploads',
        'coverage',
        '.git'
      ],
      
      // 性能配置
      max_memory_restart: '500M', // 内存限制
      node_args: [                // Node.js启动参数
        '--max-old-space-size=512',
        '--optimize-for-size'
      ],
      
      // 其他配置
      source_map_support: true,   // 支持source map
      merge_logs: true,           // 合并日志
      time: true,                 // 显示时间戳
      kill_timeout: 5000,         // 强制终止超时时间
      listen_timeout: 8000,       // 监听超时时间
      
      // 健康检查
      health_check_grace_period: 3000,
      
      // 环境变量增强
      env_file: '.env'
    }
  ],

  // 部署配置
  deploy: {
    // 生产环境部署
    production: {
      user: 'deploy',
      host: ['your-production-server.com'],
      ref: 'origin/main',
      repo: 'git@github.com:yourusername/express-api-framework.git',
      path: '/var/www/express-api',
      
      // 部署前本地执行的命令
      'pre-deploy-local': '',
      
      // 部署后执行的命令
      'post-deploy': [
        'npm install --production',
        'npm run db:migrate',
        'pm2 reload ecosystem.config.js --env production',
        'pm2 save'
      ].join(' && '),
      
      // 设置前执行的命令
      'pre-setup': '',
      
      // SSH配置
      'ssh_options': 'ForwardAgent=yes',
      
      // 环境变量
      env: {
        NODE_ENV: 'production'
      }
    },
    
    // 预发布环境部署
    staging: {
      user: 'deploy',
      host: ['your-staging-server.com'],
      ref: 'origin/develop',
      repo: 'git@github.com:yourusername/express-api-framework.git',
      path: '/var/www/express-api-staging',
      
      'post-deploy': [
        'npm install',
        'npm run test',
        'npm run db:migrate',
        'pm2 reload ecosystem.config.js --env staging',
        'pm2 save'
      ].join(' && '),
      
      'ssh_options': 'ForwardAgent=yes',
      
      env: {
        NODE_ENV: 'staging'
      }
    }
  }
}; 