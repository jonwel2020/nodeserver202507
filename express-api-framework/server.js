#!/usr/bin/env node

/**
 * Express API Framework 服务器入口文件
 * 企业级Node.js后端API框架
 */

require('dotenv').config();
const { initializeApp, gracefulShutdown } = require('./src/app');
const { logger } = require('./src/config/logger');

/**
 * 验证必要的环境变量
 */
const validateEnvironment = () => {
  const requiredEnvVars = [
    'DB_HOST',
    'DB_USER', 
    'DB_PASSWORD',
    'DB_NAME',
    'REDIS_HOST',
    'JWT_SECRET',
    'ADMIN_JWT_SECRET'
  ];

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    logger.error('缺少必要的环境变量', { missingVars });
    logger.error('请参考 .env.example 文件配置环境变量');
    process.exit(1);
  }

  // 验证端口配置
  const port = parseInt(process.env.PORT) || 3000;
  if (port < 1 || port > 65535) {
    logger.error('无效的端口号配置', { port });
    process.exit(1);
  }

  // 验证JWT密钥强度
  if (process.env.JWT_SECRET.length < 32) {
    logger.warn('JWT密钥长度过短，建议使用32位以上的强密钥');
  }

  if (process.env.ADMIN_JWT_SECRET.length < 32) {
    logger.warn('管理端JWT密钥长度过短，建议使用32位以上的强密钥');
  }

  logger.info('环境变量验证通过');
};

/**
 * 获取本地IP地址
 */
const getLocalIPAddress = () => {
  const interfaces = require('os').networkInterfaces();
  
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // 跳过内部和非IPv4地址
      if ('IPv4' !== iface.family || iface.internal !== false) {
        continue;
      }
      return iface.address;
    }
  }
  
  return 'localhost';
};

/**
 * 启动服务器
 */
const startServer = async () => {
  try {
    // 验证环境变量
    validateEnvironment();

    // 初始化应用
    const app = await initializeApp();
    
    // 获取端口配置
    const port = parseInt(process.env.PORT) || 3000;
    const host = process.env.HOST || '0.0.0.0';
    
    // 启动HTTP服务器
    const server = app.listen(port, host, () => {
      const localIP = getLocalIPAddress();
      const env = process.env.NODE_ENV || 'development';
      
      logger.info('🚀 服务器启动成功!', {
        port,
        host,
        environment: env,
        pid: process.pid,
        node_version: process.version,
        timestamp: new Date().toISOString()
      });

      // 显示访问地址
      console.log('\n' + '='.repeat(60));
      console.log('🎉 Express API Framework 启动成功!');
      console.log('='.repeat(60));
      console.log(`🌍 环境: ${env}`);
      console.log(`🔗 本地访问: http://localhost:${port}`);
      if (localIP !== 'localhost') {
        console.log(`🔗 网络访问: http://${localIP}:${port}`);
      }
      console.log(`📋 健康检查: http://localhost:${port}/health`);
      if (env !== 'production') {
        console.log(`📚 API文档: http://localhost:${port}/docs`);
        console.log(`📊 系统信息: http://localhost:${port}/info`);
      }
      console.log(`📁 小程序API: http://localhost:${port}/api`);
      console.log(`🏛️  管理端API: http://localhost:${port}/admin`);
      console.log('='.repeat(60));
      console.log('✨ 按 Ctrl+C 优雅关闭服务器');
      console.log('='.repeat(60) + '\n');
    });

    // 设置服务器超时
    server.timeout = 30000; // 30秒超时
    server.keepAliveTimeout = 65000; // 保持连接65秒
    server.headersTimeout = 66000; // 头部超时66秒

    // 注册优雅关闭处理
    const shutdown = gracefulShutdown(server);
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
    process.on('SIGUSR2', shutdown); // PM2热重载

    // 处理未捕获的异常
    process.on('uncaughtException', (error) => {
      logger.error('未捕获的异常', {
        error: error.message,
        stack: error.stack,
        pid: process.pid
      });
      
      // 优雅关闭
      shutdown('uncaughtException');
    });

    // 处理未处理的Promise拒绝
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('未处理的Promise拒绝', {
        reason: reason?.message || reason,
        stack: reason?.stack,
        promise: promise.toString(),
        pid: process.pid
      });
      
      // 优雅关闭
      shutdown('unhandledRejection');
    });

    // 监听内存使用情况
    if (process.env.NODE_ENV !== 'production') {
      setInterval(() => {
        const memUsage = process.memoryUsage();
        const memInMB = {
          rss: Math.round(memUsage.rss / 1024 / 1024),
          heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
          heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
          external: Math.round(memUsage.external / 1024 / 1024)
        };
        
        // 如果内存使用超过500MB，发出警告
        if (memInMB.rss > 500) {
          logger.warn('内存使用过高', {
            memory: memInMB,
            uptime: Math.round(process.uptime())
          });
        }
      }, 60000); // 每分钟检查一次
    }

    return server;

  } catch (error) {
    logger.error('服务器启动失败', {
      error: error.message,
      stack: error.stack
    });
    process.exit(1);
  }
};

// 启动服务器
if (require.main === module) {
  startServer().catch((error) => {
    logger.error('启动过程中发生致命错误', error);
    process.exit(1);
  });
}

module.exports = { startServer }; 