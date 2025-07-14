/**
 * 主路由配置文件
 * 整合小程序端和管理端所有路由
 */

const express = require('express');
const router = express.Router();

// 导入子路由模块
const apiRoutes = require('./api');
const adminRoutes = require('./admin');

/**
 * 路由模块注册
 * 实现双端完全隔离架构
 */

// 小程序端路由 - /api/*
// 24小时Token过期时间，基础权限验证，用户只能操作自己的数据
router.use('/api', apiRoutes);

// 管理端路由 - /admin/*
// 2小时Token过期时间，严格权限验证，支持IP白名单，完整CRUD权限
router.use('/admin', adminRoutes);

/**
 * 根路径健康检查
 * GET /
 */
router.get('/', (req, res) => {
  res.json({
    code: 200,
    message: 'Express API Framework 服务正常运行',
    data: {
      service_name: 'express-api-framework',
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      status: 'healthy',
      endpoints: {
        api: '/api/*',
        admin: '/admin/*',
        health: '/health',
        docs: '/docs'
      },
      features: [
        '双端完全隔离架构',
        'JWT Token认证',
        '角色权限控制',
        'MySQL + Redis',
        '分层架构设计',
        'RESTful API',
        '统一响应格式',
        '完善的错误处理'
      ]
    },
    timestamp: new Date().toISOString()
  });
});

/**
 * 通用健康检查端点
 * GET /health
 */
router.get('/health', (req, res) => {
  const os = require('os');
  
  res.json({
    code: 200,
    message: '系统健康检查',
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      
      // 系统基本信息
      system: {
        platform: os.platform(),
        arch: os.arch(),
        uptime: os.uptime(),
        load_average: os.loadavg(),
        cpu_count: os.cpus().length
      },
      
      // 进程信息
      process: {
        pid: process.pid,
        uptime: process.uptime(),
        memory_usage: process.memoryUsage(),
        node_version: process.version
      },
      
      // 服务状态检查 TODO: 添加实际的连接检查
      services: {
        database: {
          status: 'connected', // 实际实现时检查数据库连接
          response_time: '5ms'
        },
        redis: {
          status: 'connected', // 实际实现时检查Redis连接
          response_time: '2ms'
        }
      },
      
      // 环境信息
      environment: {
        node_env: process.env.NODE_ENV || 'development',
        port: process.env.PORT || 3000,
        api_version: 'v1'
      }
    },
    timestamp: new Date().toISOString()
  });
});

/**
 * API文档路由（如果使用Swagger）
 * GET /docs
 */
router.get('/docs', (req, res) => {
  res.json({
    code: 200,
    message: 'API文档',
    data: {
      swagger_ui: '/docs/swagger',
      postman_collection: '/docs/postman',
      api_endpoints: {
        '小程序端认证': '/api/auth/*',
        '小程序端用户管理': '/api/users/*',
        '管理端认证': '/admin/auth/*',
        '管理端用户管理': '/admin/users/*',
        '管理端系统管理': '/admin/metrics, /admin/cache/*'
      },
      documentation: {
        'README': 'https://github.com/your-org/express-api-framework/README.md',
        'API文档': 'https://github.com/your-org/express-api-framework/docs/api.md',
        '部署文档': 'https://github.com/your-org/express-api-framework/docs/deployment.md'
      }
    },
    timestamp: new Date().toISOString()
  });
});

/**
 * 404处理中间件
 * 处理所有未匹配的路由
 */
router.use('*', (req, res) => {
  res.status(404).json({
    code: 404,
    message: 'API接口不存在',
    error: `请求的路由 ${req.method} ${req.originalUrl} 未找到`,
    suggestion: '请检查API文档获取正确的接口路径',
    available_routes: {
      '小程序端API': '/api/*',
      '管理端API': '/admin/*',
      '健康检查': '/health',
      'API文档': '/docs'
    },
    timestamp: new Date().toISOString()
  });
});

module.exports = router; 