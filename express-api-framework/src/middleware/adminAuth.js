/**
 * 管理端认证中间件
 * 支持IP白名单验证、操作日志记录、严格权限控制
 */

const jwt = require('jsonwebtoken');
const { logger } = require('../config/logger');
const { redis } = require('../config/redis');
const { getUserById } = require('../repositories/users/UserRepository');
const { ROLE_PERMISSIONS } = require('../constants/roles');

/**
 * 获取客户端IP地址
 * @param {Object} req - Express请求对象
 * @returns {string} IP地址
 */
function getClientIP(req) {
  return req.headers['x-forwarded-for'] ||
         req.headers['x-real-ip'] ||
         req.connection.remoteAddress ||
         req.socket.remoteAddress ||
         (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
         '0.0.0.0';
}

/**
 * 检查IP白名单
 * @param {string} ip - 客户端IP
 * @returns {boolean} 是否在白名单中
 */
function checkIPWhitelist(ip) {
  const allowedIPs = process.env.ADMIN_ALLOWED_IPS?.split(',') || ['127.0.0.1', '::1'];
  
  // 如果没有配置白名单，默认允许所有IP（仅在开发环境）
  if (process.env.NODE_ENV === 'development' && !process.env.ADMIN_ALLOWED_IPS) {
    return true;
  }
  
  return allowedIPs.some(allowedIP => {
    const trimmedIP = allowedIP.trim();
    if (trimmedIP.includes('/')) {
      // CIDR格式支持 TODO: 添加CIDR匹配逻辑
      return ip === trimmedIP.split('/')[0];
    }
    return ip === trimmedIP || ip.endsWith(trimmedIP);
  });
}

/**
 * 记录管理员操作日志
 * @param {Object} adminInfo - 管理员信息
 * @param {Object} req - Express请求对象
 * @param {string} action - 操作类型
 */
async function logAdminOperation(adminInfo, req, action = 'access') {
  try {
    const logData = {
      admin_id: adminInfo.id,
      username: adminInfo.username,
      action: action,
      method: req.method,
      path: req.path,
      url: req.originalUrl,
      ip: getClientIP(req),
      user_agent: req.get('User-Agent'),
      timestamp: new Date().toISOString(),
      request_id: req.requestId || 'unknown'
    };

    // 记录到日志文件
    logger.info('管理员操作', {
      type: 'admin_operation',
      ...logData
    });

    // 存储到Redis用于实时监控（保留24小时）
    const redisKey = `admin_operations:${adminInfo.id}:${Date.now()}`;
    await redis.setex(redisKey, 86400, JSON.stringify(logData));

    // 维护管理员最近操作列表（最多保留100条）
    const recentOpsKey = `admin_recent_ops:${adminInfo.id}`;
    await redis.lpush(recentOpsKey, JSON.stringify(logData));
    await redis.ltrim(recentOpsKey, 0, 99);
    await redis.expire(recentOpsKey, 86400);

  } catch (error) {
    logger.error('记录管理员操作日志失败', { error: error.message, admin_id: adminInfo.id });
  }
}

/**
 * 检查管理员权限
 * @param {Object} admin - 管理员信息
 * @param {string} permission - 需要的权限
 * @returns {boolean} 是否有权限
 */
function checkAdminPermission(admin, permission) {
  if (!admin || !admin.role) {
    return false;
  }

  // 超级管理员拥有所有权限
  if (admin.role.name === 'super_admin') {
    return true;
  }

  // 检查角色权限
  const rolePermissions = ROLE_PERMISSIONS[admin.role.name] || [];
  return rolePermissions.includes(permission) || rolePermissions.includes('*');
}

/**
 * 管理端认证中间件
 * @param {string|Array} requiredPermission - 可选的权限检查
 */
function adminAuth(requiredPermission = null) {
  return async (req, res, next) => {
    try {
      const clientIP = getClientIP(req);
      
      // 1. IP白名单检查
      if (!checkIPWhitelist(clientIP)) {
        logger.warn('管理端IP白名单验证失败', {
          ip: clientIP,
          path: req.path,
          user_agent: req.get('User-Agent')
        });
        
        return res.status(403).json({
          code: 403,
          message: 'IP地址不在白名单中，拒绝访问',
          error: 'IP_NOT_ALLOWED',
          timestamp: new Date().toISOString()
        });
      }

      // 2. 提取Token
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          code: 401,
          message: '缺少认证Token',
          error: 'MISSING_TOKEN',
          timestamp: new Date().toISOString()
        });
      }

      const token = authHeader.substring(7);

      // 3. 验证Token
      let decoded;
      try {
        decoded = jwt.verify(token, process.env.ADMIN_JWT_SECRET);
      } catch (jwtError) {
        logger.warn('管理端JWT验证失败', {
          error: jwtError.message,
          ip: clientIP,
          token: token.substring(0, 20) + '...'
        });
        
        return res.status(401).json({
          code: 401,
          message: 'Token无效或已过期',
          error: 'INVALID_TOKEN',
          timestamp: new Date().toISOString()
        });
      }

      // 4. 检查Token黑名单（Redis）
      const tokenBlacklist = await redis.get(`admin_blacklist:${token}`);
      if (tokenBlacklist) {
        return res.status(401).json({
          code: 401,
          message: 'Token已被注销',
          error: 'TOKEN_REVOKED',
          timestamp: new Date().toISOString()
        });
      }

      // 5. 获取管理员信息
      const admin = await getUserById(decoded.userId);
      if (!admin) {
        return res.status(401).json({
          code: 401,
          message: '管理员账户不存在',
          error: 'ADMIN_NOT_FOUND',
          timestamp: new Date().toISOString()
        });
      }

      // 6. 检查管理员状态
      if (admin.status !== 'active') {
        logger.warn('管理员账户状态异常', {
          admin_id: admin.id,
          status: admin.status,
          ip: clientIP
        });
        
        return res.status(403).json({
          code: 403,
          message: '管理员账户已被禁用',
          error: 'ADMIN_ACCOUNT_DISABLED',
          timestamp: new Date().toISOString()
        });
      }

      // 7. 检查角色权限
      if (!admin.role || admin.role.status !== 'active') {
        return res.status(403).json({
          code: 403,
          message: '管理员角色无效',
          error: 'INVALID_ROLE',
          timestamp: new Date().toISOString()
        });
      }

      // 8. 特定权限检查
      if (requiredPermission) {
        const permissions = Array.isArray(requiredPermission) ? requiredPermission : [requiredPermission];
        const hasPermission = permissions.some(permission => checkAdminPermission(admin, permission));
        
        if (!hasPermission) {
          logger.warn('管理员权限不足', {
            admin_id: admin.id,
            required_permission: requiredPermission,
            admin_role: admin.role.name,
            path: req.path
          });
          
          return res.status(403).json({
            code: 403,
            message: '权限不足，无法执行此操作',
            error: 'INSUFFICIENT_PERMISSION',
            required_permission: requiredPermission,
            timestamp: new Date().toISOString()
          });
        }
      }

      // 9. 更新最后活动时间（Redis缓存）
      const lastActivityKey = `admin_last_activity:${admin.id}`;
      await redis.setex(lastActivityKey, 3600, new Date().toISOString());

      // 10. 记录操作日志
      await logAdminOperation(admin, req, 'api_access');

      // 11. 设置请求上下文
      req.admin = admin;
      req.adminToken = token;
      req.adminIP = clientIP;
      req.adminPermissions = ROLE_PERMISSIONS[admin.role.name] || [];

      // 12. 设置响应头
      res.set('X-Admin-ID', admin.id.toString());
      res.set('X-Admin-Role', admin.role.name);

      next();

    } catch (error) {
      logger.error('管理端认证中间件错误', {
        error: error.message,
        stack: error.stack,
        ip: getClientIP(req),
        path: req.path
      });

      res.status(500).json({
        code: 500,
        message: '认证服务暂时不可用',
        error: 'AUTHENTICATION_ERROR',
        timestamp: new Date().toISOString()
      });
    }
  };
}

/**
 * 管理端权限检查中间件
 * @param {string|Array} permission - 需要的权限
 */
function requirePermission(permission) {
  return adminAuth(permission);
}

/**
 * 管理端操作日志中间件
 * 记录所有管理端操作的详细日志
 */
function adminOperationLogger() {
  return async (req, res, next) => {
    if (req.admin) {
      // 记录请求开始时间
      req.startTime = Date.now();
      
      // 拦截响应以记录结果
      const originalSend = res.send;
      res.send = function(data) {
        const responseTime = Date.now() - req.startTime;
        
        // 记录操作结果
        logAdminOperation(req.admin, req, 'operation_complete').then(() => {
          logger.info('管理员操作完成', {
            admin_id: req.admin.id,
            method: req.method,
            path: req.path,
            status_code: res.statusCode,
            response_time: responseTime,
            ip: req.adminIP
          });
        }).catch(err => {
          logger.error('记录管理员操作日志失败', { error: err.message });
        });

        originalSend.call(this, data);
      };
    }
    
    next();
  };
}

module.exports = {
  adminAuth,
  requirePermission,
  adminOperationLogger,
  checkAdminPermission,
  logAdminOperation,
  getClientIP
}; 