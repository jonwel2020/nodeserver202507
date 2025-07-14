const express = require('express');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');
require('dotenv').config();

// 导入配置
const { logger } = require('./config/logger');
const { testDatabaseConnection } = require('./config/database');
const { testRedisConnection } = require('./config/redis');

// 导入中间件
const { apiCors, adminCors, securityHeaders } = require('./middleware/cors');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { requestId, responseTime, userInfo, createMorganMiddleware, slowRequestMonitor, apiStats } = require('./middleware/logger');
const { apiRateLimiter, adminRateLimiter } = require('./middleware/rateLimiter');

// 导入路由
const routes = require('./routes');

/**
 * 创建Express应用实例
 */
const createApp = async () => {
  const app = express();
  
  // 信任代理设置（用于生产环境中的负载均衡器）
  if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
  }

  // 基础安全中间件
  app.use(helmet({
    contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false,
    crossOriginEmbedderPolicy: false
  }));

  // 响应压缩
  app.use(compression({
    level: 6,
    threshold: 1024, // 仅压缩大于1KB的响应
    filter: (req, res) => {
      // 如果请求包含 'x-no-compression' 头，则不压缩
      if (req.headers['x-no-compression']) {
        return false;
      }
      // 默认压缩所有可压缩的响应
      return compression.filter(req, res);
    }
  }));

  // 解析JSON和URL编码的请求体
  app.use(express.json({ 
    limit: '10mb',
    verify: (req, res, buf) => {
      // 保存原始请求体用于webhook验证等场景
      req.rawBody = buf;
    }
  }));
  
  app.use(express.urlencoded({ 
    extended: true, 
    limit: '10mb' 
  }));

  // 静态文件服务
  app.use('/uploads', express.static(path.join(__dirname, '../uploads'), {
    maxAge: '1d', // 缓存1天
    etag: true,
    lastModified: true
  }));

  // 请求追踪中间件
  app.use(requestId);
  app.use(responseTime);
  app.use(userInfo);

  // HTTP请求日志
  app.use(createMorganMiddleware());

  // 慢请求监控（超过1秒的请求）
  app.use(slowRequestMonitor(1000));

  // API访问统计
  app.use(apiStats);

  // 安全头设置
  app.use(securityHeaders);

  // 健康检查端点（在CORS和认证之前）
  app.get('/health', (req, res) => {
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.env.npm_package_version || '1.0.0'
    });
  });

  // 系统信息端点（开发环境）
  if (process.env.NODE_ENV !== 'production') {
    app.get('/info', (req, res) => {
      res.json({
        node_version: process.version,
        platform: process.platform,
        arch: process.arch,
        env: process.env.NODE_ENV,
        pid: process.pid,
        cwd: process.cwd(),
        memory: process.memoryUsage(),
        uptime: process.uptime()
      });
    });
  }

  // API路由配置（小程序端）
  app.use('/api', [
    apiCors,
    apiRateLimiter,
    routes.api
  ]);

  // 管理端路由配置
  app.use('/admin', [
    adminCors,
    adminRateLimiter,
    routes.admin
  ]);

  // 根路径重定向
  app.get('/', (req, res) => {
    res.json({
      name: 'Express API Framework',
      version: process.env.npm_package_version || '1.0.0',
      description: '企业级Node.js后端API框架',
      environment: process.env.NODE_ENV || 'development',
      endpoints: {
        api: '/api',
        admin: '/admin',
        health: '/health',
        docs: process.env.NODE_ENV !== 'production' ? '/docs' : undefined
      },
      timestamp: new Date().toISOString()
    });
  });

  // API文档（非生产环境）
  if (process.env.NODE_ENV !== 'production') {
    app.get('/docs', (req, res) => {
      res.json({
        message: 'API文档',
        endpoints: {
          'GET /health': '健康检查',
          'GET /info': '系统信息',
          'API端点': {
            'POST /api/auth/register': '用户注册',
            'POST /api/auth/login': '用户登录',
            'GET /api/users/profile': '获取个人信息',
            '...': '更多API请参考routes目录'
          },
          '管理端点': {
            'POST /admin/auth/login': '管理员登录',
            'GET /admin/users': '获取用户列表',
            'POST /admin/users': '创建用户',
            '...': '更多API请参考routes目录'
          }
        }
      });
    });
  }

  // 404处理（必须在所有路由之后）
  app.use(notFoundHandler);

  // 全局错误处理（必须在最后）
  app.use(errorHandler);

  return app;
};

/**
 * 应用初始化函数
 */
const initializeApp = async () => {
  try {
    logger.info('开始初始化应用...');

    // 测试数据库连接
    logger.info('测试数据库连接...');
    await testDatabaseConnection();
    logger.info('数据库连接成功');

    // 测试Redis连接
    logger.info('测试Redis连接...');
    await testRedisConnection();
    logger.info('Redis连接成功');

    // 创建Express应用
    const app = await createApp();
    logger.info('Express应用创建成功');

    return app;
  } catch (error) {
    logger.error('应用初始化失败', error);
    throw error;
  }
};

/**
 * 优雅关闭处理
 */
const gracefulShutdown = (server) => {
  return async (signal) => {
    logger.info(`收到 ${signal} 信号，开始优雅关闭...`);

    // 停止接受新连接
    server.close(async () => {
      logger.info('HTTP服务器已关闭');

      try {
        // 关闭数据库连接
        const { closeDatabaseConnection } = require('./config/database');
        await closeDatabaseConnection();
        logger.info('数据库连接已关闭');

        // 关闭Redis连接
        const { closeRedisConnection } = require('./config/redis');
        await closeRedisConnection();
        logger.info('Redis连接已关闭');

        logger.info('应用优雅关闭完成');
        process.exit(0);
      } catch (error) {
        logger.error('优雅关闭过程中发生错误', error);
        process.exit(1);
      }
    });

    // 强制关闭超时
    setTimeout(() => {
      logger.error('优雅关闭超时，强制退出');
      process.exit(1);
    }, 10000);
  };
};

module.exports = {
  createApp,
  initializeApp,
  gracefulShutdown
}; 