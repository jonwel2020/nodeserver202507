const morgan = require('morgan');
const { v4: uuidv4 } = require('uuid');
const { logger } = require('../config/logger');

/**
 * 敏感字段列表（需要脱敏的字段）
 */
const SENSITIVE_FIELDS = [
  'password',
  'newPassword',
  'oldPassword',
  'confirmPassword',
  'token',
  'accessToken',
  'refreshToken',
  'secret',
  'key',
  'authorization',
  'cookie',
  'session',
  'apiKey',
  'privateKey',
  'publicKey',
  'signature',
  'ssn',
  'creditCard',
  'bankAccount'
];

/**
 * 脱敏处理函数
 * @param {any} data - 要脱敏的数据
 * @param {number} maxDepth - 最大递归深度
 * @returns {any} 脱敏后的数据
 */
const sanitizeData = (data, maxDepth = 3) => {
  if (maxDepth <= 0) return '[Max Depth Reached]';
  
  if (data === null || data === undefined) return data;
  
  if (typeof data === 'string') {
    // 检查是否包含敏感信息模式
    if (data.length > 100 || 
        /^Bearer\s+/i.test(data) || 
        /^[A-Za-z0-9+/]{20,}={0,2}$/.test(data)) {
      return '[REDACTED]';
    }
    return data;
  }
  
  if (typeof data === 'number' || typeof data === 'boolean') {
    return data;
  }
  
  if (Array.isArray(data)) {
    return data.map(item => sanitizeData(item, maxDepth - 1));
  }
  
  if (typeof data === 'object') {
    const sanitized = {};
    
    for (const [key, value] of Object.entries(data)) {
      const lowerKey = key.toLowerCase();
      
      // 检查是否为敏感字段
      if (SENSITIVE_FIELDS.some(field => lowerKey.includes(field))) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = sanitizeData(value, maxDepth - 1);
      }
    }
    
    return sanitized;
  }
  
  return data;
};

/**
 * 生成请求ID
 * @returns {string} 唯一请求ID
 */
const generateRequestId = () => {
  return uuidv4().replace(/-/g, '').slice(0, 16);
};

/**
 * 请求ID中间件
 */
const requestId = (req, res, next) => {
  // 从请求头获取或生成新的请求ID
  const reqId = req.get('X-Request-ID') || generateRequestId();
  
  // 设置到请求对象
  req.requestId = reqId;
  
  // 设置响应头
  res.set('X-Request-ID', reqId);
  
  next();
};

/**
 * 响应时间中间件
 */
const responseTime = (req, res, next) => {
  const start = Date.now();
  
  // 监听响应完成事件
  res.on('finish', () => {
    const duration = Date.now() - start;
    req.responseTime = duration;
    res.set('X-Response-Time', `${duration}ms`);
  });
  
  next();
};

/**
 * 用户信息提取中间件
 */
const userInfo = (req, res, next) => {
  // 提取用户信息用于日志记录
  req.userInfo = {
    id: req.user?.id || null,
    username: req.user?.username || null,
    role: req.user?.role || null,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent') || null
  };
  
  next();
};

/**
 * 创建自定义Morgan日志格式
 */
const createMorganFormat = () => {
  // 自定义tokens
  morgan.token('id', (req) => req.requestId);
  morgan.token('user-id', (req) => req.userInfo?.id || '-');
  morgan.token('user-role', (req) => req.userInfo?.role || '-');
  morgan.token('real-ip', (req) => req.userInfo?.ip || '-');
  morgan.token('response-time-ms', (req) => req.responseTime || '-');
  
  // 开发环境格式
  const developmentFormat = ':id :method :url :status :response-time-ms ms - :res[content-length] - :user-id/:user-role - :real-ip';
  
  // 生产环境格式（JSON格式）
  const productionFormat = (tokens, req, res) => {
    return JSON.stringify({
      timestamp: new Date().toISOString(),
      requestId: tokens.id(req, res),
      method: tokens.method(req, res),
      url: tokens.url(req, res),
      status: parseInt(tokens.status(req, res)) || 0,
      responseTime: parseInt(tokens['response-time-ms'](req, res)) || 0,
      contentLength: tokens.res(req, res, 'content-length') || '0',
      userAgent: req.get('User-Agent') || '',
      referer: req.get('Referer') || '',
      userId: req.userInfo?.id || null,
      userRole: req.userInfo?.role || null,
      clientIp: req.userInfo?.ip || '',
      httpVersion: req.httpVersion,
      protocol: req.protocol
    });
  };
  
  return process.env.NODE_ENV === 'production' ? productionFormat : developmentFormat;
};

/**
 * 请求详细日志中间件
 */
const detailedLogger = (req, res, next) => {
  // 记录请求开始
  const requestData = {
    requestId: req.requestId,
    method: req.method,
    url: req.originalUrl,
    headers: sanitizeData(req.headers),
    query: sanitizeData(req.query),
    params: sanitizeData(req.params),
    body: sanitizeData(req.body),
    userInfo: req.userInfo,
    timestamp: new Date().toISOString()
  };
  
  logger.debug('请求开始', requestData);
  
  // 监听响应完成
  res.on('finish', () => {
    const responseData = {
      requestId: req.requestId,
      statusCode: res.statusCode,
      responseTime: req.responseTime,
      contentLength: res.get('Content-Length') || 0,
      timestamp: new Date().toISOString()
    };
    
    // 根据状态码选择日志级别
    if (res.statusCode >= 500) {
      logger.error('请求完成 - 服务器错误', {
        ...requestData,
        ...responseData
      });
    } else if (res.statusCode >= 400) {
      logger.warn('请求完成 - 客户端错误', {
        ...requestData,
        ...responseData
      });
    } else {
      logger.info('请求完成', {
        requestId: req.requestId,
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
        responseTime: req.responseTime,
        userId: req.userInfo?.id,
        userRole: req.userInfo?.role,
        clientIp: req.userInfo?.ip
      });
    }
  });
  
  next();
};

/**
 * 慢请求监控中间件
 */
const slowRequestMonitor = (threshold = 1000) => {
  return (req, res, next) => {
    res.on('finish', () => {
      if (req.responseTime > threshold) {
        logger.warn('慢请求检测', {
          requestId: req.requestId,
          method: req.method,
          url: req.originalUrl,
          responseTime: req.responseTime,
          threshold,
          userId: req.userInfo?.id,
          userAgent: req.get('User-Agent'),
          timestamp: new Date().toISOString()
        });
      }
    });
    
    next();
  };
};

/**
 * API访问统计中间件
 */
const apiStats = (() => {
  const stats = new Map();
  
  return (req, res, next) => {
    const endpoint = `${req.method} ${req.route?.path || req.path}`;
    
    res.on('finish', () => {
      const current = stats.get(endpoint) || {
        count: 0,
        totalTime: 0,
        errors: 0,
        lastAccess: null
      };
      
      current.count++;
      current.totalTime += req.responseTime || 0;
      current.lastAccess = new Date().toISOString();
      
      if (res.statusCode >= 400) {
        current.errors++;
      }
      
      stats.set(endpoint, current);
      
      // 每1000次请求输出一次统计
      if (current.count % 1000 === 0) {
        logger.info('API访问统计', {
          endpoint,
          totalRequests: current.count,
          averageResponseTime: Math.round(current.totalTime / current.count),
          errorRate: Math.round((current.errors / current.count) * 100),
          lastAccess: current.lastAccess
        });
      }
    });
    
    next();
  };
})();

/**
 * 错误请求日志中间件
 */
const errorLogger = (error, req, res, next) => {
  const errorData = {
    requestId: req.requestId,
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
      code: error.code
    },
    request: {
      method: req.method,
      url: req.originalUrl,
      headers: sanitizeData(req.headers),
      body: sanitizeData(req.body),
      query: sanitizeData(req.query),
      params: sanitizeData(req.params)
    },
    userInfo: req.userInfo,
    timestamp: new Date().toISOString()
  };
  
  logger.error('请求处理错误', errorData);
  next(error);
};

/**
 * 创建Morgan中间件
 */
const createMorganMiddleware = () => {
  const format = createMorganFormat();
  
  return morgan(format, {
    stream: {
      write: (message) => {
        // 移除换行符并记录到日志系统
        const logMessage = message.trim();
        
        try {
          // 尝试解析JSON格式的日志
          const logData = JSON.parse(logMessage);
          logger.info('HTTP请求', logData);
        } catch {
          // 如果不是JSON格式，直接记录
          logger.info(logMessage);
        }
      }
    },
    skip: (req, res) => {
      // 跳过健康检查请求的日志
      return req.originalUrl === '/health' || req.originalUrl === '/ping';
    }
  });
};

module.exports = {
  // 基础中间件
  requestId,
  responseTime,
  userInfo,
  
  // 日志记录中间件
  createMorganMiddleware,
  detailedLogger,
  errorLogger,
  
  // 监控中间件
  slowRequestMonitor,
  apiStats,
  
  // 工具函数
  sanitizeData,
  generateRequestId
}; 