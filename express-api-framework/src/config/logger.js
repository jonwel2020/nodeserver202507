/**
 * 日志配置模块
 * 支持分级日志记录、文件轮转和结构化日志
 */
const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');

// 日志级别配置
const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3
};

// 日志颜色配置
const LOG_COLORS = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  debug: 'blue'
};

// 添加颜色支持
winston.addColors(LOG_COLORS);

// 日志目录
const logDir = path.join(process.cwd(), 'logs');

// 自定义日志格式
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let logMessage = `${timestamp} [${level.toUpperCase()}]: ${message}`;
    
    // 添加元数据
    if (Object.keys(meta).length > 0) {
      logMessage += ` ${JSON.stringify(meta)}`;
    }
    
    return logMessage;
  })
);

// 控制台日志格式
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let logMessage = `${timestamp} [${level}]: ${message}`;
    
    // 在开发环境显示元数据
    if (process.env.NODE_ENV === 'development' && Object.keys(meta).length > 0) {
      logMessage += `\n${JSON.stringify(meta, null, 2)}`;
    }
    
    return logMessage;
  })
);

// 错误日志轮转配置
const errorRotateTransport = new DailyRotateFile({
  filename: path.join(logDir, 'error-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  level: 'error',
  maxSize: process.env.LOG_MAX_SIZE || '10m',
  maxFiles: process.env.LOG_MAX_FILES || '7d',
  format: logFormat,
  auditFile: path.join(logDir, 'error-audit.json'),
  zippedArchive: true
});

// 组合日志轮转配置
const combinedRotateTransport = new DailyRotateFile({
  filename: path.join(logDir, 'combined-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  maxSize: process.env.LOG_MAX_SIZE || '10m',
  maxFiles: process.env.LOG_MAX_FILES || '7d',
  format: logFormat,
  auditFile: path.join(logDir, 'combined-audit.json'),
  zippedArchive: true
});

// 访问日志轮转配置
const accessRotateTransport = new DailyRotateFile({
  filename: path.join(logDir, 'access-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  maxSize: process.env.LOG_MAX_SIZE || '10m',
  maxFiles: process.env.LOG_MAX_FILES || '7d',
  format: logFormat,
  auditFile: path.join(logDir, 'access-audit.json'),
  zippedArchive: true
});

// 创建主日志器
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  levels: LOG_LEVELS,
  defaultMeta: {
    service: 'express-api-framework',
    environment: process.env.NODE_ENV || 'development'
  },
  transports: [
    errorRotateTransport,
    combinedRotateTransport
  ],
  exitOnError: false
});

// 在非生产环境添加控制台输出
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: consoleFormat,
    level: 'debug'
  }));
}

// 创建访问日志器
const accessLogger = winston.createLogger({
  level: 'info',
  defaultMeta: {
    service: 'express-api-framework-access',
    environment: process.env.NODE_ENV || 'development'
  },
  transports: [accessRotateTransport],
  exitOnError: false
});

// 设置文件轮转事件监听
errorRotateTransport.on('rotate', (oldFilename, newFilename) => {
  logger.info('错误日志文件轮转', { oldFilename, newFilename });
});

combinedRotateTransport.on('rotate', (oldFilename, newFilename) => {
  logger.info('组合日志文件轮转', { oldFilename, newFilename });
});

accessRotateTransport.on('rotate', (oldFilename, newFilename) => {
  logger.info('访问日志文件轮转', { oldFilename, newFilename });
});

/**
 * 记录错误日志
 * @param {string} message - 日志消息
 * @param {Object} meta - 元数据
 */
function logError(message, meta = {}) {
  logger.error(message, sanitizeMeta(meta));
}

/**
 * 记录警告日志
 * @param {string} message - 日志消息
 * @param {Object} meta - 元数据
 */
function logWarn(message, meta = {}) {
  logger.warn(message, sanitizeMeta(meta));
}

/**
 * 记录信息日志
 * @param {string} message - 日志消息
 * @param {Object} meta - 元数据
 */
function logInfo(message, meta = {}) {
  logger.info(message, sanitizeMeta(meta));
}

/**
 * 记录调试日志
 * @param {string} message - 日志消息
 * @param {Object} meta - 元数据
 */
function logDebug(message, meta = {}) {
  logger.debug(message, sanitizeMeta(meta));
}

/**
 * 记录访问日志
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {number} responseTime - 响应时间（毫秒）
 */
function logAccess(req, res, responseTime) {
  const logData = {
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    ip: getClientIp(req),
    statusCode: res.statusCode,
    responseTime: `${responseTime}ms`,
    contentLength: res.get('Content-Length') || 0,
    referer: req.get('Referer') || '-',
    userId: req.user ? req.user.id : '-',
    requestId: req.requestId || '-'
  };

  accessLogger.info('HTTP请求', logData);
}

/**
 * 记录认证日志
 * @param {string} action - 操作类型
 * @param {Object} user - 用户信息
 * @param {Object} req - 请求对象
 * @param {boolean} success - 是否成功
 * @param {string} reason - 失败原因
 */
function logAuth(action, user, req, success = true, reason = '') {
  const logData = {
    action,
    userId: user ? user.id : '-',
    username: user ? user.username : '-',
    ip: getClientIp(req),
    userAgent: req.get('User-Agent'),
    success,
    reason,
    requestId: req.requestId || '-'
  };

  if (success) {
    logger.info(`认证操作成功: ${action}`, logData);
  } else {
    logger.warn(`认证操作失败: ${action}`, logData);
  }
}

/**
 * 记录业务操作日志
 * @param {string} operation - 操作类型
 * @param {Object} user - 用户信息
 * @param {Object} data - 操作数据
 * @param {Object} req - 请求对象
 */
function logBusiness(operation, user, data, req) {
  const logData = {
    operation,
    userId: user ? user.id : '-',
    username: user ? user.username : '-',
    ip: getClientIp(req),
    data: sanitizeMeta(data),
    requestId: req.requestId || '-',
    timestamp: new Date().toISOString()
  };

  logger.info(`业务操作: ${operation}`, logData);
}

/**
 * 记录性能日志
 * @param {string} operation - 操作名称
 * @param {number} duration - 执行时间（毫秒）
 * @param {Object} meta - 额外数据
 */
function logPerformance(operation, duration, meta = {}) {
  const logData = {
    operation,
    duration: `${duration}ms`,
    ...sanitizeMeta(meta)
  };

  if (duration > 1000) {
    logger.warn(`性能警告: ${operation} 执行时间过长`, logData);
  } else {
    logger.info(`性能记录: ${operation}`, logData);
  }
}

/**
 * 记录数据库操作日志
 * @param {string} operation - 操作类型
 * @param {string} table - 表名
 * @param {number} duration - 执行时间
 * @param {Object} meta - 额外数据
 */
function logDatabase(operation, table, duration, meta = {}) {
  const logData = {
    operation,
    table,
    duration: `${duration}ms`,
    ...sanitizeMeta(meta)
  };

  if (duration > 500) {
    logger.warn(`数据库慢查询: ${operation} on ${table}`, logData);
  } else {
    logger.debug(`数据库操作: ${operation} on ${table}`, logData);
  }
}

/**
 * 获取客户端IP地址
 * @param {Object} req - 请求对象
 * @returns {string} IP地址
 */
function getClientIp(req) {
  return req.ip || 
         req.connection?.remoteAddress || 
         req.socket?.remoteAddress ||
         req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
         req.headers['x-real-ip'] ||
         'unknown';
}

/**
 * 清理敏感信息
 * @param {Object} meta - 原始元数据
 * @returns {Object} 清理后的元数据
 */
function sanitizeMeta(meta) {
  if (!meta || typeof meta !== 'object') {
    return meta;
  }

  const sensitiveFields = [
    'password', 'token', 'secret', 'key', 'authorization',
    'cookie', 'session', 'credit_card', 'ssn', 'passport'
  ];

  const sanitized = { ...meta };

  // 递归清理敏感字段
  function sanitizeObject(obj) {
    if (!obj || typeof obj !== 'object') {
      return obj;
    }

    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();
      if (sensitiveFields.some(field => lowerKey.includes(field))) {
        obj[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        sanitizeObject(value);
      }
    }
  }

  sanitizeObject(sanitized);
  return sanitized;
}

/**
 * 创建子日志器
 * @param {string} service - 服务名称
 * @param {Object} defaultMeta - 默认元数据
 * @returns {Object} 子日志器
 */
function createChildLogger(service, defaultMeta = {}) {
  return logger.child({
    service,
    ...defaultMeta
  });
}

/**
 * 获取日志统计信息
 * @returns {Object} 统计信息
 */
function getLogStats() {
  return {
    errorCount: logger.transports[0].logstats?.error || 0,
    warnCount: logger.transports[0].logstats?.warn || 0,
    infoCount: logger.transports[0].logstats?.info || 0,
    debugCount: logger.transports[0].logstats?.debug || 0
  };
}

// 处理未捕获的异常
logger.exceptions.handle(
  new DailyRotateFile({
    filename: path.join(logDir, 'exceptions-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxSize: '10m',
    maxFiles: '7d',
    format: logFormat
  })
);

// 处理未处理的Promise拒绝
logger.rejections.handle(
  new DailyRotateFile({
    filename: path.join(logDir, 'rejections-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxSize: '10m',
    maxFiles: '7d',
    format: logFormat
  })
);

// 导出日志器和工具函数
module.exports = {
  logger,
  accessLogger,
  error: logError,
  warn: logWarn,
  info: logInfo,
  debug: logDebug,
  logAccess,
  logAuth,
  logBusiness,
  logPerformance,
  logDatabase,
  createChildLogger,
  getLogStats,
  sanitizeMeta
}; 