/**
 * 小程序端路由聚合
 * 路径前缀: /api
 */

const express = require('express');
const router = express.Router();

// 导入子路由
const authRoutes = require('./auth');
const userRoutes = require('./users');

/**
 * 小程序端路由注册
 * 所有小程序端路由都以 /api 为前缀
 */

// 认证相关路由 - /api/auth/*
router.use('/auth', authRoutes);

// 用户管理路由 - /api/users/*
router.use('/users', userRoutes);

/**
 * 小程序端健康检查
 * GET /api/health
 */
router.get('/health', (req, res) => {
  res.json({
    code: 200,
    message: '小程序端API服务正常',
    data: {
      status: 'healthy',
      service: 'api',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.env.npm_package_version || '1.0.0'
    },
    timestamp: new Date().toISOString()
  });
});

/**
 * 小程序端版本信息
 * GET /api/version
 */
router.get('/version', (req, res) => {
  res.json({
    code: 200,
    message: '获取版本信息成功',
    data: {
      version: process.env.npm_package_version || '1.0.0',
      api_version: 'v1',
      service: 'api',
      build_time: process.env.BUILD_TIME || new Date().toISOString(),
      node_version: process.version,
      environment: process.env.NODE_ENV || 'development'
    },
    timestamp: new Date().toISOString()
  });
});

/**
 * 404 处理 - 小程序端路由未找到
 */
router.use('*', (req, res) => {
  res.status(404).json({
    code: 404,
    message: '小程序端API接口不存在',
    error: `路由 ${req.originalUrl} 未找到`,
    timestamp: new Date().toISOString()
  });
});

module.exports = router; 