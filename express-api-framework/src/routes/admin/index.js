/**
 * 管理端路由聚合
 * 路径前缀: /admin
 */

const express = require('express');
const router = express.Router();

// 导入子路由
const authRoutes = require('./auth');
const userRoutes = require('./users');

/**
 * 管理端路由注册
 * 所有管理端路由都以 /admin 为前缀
 */

// 认证相关路由 - /admin/auth/*
router.use('/auth', authRoutes);

// 用户管理路由 - /admin/users/*
router.use('/users', userRoutes);

/**
 * 管理端健康检查
 * GET /admin/health
 */
router.get('/health', (req, res) => {
  res.json({
    code: 200,
    message: '管理端API服务正常',
    data: {
      status: 'healthy',
      service: 'admin',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.env.npm_package_version || '1.0.0',
      database_status: 'connected', // 这里可以添加实际的数据库状态检查
      redis_status: 'connected', // 这里可以添加实际的Redis状态检查
      cpu_usage: process.cpuUsage(),
      load_average: require('os').loadavg()
    },
    timestamp: new Date().toISOString()
  });
});

/**
 * 管理端系统指标
 * GET /admin/metrics
 */
router.get('/metrics', (req, res) => {
  const os = require('os');
  const process = require('process');
  
  res.json({
    code: 200,
    message: '获取系统指标成功',
    data: {
      // 系统信息
      system: {
        platform: os.platform(),
        arch: os.arch(),
        hostname: os.hostname(),
        uptime: os.uptime(),
        load_average: os.loadavg(),
        cpu_count: os.cpus().length,
        total_memory: os.totalmem(),
        free_memory: os.freemem(),
        used_memory: os.totalmem() - os.freemem(),
        memory_usage_percent: ((os.totalmem() - os.freemem()) / os.totalmem() * 100).toFixed(2)
      },
      
      // 进程信息
      process: {
        pid: process.pid,
        uptime: process.uptime(),
        node_version: process.version,
        memory_usage: process.memoryUsage(),
        cpu_usage: process.cpuUsage(),
        argv: process.argv,
        env: {
          NODE_ENV: process.env.NODE_ENV,
          PORT: process.env.PORT
        }
      },
      
      // 服务器负载
      load: {
        cpu_1m: os.loadavg()[0],
        cpu_5m: os.loadavg()[1],
        cpu_15m: os.loadavg()[2]
      },
      
      // 时间戳
      collected_at: new Date().toISOString()
    },
    timestamp: new Date().toISOString()
  });
});

/**
 * 清除缓存
 * POST /admin/cache/clear
 */
router.post('/cache/clear', async (req, res) => {
  try {
    // 这里需要引入实际的缓存清理逻辑
    // const { clearCache } = require('../../utils/cache');
    // await clearCache();
    
    res.json({
      code: 200,
      message: '缓存清除成功',
      data: {
        cleared_at: new Date().toISOString(),
        cache_types: ['redis', 'memory'],
        affected_keys: 0 // 实际实现时需要返回清除的键数量
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      code: 500,
      message: '缓存清除失败',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * 管理端版本信息
 * GET /admin/version
 */
router.get('/version', (req, res) => {
  res.json({
    code: 200,
    message: '获取版本信息成功',
    data: {
      version: process.env.npm_package_version || '1.0.0',
      api_version: 'v1',
      service: 'admin',
      build_time: process.env.BUILD_TIME || new Date().toISOString(),
      node_version: process.version,
      environment: process.env.NODE_ENV || 'development',
      dependencies: {
        express: require('express/package.json').version,
        mysql2: require('mysql2/package.json').version,
        redis: require('redis/package.json').version,
        jsonwebtoken: require('jsonwebtoken/package.json').version
      }
    },
    timestamp: new Date().toISOString()
  });
});

/**
 * 管理端角色权限路由 - /admin/roles/*
 * TODO: 实现角色管理功能
 */
router.get('/roles', (req, res) => {
  res.json({
    code: 200,
    message: '获取角色列表成功',
    data: {
      items: [
        { id: 1, name: 'super_admin', display_name: '超级管理员', description: '拥有所有权限' },
        { id: 2, name: 'admin', display_name: '管理员', description: '拥有大部分管理权限' },
        { id: 3, name: 'user', display_name: '普通用户', description: '基础用户权限' }
      ],
      pagination: {
        total: 3,
        total_pages: 1,
        current_page: 1,
        page_size: 20,
        has_previous: false,
        has_next: false,
        is_first_page: true,
        is_last_page: true
      }
    },
    timestamp: new Date().toISOString()
  });
});

/**
 * 管理端权限列表路由 - /admin/permissions/*
 * TODO: 实现权限管理功能
 */
router.get('/permissions', (req, res) => {
  res.json({
    code: 200,
    message: '获取权限列表成功',
    data: {
      items: [
        { id: 1, name: 'user.read', display_name: '查看用户', category: 'user' },
        { id: 2, name: 'user.create', display_name: '创建用户', category: 'user' },
        { id: 3, name: 'user.update', display_name: '更新用户', category: 'user' },
        { id: 4, name: 'user.delete', display_name: '删除用户', category: 'user' },
        { id: 5, name: 'role.manage', display_name: '角色管理', category: 'role' },
        { id: 6, name: 'system.config', display_name: '系统配置', category: 'system' }
      ],
      categories: ['user', 'role', 'system'],
      total: 6
    },
    timestamp: new Date().toISOString()
  });
});

/**
 * 404 处理 - 管理端路由未找到
 */
router.use('*', (req, res) => {
  res.status(404).json({
    code: 404,
    message: '管理端API接口不存在',
    error: `路由 ${req.originalUrl} 未找到`,
    timestamp: new Date().toISOString()
  });
});

module.exports = router; 