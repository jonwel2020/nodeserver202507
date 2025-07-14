/**
 * 小程序端认证中间件
 * 24小时Token过期，基础权限验证，用户只能操作自己的数据
 */

const { authenticateJWT, requireOwnership } = require('./auth');
const { logger } = require('../config/logger');
const { PERMISSIONS } = require('../constants/roles');

/**
 * 小程序端基础认证中间件
 * 验证小程序端用户的JWT Token
 */
const apiAuth = authenticateJWT({
  type: 'api',
  required: true
});

/**
 * 小程序端可选认证中间件
 * 如果有Token则验证，没有Token也继续执行
 */
const apiOptionalAuth = authenticateJWT({
  type: 'api',
  required: false
});

/**
 * 小程序端用户资源所有权验证
 * 确保用户只能访问自己的数据
 */
const apiOwnership = requireOwnership('id', 'user_id');

/**
 * 验证用户是否可以访问自己的资料
 * @param {string} paramName - 用户ID参数名称
 * @returns {Function} Express中间件
 */
function requireSelfAccess(paramName = 'id') {
  return (req, res, next) => {
    if (!req.user) {
      return res.unauthorized('需要登录后访问');
    }

    const targetUserId = parseInt(req.params[paramName]);
    if (!targetUserId) {
      return res.badRequest('缺少用户ID');
    }

    if (targetUserId !== req.user.id) {
      logger.warn('小程序端用户尝试访问他人数据', {
        userId: req.user.id,
        targetUserId,
        path: req.path,
        method: req.method,
        ip: req.ip
      });
      
      return res.forbidden('只能访问自己的数据');
    }

    next();
  };
}

/**
 * 小程序端邮箱验证状态检查
 */
function requireEmailVerified() {
  return (req, res, next) => {
    if (!req.user) {
      return res.unauthorized('需要登录后访问');
    }

    if (!req.user.isEmailVerified()) {
      return res.forbidden('需要先验证邮箱', {
        code: 'EMAIL_NOT_VERIFIED',
        required_action: 'verify_email'
      });
    }

    next();
  };
}

/**
 * 小程序端手机验证状态检查
 */
function requirePhoneVerified() {
  return (req, res, next) => {
    if (!req.user) {
      return res.unauthorized('需要登录后访问');
    }

    if (!req.user.isPhoneVerified()) {
      return res.forbidden('需要先验证手机号', {
        code: 'PHONE_NOT_VERIFIED',
        required_action: 'verify_phone'
      });
    }

    next();
  };
}

/**
 * 小程序端微信绑定状态检查
 */
function requireWechatBound() {
  return (req, res, next) => {
    if (!req.user) {
      return res.unauthorized('需要登录后访问');
    }

    if (!req.user.isWechatBound()) {
      return res.forbidden('需要先绑定微信', {
        code: 'WECHAT_NOT_BOUND',
        required_action: 'bind_wechat'
      });
    }

    next();
  };
}

/**
 * 小程序端用户信息完整性检查
 */
function requireCompleteProfile() {
  return (req, res, next) => {
    if (!req.user) {
      return res.unauthorized('需要登录后访问');
    }

    const missingFields = [];
    
    if (!req.user.nickname) {
      missingFields.push('nickname');
    }
    
    if (!req.user.email && !req.user.phone) {
      missingFields.push('contact_info'); // 邮箱或手机号
    }

    if (missingFields.length > 0) {
      return res.forbidden('需要完善个人信息', {
        code: 'INCOMPLETE_PROFILE',
        missing_fields: missingFields,
        required_action: 'complete_profile'
      });
    }

    next();
  };
}

/**
 * 小程序端基础权限检查（用户基本操作权限）
 */
function requireBasicPermissions() {
  return (req, res, next) => {
    if (!req.user) {
      return res.unauthorized('需要登录后访问');
    }

    if (!req.token || !req.token.payload) {
      return res.unauthorized('认证信息无效');
    }

    const userPermissions = req.token.payload.permissions || [];
    const hasBasicPermission = userPermissions.includes(PERMISSIONS.USER.READ_PROFILE.code);

    if (!hasBasicPermission) {
      logger.warn('小程序端用户缺少基础权限', {
        userId: req.user.id,
        userPermissions,
        path: req.path,
        method: req.method,
        ip: req.ip
      });
      
      return res.forbidden('账户权限不足，请联系客服');
    }

    next();
  };
}

/**
 * 限制用户在一定时间内的操作频率
 * @param {number} maxAttempts - 最大尝试次数
 * @param {number} windowMs - 时间窗口（毫秒）
 * @param {string} action - 操作类型
 * @returns {Function} Express中间件
 */
function rateLimitByUser(maxAttempts, windowMs, action = 'general') {
  const attempts = new Map(); // 在实际项目中应该使用Redis

  return (req, res, next) => {
    if (!req.user) {
      return res.unauthorized('需要登录后访问');
    }

    const key = `${req.user.id}:${action}`;
    const now = Date.now();
    
    if (!attempts.has(key)) {
      attempts.set(key, []);
    }

    const userAttempts = attempts.get(key);
    
    // 清理过期的尝试记录
    const validAttempts = userAttempts.filter(timestamp => now - timestamp < windowMs);
    attempts.set(key, validAttempts);

    if (validAttempts.length >= maxAttempts) {
      logger.warn('小程序端用户操作频率过高', {
        userId: req.user.id,
        action,
        attempts: validAttempts.length,
        maxAttempts,
        path: req.path,
        method: req.method,
        ip: req.ip
      });
      
      return res.tooManyRequests(`${action}操作过于频繁，请稍后再试`);
    }

    // 记录当前尝试
    validAttempts.push(now);
    next();
  };
}

/**
 * 检查用户账户状态（账户锁定、暂停等）
 */
function checkAccountStatus() {
  return (req, res, next) => {
    if (!req.user) {
      return res.unauthorized('需要登录后访问');
    }

    // 检查账户是否被锁定
    if (req.user.isLocked()) {
      const lockExpiry = req.user.locked_until;
      return res.forbidden('账户已被锁定', {
        code: 'ACCOUNT_LOCKED',
        locked_until: lockExpiry,
        message: lockExpiry ? `账户将在${new Date(lockExpiry).toLocaleString()}解锁` : '账户已被永久锁定'
      });
    }

    // 检查账户状态
    if (!req.user.isActive()) {
      let message = '账户不可用';
      let code = 'ACCOUNT_INACTIVE';
      
      switch (req.user.status) {
        case 'suspended':
          message = '账户已被暂停';
          code = 'ACCOUNT_SUSPENDED';
          break;
        case 'banned':
          message = '账户已被封禁';
          code = 'ACCOUNT_BANNED';
          break;
        case 'deleted':
          message = '账户已被删除';
          code = 'ACCOUNT_DELETED';
          break;
        case 'pending':
          message = '账户待审核';
          code = 'ACCOUNT_PENDING';
          break;
      }
      
      return res.forbidden(message, { code });
    }

    next();
  };
}

/**
 * 记录用户操作日志
 * @param {string} action - 操作类型
 * @returns {Function} Express中间件
 */
function logUserAction(action) {
  return (req, res, next) => {
    if (req.user) {
      logger.info('小程序端用户操作', {
        userId: req.user.id,
        username: req.user.username,
        action,
        path: req.path,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        params: req.params,
        query: req.query,
        timestamp: new Date().toISOString()
      });
    }
    next();
  };
}

/**
 * 组合认证中间件 - 小程序端完整认证
 * 包含基础认证、账户状态检查、基础权限验证
 */
const apiFullAuth = [
  apiAuth,
  checkAccountStatus(),
  requireBasicPermissions()
];

/**
 * 组合认证中间件 - 小程序端个人资料访问
 * 包含完整认证和自我访问权限验证
 */
const apiSelfAuth = [
  ...apiFullAuth,
  requireSelfAccess()
];

/**
 * 组合认证中间件 - 需要验证邮箱的操作
 */
const apiEmailVerifiedAuth = [
  ...apiFullAuth,
  requireEmailVerified()
];

/**
 * 组合认证中间件 - 需要验证手机的操作
 */
const apiPhoneVerifiedAuth = [
  ...apiFullAuth,
  requirePhoneVerified()
];

/**
 * 组合认证中间件 - 需要完整资料的操作
 */
const apiCompleteProfileAuth = [
  ...apiFullAuth,
  requireCompleteProfile()
];

module.exports = {
  // 基础认证中间件
  apiAuth,
  apiOptionalAuth,
  apiOwnership,
  
  // 功能性中间件
  requireSelfAccess,
  requireEmailVerified,
  requirePhoneVerified,
  requireWechatBound,
  requireCompleteProfile,
  requireBasicPermissions,
  checkAccountStatus,
  logUserAction,
  rateLimitByUser,
  
  // 组合认证中间件
  apiFullAuth,
  apiSelfAuth,
  apiEmailVerifiedAuth,
  apiPhoneVerifiedAuth,
  apiCompleteProfileAuth
}; 