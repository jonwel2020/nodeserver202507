/**
 * 通用认证中间件
 * 处理JWT令牌验证和用户身份认证
 */

const crypto = require('../utils/crypto');
const { logger } = require('../config/logger');
const { ERRORS } = require('../constants/errors');

/**
 * 通用JWT验证中间件
 * @param {Object} options - 配置选项
 * @returns {Function} Express中间件
 */
function authenticateJWT(options = {}) {
  const {
    type = 'api', // api 或 admin
    required = true, // 是否必须认证
    permissions = [], // 所需权限
    allowExpired = false // 是否允许过期Token（用于刷新场景）
  } = options;

  return async (req, res, next) => {
    try {
      // 获取Authorization头
      const authHeader = req.headers.authorization;
      
      if (!authHeader) {
        if (!required) {
          return next();
        }
        return res.unauthorized('缺少认证令牌', ERRORS.AUTH.MISSING_TOKEN.code);
      }

      // 验证Bearer格式
      const tokenMatch = authHeader.match(/^Bearer\s+(.+)$/);
      if (!tokenMatch) {
        return res.unauthorized('认证令牌格式错误', ERRORS.AUTH.INVALID_TOKEN_FORMAT.code);
      }

      const token = tokenMatch[1];

      // 验证并解析JWT
      const decoded = crypto.verifyJWT(token, type, { ignoreExpiration: allowExpired });
      
      if (!decoded) {
        return res.unauthorized('认证令牌无效', ERRORS.AUTH.INVALID_TOKEN.code);
      }

      // 检查Token是否过期（在不允许过期的情况下）
      if (!allowExpired && decoded.exp && Date.now() >= decoded.exp * 1000) {
        return res.unauthorized('认证令牌已过期', ERRORS.AUTH.TOKEN_EXPIRED.code);
      }

      // 检查Token类型是否匹配
      if (decoded.type !== type) {
        return res.forbidden('认证令牌类型不匹配', ERRORS.AUTH.WRONG_TOKEN_TYPE.code);
      }

      // 检查用户是否存在和激活（这里需要查询数据库）
      // 注意：实际实现时需要注入UserRepository
      const user = await getUserById(decoded.userId);
      if (!user) {
        return res.unauthorized('用户不存在', ERRORS.USER.NOT_FOUND.code);
      }

      if (!user.isActive()) {
        return res.forbidden('用户账户已被停用', ERRORS.USER.ACCOUNT_DISABLED.code);
      }

      // 检查账户是否被锁定
      if (user.isLocked()) {
        return res.forbidden('用户账户已被锁定', ERRORS.USER.ACCOUNT_LOCKED.code);
      }

      // 权限检查
      if (permissions.length > 0) {
        const userPermissions = decoded.permissions || [];
        const hasPermission = permissions.some(permission => 
          userPermissions.includes(permission)
        );
        
        if (!hasPermission) {
          logger.warn('权限不足', {
            userId: decoded.userId,
            requiredPermissions: permissions,
            userPermissions,
            path: req.path,
            method: req.method,
            ip: req.ip
          });
          
          return res.forbidden('权限不足', ERRORS.AUTH.INSUFFICIENT_PERMISSIONS.code);
        }
      }

      // 将用户信息添加到请求对象
      req.user = user;
      req.token = {
        raw: token,
        payload: decoded,
        type: type
      };

      // 记录认证成功日志
      logger.info('用户认证成功', {
        userId: decoded.userId,
        username: user.username,
        type: type,
        path: req.path,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      next();
    } catch (error) {
      // JWT验证错误处理
      if (error.name === 'JsonWebTokenError') {
        return res.unauthorized('认证令牌无效', ERRORS.AUTH.INVALID_TOKEN.code);
      } else if (error.name === 'TokenExpiredError') {
        return res.unauthorized('认证令牌已过期', ERRORS.AUTH.TOKEN_EXPIRED.code);
      } else if (error.name === 'NotBeforeError') {
        return res.unauthorized('认证令牌尚未生效', ERRORS.AUTH.TOKEN_NOT_ACTIVE.code);
      }

      logger.error('认证中间件错误', {
        error: error.message,
        stack: error.stack,
        path: req.path,
        method: req.method,
        ip: req.ip
      });

      return res.internalServerError('认证服务异常');
    }
  };
}

/**
 * 可选认证中间件
 * 如果有Token则验证，没有Token也继续执行
 */
function optionalAuth(type = 'api') {
  return authenticateJWT({ type, required: false });
}

/**
 * 权限检查中间件
 * @param {Array|string} permissions - 所需权限
 * @returns {Function} Express中间件
 */
function requirePermissions(permissions) {
  const permArray = Array.isArray(permissions) ? permissions : [permissions];
  
  return (req, res, next) => {
    if (!req.user) {
      return res.unauthorized('需要登录后访问');
    }

    if (!req.token || !req.token.payload) {
      return res.unauthorized('认证信息无效');
    }

    const userPermissions = req.token.payload.permissions || [];
    const hasPermission = permArray.some(permission => 
      userPermissions.includes(permission)
    );

    if (!hasPermission) {
      logger.warn('权限检查失败', {
        userId: req.user.id,
        requiredPermissions: permArray,
        userPermissions,
        path: req.path,
        method: req.method,
        ip: req.ip
      });
      
      return res.forbidden('权限不足', ERRORS.AUTH.INSUFFICIENT_PERMISSIONS.code);
    }

    next();
  };
}

/**
 * 资源所有权检查中间件
 * @param {string} paramName - 参数名称（默认为'id'）
 * @param {string} userField - 用户字段名称（默认为'user_id'）
 * @returns {Function} Express中间件
 */
function requireOwnership(paramName = 'id', userField = 'user_id') {
  return async (req, res, next) => {
    if (!req.user) {
      return res.unauthorized('需要登录后访问');
    }

    try {
      const resourceId = req.params[paramName];
      if (!resourceId) {
        return res.badRequest('缺少资源ID');
      }

      // 这里需要根据具体的资源类型查询数据库
      // 注意：实际实现时需要注入相应的Repository
      const resource = await getResourceById(resourceId);
      
      if (!resource) {
        return res.notFound('资源不存在');
      }

      // 检查资源所有权
      if (resource[userField] !== req.user.id) {
        logger.warn('资源所有权检查失败', {
          userId: req.user.id,
          resourceId,
          resourceOwnerId: resource[userField],
          path: req.path,
          method: req.method,
          ip: req.ip
        });
        
        return res.forbidden('无权访问此资源');
      }

      // 将资源添加到请求对象
      req.resource = resource;
      next();
    } catch (error) {
      logger.error('所有权检查错误', {
        error: error.message,
        userId: req.user ? req.user.id : null,
        path: req.path,
        method: req.method,
        ip: req.ip
      });
      
      return res.internalServerError('权限检查异常');
    }
  };
}

/**
 * 角色检查中间件
 * @param {Array|string} roles - 允许的角色列表
 * @returns {Function} Express中间件
 */
function requireRoles(roles) {
  const roleArray = Array.isArray(roles) ? roles : [roles];
  
  return (req, res, next) => {
    if (!req.user) {
      return res.unauthorized('需要登录后访问');
    }

    if (!req.token || !req.token.payload) {
      return res.unauthorized('认证信息无效');
    }

    const userRole = req.token.payload.role;
    if (!userRole || !roleArray.includes(userRole.code)) {
      logger.warn('角色检查失败', {
        userId: req.user.id,
        userRole: userRole ? userRole.code : null,
        requiredRoles: roleArray,
        path: req.path,
        method: req.method,
        ip: req.ip
      });
      
      return res.forbidden('角色权限不足');
    }

    next();
  };
}

/**
 * IP白名单检查中间件
 * @param {Array} allowedIPs - 允许的IP列表
 * @returns {Function} Express中间件
 */
function requireIPWhitelist(allowedIPs) {
  return (req, res, next) => {
    const clientIP = req.ip || req.connection.remoteAddress;
    
    if (!allowedIPs.includes(clientIP)) {
      logger.warn('IP白名单检查失败', {
        clientIP,
        allowedIPs,
        userId: req.user ? req.user.id : null,
        path: req.path,
        method: req.method
      });
      
      return res.forbidden('IP地址未授权');
    }

    next();
  };
}

/**
 * 多因素认证检查中间件
 * @returns {Function} Express中间件
 */
function requireMFA() {
  return (req, res, next) => {
    if (!req.user) {
      return res.unauthorized('需要登录后访问');
    }

    if (!req.token || !req.token.payload) {
      return res.unauthorized('认证信息无效');
    }

    // 检查是否已完成多因素认证
    if (!req.token.payload.mfaVerified) {
      return res.forbidden('需要完成多因素认证', ERRORS.AUTH.MFA_REQUIRED.code);
    }

    next();
  };
}

/**
 * 会话检查中间件
 * 检查用户会话是否有效
 */
function requireActiveSession() {
  return async (req, res, next) => {
    if (!req.user || !req.token) {
      return res.unauthorized('需要登录后访问');
    }

    try {
      // 检查会话是否在Redis中存在
      const sessionKey = `session:${req.user.id}:${req.token.payload.jti}`;
      const session = await getSession(sessionKey);
      
      if (!session) {
        return res.unauthorized('会话已失效，请重新登录');
      }

      // 更新会话最后活动时间
      await updateSessionActivity(sessionKey);
      
      next();
    } catch (error) {
      logger.error('会话检查错误', {
        error: error.message,
        userId: req.user.id,
        path: req.path,
        method: req.method,
        ip: req.ip
      });
      
      return res.internalServerError('会话验证异常');
    }
  };
}

/**
 * 获取用户信息（需要在实际项目中注入UserRepository）
 * @param {number} userId - 用户ID
 * @returns {Promise<Object>} 用户对象
 */
async function getUserById(userId) {
  // 这里应该注入UserRepository并查询数据库
  // 临时返回模拟数据，实际实现时需要替换
  throw new Error('getUserById方法需要在实际项目中实现');
}

/**
 * 获取资源信息（需要在实际项目中实现）
 * @param {number} resourceId - 资源ID
 * @returns {Promise<Object>} 资源对象
 */
async function getResourceById(resourceId) {
  // 这里应该根据具体的资源类型查询数据库
  // 临时返回模拟数据，实际实现时需要替换
  throw new Error('getResourceById方法需要在实际项目中实现');
}

/**
 * 获取会话信息（需要注入Redis客户端）
 * @param {string} sessionKey - 会话键
 * @returns {Promise<Object>} 会话信息
 */
async function getSession(sessionKey) {
  // 这里应该从Redis获取会话信息
  // 临时返回模拟数据，实际实现时需要替换
  throw new Error('getSession方法需要在实际项目中实现');
}

/**
 * 更新会话活动时间（需要注入Redis客户端）
 * @param {string} sessionKey - 会话键
 * @returns {Promise<void>}
 */
async function updateSessionActivity(sessionKey) {
  // 这里应该更新Redis中的会话活动时间
  // 实际实现时需要替换
  throw new Error('updateSessionActivity方法需要在实际项目中实现');
}

module.exports = {
  authenticateJWT,
  optionalAuth,
  requirePermissions,
  requireOwnership,
  requireRoles,
  requireIPWhitelist,
  requireMFA,
  requireActiveSession
}; 