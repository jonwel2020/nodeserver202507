const { logger } = require('../config/logger');
const { Response } = require('../utils/response');
const { ERROR_CODES } = require('../constants/errors');

/**
 * 自定义业务错误类
 */
class BusinessError extends Error {
  constructor(message, code = 600, statusCode = 400, details = null) {
    super(message);
    this.name = 'BusinessError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

/**
 * 自定义验证错误类
 */
class ValidationError extends Error {
  constructor(message, details = null) {
    super(message);
    this.name = 'ValidationError';
    this.code = 601;
    this.statusCode = 422;
    this.details = details;
  }
}

/**
 * 自定义数据库错误类
 */
class DatabaseError extends Error {
  constructor(message, details = null) {
    super(message);
    this.name = 'DatabaseError';
    this.code = 602;
    this.statusCode = 500;
    this.details = details;
  }
}

/**
 * 格式化验证错误信息
 * @param {Object} error - Joi验证错误对象
 * @returns {Array} 格式化后的错误详情
 */
const formatJoiError = (error) => {
  return error.details.map(detail => ({
    field: detail.path.join('.'),
    message: detail.message,
    value: detail.context?.value
  }));
};

/**
 * 格式化数据库错误信息
 * @param {Object} error - 数据库错误对象
 * @returns {Object} 格式化后的错误信息
 */
const formatDatabaseError = (error) => {
  const dbError = {
    type: 'database_error',
    code: error.code || 'UNKNOWN_DB_ERROR'
  };

  // MySQL错误码处理
  switch (error.code) {
    case 'ER_DUP_ENTRY':
      dbError.message = '数据重复，违反唯一约束';
      dbError.statusCode = 409;
      break;
    case 'ER_NO_REFERENCED_ROW_2':
      dbError.message = '外键约束错误，引用的记录不存在';
      dbError.statusCode = 400;
      break;
    case 'ER_ROW_IS_REFERENCED_2':
      dbError.message = '无法删除，存在关联数据';
      dbError.statusCode = 400;
      break;
    case 'ER_BAD_FIELD_ERROR':
      dbError.message = '字段不存在';
      dbError.statusCode = 400;
      break;
    case 'ER_PARSE_ERROR':
      dbError.message = 'SQL语法错误';
      dbError.statusCode = 500;
      break;
    case 'ER_ACCESS_DENIED_ERROR':
      dbError.message = '数据库访问权限不足';
      dbError.statusCode = 500;
      break;
    case 'ECONNREFUSED':
      dbError.message = '数据库连接被拒绝';
      dbError.statusCode = 503;
      break;
    case 'ETIMEDOUT':
      dbError.message = '数据库连接超时';
      dbError.statusCode = 503;
      break;
    default:
      dbError.message = '数据库操作失败';
      dbError.statusCode = 500;
  }

  return dbError;
};

/**
 * 脱敏敏感信息
 * @param {Object} data - 要脱敏的数据
 * @returns {Object} 脱敏后的数据
 */
const sanitizeErrorData = (data) => {
  if (!data || typeof data !== 'object') return data;
  
  const sensitiveFields = ['password', 'token', 'secret', 'key', 'authorization'];
  const sanitized = { ...data };
  
  Object.keys(sanitized).forEach(key => {
    if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof sanitized[key] === 'object') {
      sanitized[key] = sanitizeErrorData(sanitized[key]);
    }
  });
  
  return sanitized;
};

/**
 * 生成错误追踪ID
 * @returns {string} 错误追踪ID
 */
const generateErrorId = () => {
  return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * 全局错误处理中间件
 * @param {Error} error - 错误对象
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 * @param {Function} next - Express下一个中间件函数
 */
const errorHandler = (error, req, res, next) => {
  const errorId = generateErrorId();
  const isProduction = process.env.NODE_ENV === 'production';
  
  // 默认错误信息
  let statusCode = 500;
  let code = ERROR_CODES.INTERNAL_SERVER_ERROR;
  let message = '服务器内部错误';
  let details = null;

  // 根据错误类型设置响应信息
  if (error instanceof BusinessError) {
    // 业务逻辑错误
    statusCode = error.statusCode;
    code = error.code;
    message = error.message;
    details = error.details;
  } else if (error instanceof ValidationError) {
    // 数据验证错误
    statusCode = error.statusCode;
    code = error.code;
    message = error.message;
    details = error.details;
  } else if (error instanceof DatabaseError) {
    // 数据库错误
    statusCode = error.statusCode;
    code = error.code;
    message = error.message;
    details = error.details;
  } else if (error.name === 'ValidationError' && error.isJoi) {
    // Joi验证错误
    statusCode = 422;
    code = ERROR_CODES.VALIDATION_ERROR;
    message = '数据验证失败';
    details = formatJoiError(error);
  } else if (error.name === 'TokenExpiredError') {
    // JWT令牌过期
    statusCode = 401;
    code = ERROR_CODES.TOKEN_EXPIRED;
    message = '令牌已过期，请重新登录';
  } else if (error.name === 'JsonWebTokenError') {
    // JWT令牌无效
    statusCode = 401;
    code = ERROR_CODES.INVALID_TOKEN;
    message = '无效的令牌';
  } else if (error.name === 'SyntaxError' && error.status === 400) {
    // JSON解析错误
    statusCode = 400;
    code = ERROR_CODES.INVALID_JSON;
    message = '请求数据格式错误';
  } else if (error.code && error.code.startsWith('ER_')) {
    // MySQL数据库错误
    const dbError = formatDatabaseError(error);
    statusCode = dbError.statusCode;
    code = ERROR_CODES.DATABASE_ERROR;
    message = dbError.message;
    if (!isProduction) {
      details = {
        sqlCode: error.code,
        sqlMessage: error.sqlMessage
      };
    }
  } else if (error.name === 'MulterError') {
    // 文件上传错误
    statusCode = 400;
    code = ERROR_CODES.FILE_UPLOAD_ERROR;
    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        message = '文件大小超出限制';
        break;
      case 'LIMIT_FILE_COUNT':
        message = '文件数量超出限制';
        break;
      case 'LIMIT_UNEXPECTED_FILE':
        message = '不允许的文件字段';
        break;
      default:
        message = '文件上传失败';
    }
  } else if (error.status && error.status < 500) {
    // HTTP客户端错误
    statusCode = error.status;
    message = error.message || '客户端请求错误';
  }

  // 记录错误日志
  const logData = {
    errorId,
    type: error.name || 'UnknownError',
    message: error.message,
    stack: error.stack,
    statusCode,
    code,
    url: req.originalUrl,
    method: req.method,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    userId: req.user?.id,
    body: sanitizeErrorData(req.body),
    query: req.query,
    params: req.params
  };

  // 根据错误严重程度记录不同级别的日志
  if (statusCode >= 500) {
    logger.error('服务器错误', logData);
  } else if (statusCode >= 400) {
    logger.warn('客户端错误', logData);
  } else {
    logger.info('业务错误', logData);
  }

  // 构建响应数据
  const responseData = {
    code,
    message,
    error_id: errorId,
    timestamp: new Date().toISOString()
  };

  // 在非生产环境提供详细信息
  if (!isProduction) {
    if (details) responseData.details = details;
    if (error.stack) responseData.stack = error.stack;
  } else if (details && statusCode < 500) {
    // 生产环境只在客户端错误时提供详情
    responseData.details = details;
  }

  // 设置特殊头部信息
  res.set('X-Error-ID', errorId);
  
  // 发送错误响应
  res.status(statusCode).json(responseData);
};

/**
 * 404错误处理中间件
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 * @param {Function} next - Express下一个中间件函数
 */
const notFoundHandler = (req, res, next) => {
  const error = new Error(`路由 ${req.originalUrl} 不存在`);
  error.status = 404;
  next(error);
};

/**
 * 异步错误包装器
 * @param {Function} fn - 异步函数
 * @returns {Function} 包装后的函数
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * 优雅关闭处理
 */
const gracefulShutdown = () => {
  logger.info('开始优雅关闭服务器...');
  
  // 这里可以添加清理逻辑，如关闭数据库连接等
  process.exit(0);
};

// 监听进程信号
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// 监听未捕获的异常
process.on('uncaughtException', (error) => {
  logger.error('未捕获的异常', { error: error.message, stack: error.stack });
  process.exit(1);
});

// 监听未处理的Promise拒绝
process.on('unhandledRejection', (reason, promise) => {
  logger.error('未处理的Promise拒绝', { reason, promise });
  process.exit(1);
});

module.exports = {
  errorHandler,
  notFoundHandler,
  asyncHandler,
  BusinessError,
  ValidationError,
  DatabaseError
}; 