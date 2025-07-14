/**
 * 限流中间件
 * 支持差异化限流策略、Redis存储、动态调整
 */

const rateLimit = require('express-rate-limit');
const { redis } = require('../config/redis');
const { logger } = require('../config/logger');

/**
 * Redis存储器类，用于分布式限流
 */
class RedisStore {
  constructor(options = {}) {
    this.client = redis;
    this.prefix = options.prefix || 'rate_limit:';
    this.sendCommand = options.sendCommand || this.sendCommand.bind(this);
  }

  /**
   * 发送Redis命令
   * @param {string} command - Redis命令
   * @param {...any} args - 命令参数
   */
  async sendCommand(command, ...args) {
    try {
      return await this.client[command.toLowerCase()](...args);
    } catch (error) {
      logger.error('Redis限流命令执行失败', { command, args, error: error.message });
      throw error;
    }
  }

  /**
   * 获取当前请求次数
   * @param {string} key - 限流键
   */
  async incr(key) {
    const redisKey = this.prefix + key;
    return await this.sendCommand('INCR', redisKey);
  }

  /**
   * 设置过期时间
   * @param {string} key - 限流键
   * @param {number} windowMs - 窗口时间（毫秒）
   */
  async expire(key, windowMs) {
    const redisKey = this.prefix + key;
    const seconds = Math.ceil(windowMs / 1000);
    return await this.sendCommand('EXPIRE', redisKey, seconds);
  }

  /**
   * 获取剩余过期时间
   * @param {string} key - 限流键
   */
  async pttl(key) {
    const redisKey = this.prefix + key;
    return await this.sendCommand('PTTL', redisKey);
  }

  /**
   * 删除键
   * @param {string} key - 限流键
   */
  async decrement(key) {
    const redisKey = this.prefix + key;
    return await this.sendCommand('DECR', redisKey);
  }

  /**
   * 重置计数器
   * @param {string} key - 限流键
   */
  async resetKey(key) {
    const redisKey = this.prefix + key;
    return await this.sendCommand('DEL', redisKey);
  }
}

/**
 * 获取客户端标识
 * @param {Object} req - Express请求对象
 * @returns {string} 客户端标识
 */
function getClientId(req) {
  // 优先使用用户ID（已登录用户）
  if (req.user && req.user.id) {
    return `user:${req.user.id}`;
  }
  
  if (req.admin && req.admin.id) {
    return `admin:${req.admin.id}`;
  }

  // 使用IP地址
  const ip = req.headers['x-forwarded-for'] ||
             req.headers['x-real-ip'] ||
             req.connection.remoteAddress ||
             req.socket.remoteAddress ||
             '0.0.0.0';
  
  return `ip:${ip}`;
}

/**
 * 自定义限流键生成器
 * @param {Object} req - Express请求对象
 * @param {string} type - 限流类型
 */
function generateRateLimitKey(req, type = 'default') {
  const clientId = getClientId(req);
  const path = req.route ? req.route.path : req.path;
  return `${type}:${req.method}:${path}:${clientId}`;
}

/**
 * 创建Redis存储器实例
 */
const redisStore = new RedisStore();

/**
 * 默认限流配置
 */
const defaultLimitConfig = {
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || '15') * 60 * 1000, // 15分钟
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'), // 100个请求
  message: {
    code: 429,
    message: '请求过于频繁，请稍后再试',
    error: 'TOO_MANY_REQUESTS',
    timestamp: new Date().toISOString()
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: redisStore,
  keyGenerator: (req) => generateRateLimitKey(req, 'default'),
  skip: (req) => {
    // 跳过健康检查等系统接口
    return req.path === '/health' || req.path === '/';
  },
  onLimitReached: (req, res, options) => {
    logger.warn('限流触发', {
      ip: req.ip,
      path: req.path,
      method: req.method,
      user_id: req.user?.id || req.admin?.id,
      user_agent: req.get('User-Agent'),
      limit: options.max,
      window: options.windowMs
    });
  }
};

/**
 * 通用限流中间件
 */
const generalLimiter = rateLimit(defaultLimitConfig);

/**
 * 登录接口限流（更严格）
 */
const loginLimiter = rateLimit({
  ...defaultLimitConfig,
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 5, // 最多5次登录尝试
  skipSuccessfulRequests: true, // 成功的请求不计入限制
  keyGenerator: (req) => generateRateLimitKey(req, 'login'),
  message: {
    code: 429,
    message: '登录尝试过于频繁，请15分钟后再试',
    error: 'LOGIN_RATE_LIMITED',
    timestamp: new Date().toISOString()
  },
  onLimitReached: (req, res, options) => {
    logger.warn('登录限流触发', {
      ip: req.ip,
      path: req.path,
      user_agent: req.get('User-Agent'),
      attempts: options.max
    });
  }
});

/**
 * 注册接口限流
 */
const registerLimiter = rateLimit({
  ...defaultLimitConfig,
  windowMs: 60 * 60 * 1000, // 1小时
  max: 3, // 最多3次注册
  keyGenerator: (req) => generateRateLimitKey(req, 'register'),
  message: {
    code: 429,
    message: '注册过于频繁，请1小时后再试',
    error: 'REGISTER_RATE_LIMITED',
    timestamp: new Date().toISOString()
  }
});

/**
 * 密码重置限流
 */
const passwordResetLimiter = rateLimit({
  ...defaultLimitConfig,
  windowMs: 60 * 60 * 1000, // 1小时
  max: 3, // 最多3次密码重置
  keyGenerator: (req) => generateRateLimitKey(req, 'password_reset'),
  message: {
    code: 429,
    message: '密码重置请求过于频繁，请1小时后再试',
    error: 'PASSWORD_RESET_RATE_LIMITED',
    timestamp: new Date().toISOString()
  }
});

/**
 * 小程序端API限流（相对宽松）
 */
const apiLimiter = rateLimit({
  ...defaultLimitConfig,
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 200, // 200个请求
  keyGenerator: (req) => generateRateLimitKey(req, 'api'),
  message: {
    code: 429,
    message: '小程序请求过于频繁，请稍后再试',
    error: 'API_RATE_LIMITED',
    timestamp: new Date().toISOString()
  }
});

/**
 * 管理端API限流（相对严格）
 */
const adminLimiter = rateLimit({
  ...defaultLimitConfig,
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 500, // 500个请求（管理端操作更频繁）
  keyGenerator: (req) => generateRateLimitKey(req, 'admin'),
  message: {
    code: 429,
    message: '管理端请求过于频繁，请稍后再试',
    error: 'ADMIN_RATE_LIMITED',
    timestamp: new Date().toISOString()
  }
});

/**
 * 文件上传限流
 */
const uploadLimiter = rateLimit({
  ...defaultLimitConfig,
  windowMs: 60 * 60 * 1000, // 1小时
  max: 50, // 最多50次上传
  keyGenerator: (req) => generateRateLimitKey(req, 'upload'),
  message: {
    code: 429,
    message: '文件上传过于频繁，请稍后再试',
    error: 'UPLOAD_RATE_LIMITED',
    timestamp: new Date().toISOString()
  }
});

/**
 * 短信验证码限流
 */
const smsLimiter = rateLimit({
  ...defaultLimitConfig,
  windowMs: 60 * 1000, // 1分钟
  max: 1, // 1分钟内最多1条短信
  keyGenerator: (req) => {
    const phone = req.body.phone || req.query.phone;
    return `sms:${phone}`;
  },
  message: {
    code: 429,
    message: '短信发送过于频繁，请1分钟后再试',
    error: 'SMS_RATE_LIMITED',
    timestamp: new Date().toISOString()
  }
});

/**
 * 邮件验证码限流
 */
const emailLimiter = rateLimit({
  ...defaultLimitConfig,
  windowMs: 60 * 1000, // 1分钟
  max: 1, // 1分钟内最多1封邮件
  keyGenerator: (req) => {
    const email = req.body.email || req.query.email;
    return `email:${email}`;
  },
  message: {
    code: 429,
    message: '邮件发送过于频繁，请1分钟后再试',
    error: 'EMAIL_RATE_LIMITED',
    timestamp: new Date().toISOString()
  }
});

/**
 * 创建自定义限流器
 * @param {Object} options - 限流配置
 * @returns {Function} 限流中间件
 */
function createCustomLimiter(options = {}) {
  const config = {
    ...defaultLimitConfig,
    ...options,
    store: redisStore
  };

  return rateLimit(config);
}

/**
 * 动态限流中间件
 * 根据用户等级或VIP状态调整限流策略
 */
function dynamicLimiter(baseOptions = {}) {
  return async (req, res, next) => {
    let maxRequests = baseOptions.max || defaultLimitConfig.max;
    
    // 根据用户等级调整限制
    if (req.user) {
      switch (req.user.level) {
        case 'vip':
          maxRequests *= 2; // VIP用户双倍限制
          break;
        case 'premium':
          maxRequests *= 3; // 高级用户三倍限制
          break;
        default:
          break;
      }
    }

    // 管理员有更高的限制
    if (req.admin) {
      maxRequests *= 5;
    }

    const dynamicConfig = {
      ...defaultLimitConfig,
      ...baseOptions,
      max: maxRequests,
      store: redisStore
    };

    const limiter = rateLimit(dynamicConfig);
    return limiter(req, res, next);
  };
}

module.exports = {
  // 基础限流器
  generalLimiter,
  
  // 特定功能限流器
  loginLimiter,
  registerLimiter,
  passwordResetLimiter,
  apiLimiter,
  adminLimiter,
  uploadLimiter,
  smsLimiter,
  emailLimiter,
  
  // 工具函数
  createCustomLimiter,
  dynamicLimiter,
  
  // 存储器
  RedisStore,
  redisStore
}; 