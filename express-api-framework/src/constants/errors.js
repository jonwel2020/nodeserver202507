/**
 * 错误代码常量定义
 * 统一管理系统错误码和错误消息
 */

// HTTP状态码相关错误
const HTTP_ERRORS = {
  // 400系列 - 客户端错误
  BAD_REQUEST: {
    code: 400,
    message: '请求参数错误'
  },
  UNAUTHORIZED: {
    code: 401,
    message: '未授权访问'
  },
  FORBIDDEN: {
    code: 403,
    message: '权限不足'
  },
  NOT_FOUND: {
    code: 404,
    message: '资源不存在'
  },
  METHOD_NOT_ALLOWED: {
    code: 405,
    message: '请求方法不被允许'
  },
  CONFLICT: {
    code: 409,
    message: '数据冲突'
  },
  UNPROCESSABLE_ENTITY: {
    code: 422,
    message: '请求格式正确，但语义错误'
  },
  TOO_MANY_REQUESTS: {
    code: 429,
    message: '请求过于频繁'
  },

  // 500系列 - 服务器错误
  INTERNAL_SERVER_ERROR: {
    code: 500,
    message: '服务器内部错误'
  },
  NOT_IMPLEMENTED: {
    code: 501,
    message: '功能未实现'
  },
  BAD_GATEWAY: {
    code: 502,
    message: '网关错误'
  },
  SERVICE_UNAVAILABLE: {
    code: 503,
    message: '服务不可用'
  },
  GATEWAY_TIMEOUT: {
    code: 504,
    message: '网关超时'
  }
};

// 业务逻辑错误（6xx系列）
const BUSINESS_ERRORS = {
  // 600系列 - 通用业务错误
  BUSINESS_ERROR: {
    code: 600,
    message: '业务逻辑错误'
  },
  VALIDATION_ERROR: {
    code: 601,
    message: '数据验证失败'
  },
  DATABASE_ERROR: {
    code: 602,
    message: '数据库操作失败'
  },
  CACHE_ERROR: {
    code: 603,
    message: '缓存操作失败'
  },
  EXTERNAL_API_ERROR: {
    code: 604,
    message: '外部API调用失败'
  },
  FILE_OPERATION_ERROR: {
    code: 605,
    message: '文件操作失败'
  },

  // 610系列 - 认证授权错误
  TOKEN_INVALID: {
    code: 610,
    message: '令牌无效'
  },
  TOKEN_EXPIRED: {
    code: 611,
    message: '令牌已过期'
  },
  REFRESH_TOKEN_INVALID: {
    code: 612,
    message: '刷新令牌无效'
  },
  LOGIN_FAILED: {
    code: 613,
    message: '登录失败'
  },
  ACCOUNT_LOCKED: {
    code: 614,
    message: '账户已被锁定'
  },
  PASSWORD_INCORRECT: {
    code: 615,
    message: '密码错误'
  },
  ACCOUNT_DISABLED: {
    code: 616,
    message: '账户已禁用'
  },
  PERMISSION_DENIED: {
    code: 617,
    message: '权限不足'
  },
  SESSION_EXPIRED: {
    code: 618,
    message: '会话已过期'
  },

  // 620系列 - 用户相关错误
  USER_NOT_FOUND: {
    code: 620,
    message: '用户不存在'
  },
  USER_ALREADY_EXISTS: {
    code: 621,
    message: '用户已存在'
  },
  EMAIL_ALREADY_EXISTS: {
    code: 622,
    message: '邮箱已被注册'
  },
  PHONE_ALREADY_EXISTS: {
    code: 623,
    message: '手机号已被注册'
  },
  USERNAME_ALREADY_EXISTS: {
    code: 624,
    message: '用户名已存在'
  },
  WEAK_PASSWORD: {
    code: 625,
    message: '密码强度不足'
  },
  OLD_PASSWORD_INCORRECT: {
    code: 626,
    message: '原密码错误'
  },
  USER_PROFILE_INCOMPLETE: {
    code: 627,
    message: '用户资料不完整'
  },

  // 630系列 - 验证码相关错误
  CAPTCHA_INVALID: {
    code: 630,
    message: '验证码无效'
  },
  CAPTCHA_EXPIRED: {
    code: 631,
    message: '验证码已过期'
  },
  CAPTCHA_SEND_FAILED: {
    code: 632,
    message: '验证码发送失败'
  },
  CAPTCHA_TOO_FREQUENT: {
    code: 633,
    message: '验证码发送过于频繁'
  },
  CAPTCHA_VERIFY_FAILED: {
    code: 634,
    message: '验证码验证失败'
  },

  // 640系列 - 数据相关错误
  DATA_NOT_FOUND: {
    code: 640,
    message: '数据不存在'
  },
  DATA_ALREADY_EXISTS: {
    code: 641,
    message: '数据已存在'
  },
  DATA_FORMAT_ERROR: {
    code: 642,
    message: '数据格式错误'
  },
  DATA_TOO_LARGE: {
    code: 643,
    message: '数据过大'
  },
  DATA_INTEGRITY_ERROR: {
    code: 644,
    message: '数据完整性错误'
  },
  FOREIGN_KEY_CONSTRAINT: {
    code: 645,
    message: '外键约束错误'
  },
  UNIQUE_CONSTRAINT: {
    code: 646,
    message: '唯一约束错误'
  },

  // 650系列 - 文件上传相关错误
  FILE_NOT_FOUND: {
    code: 650,
    message: '文件不存在'
  },
  FILE_TOO_LARGE: {
    code: 651,
    message: '文件过大'
  },
  FILE_TYPE_NOT_ALLOWED: {
    code: 652,
    message: '文件类型不被允许'
  },
  FILE_UPLOAD_FAILED: {
    code: 653,
    message: '文件上传失败'
  },
  FILE_DELETE_FAILED: {
    code: 654,
    message: '文件删除失败'
  },
  STORAGE_QUOTA_EXCEEDED: {
    code: 655,
    message: '存储配额已满'
  },

  // 660系列 - 支付相关错误
  PAYMENT_FAILED: {
    code: 660,
    message: '支付失败'
  },
  INSUFFICIENT_BALANCE: {
    code: 661,
    message: '余额不足'
  },
  PAYMENT_METHOD_INVALID: {
    code: 662,
    message: '支付方式无效'
  },
  ORDER_NOT_FOUND: {
    code: 663,
    message: '订单不存在'
  },
  ORDER_STATUS_INVALID: {
    code: 664,
    message: '订单状态无效'
  },

  // 670系列 - 通知相关错误
  NOTIFICATION_SEND_FAILED: {
    code: 670,
    message: '通知发送失败'
  },
  EMAIL_SEND_FAILED: {
    code: 671,
    message: '邮件发送失败'
  },
  SMS_SEND_FAILED: {
    code: 672,
    message: '短信发送失败'
  },
  PUSH_NOTIFICATION_FAILED: {
    code: 673,
    message: '推送通知失败'
  },

  // 680系列 - 限流和频控错误
  RATE_LIMIT_EXCEEDED: {
    code: 680,
    message: '请求频率超限'
  },
  CONCURRENT_LIMIT_EXCEEDED: {
    code: 681,
    message: '并发请求超限'
  },
  QUOTA_EXCEEDED: {
    code: 682,
    message: '配额已用完'
  },
  OPERATION_TOO_FREQUENT: {
    code: 683,
    message: '操作过于频繁'
  },

  // 690系列 - 第三方服务错误
  WECHAT_API_ERROR: {
    code: 690,
    message: '微信API调用失败'
  },
  ALIPAY_API_ERROR: {
    code: 691,
    message: '支付宝API调用失败'
  },
  SMS_PROVIDER_ERROR: {
    code: 692,
    message: '短信服务商错误'
  },
  EMAIL_PROVIDER_ERROR: {
    code: 693,
    message: '邮件服务商错误'
  },
  OSS_SERVICE_ERROR: {
    code: 694,
    message: '对象存储服务错误'
  }
};

// 验证错误详细信息
const VALIDATION_ERRORS = {
  REQUIRED_FIELD: '必填字段不能为空',
  INVALID_EMAIL: '邮箱格式不正确',
  INVALID_PHONE: '手机号格式不正确',
  INVALID_PASSWORD: '密码格式不正确',
  PASSWORD_TOO_SHORT: '密码长度不能少于8位',
  PASSWORD_TOO_WEAK: '密码强度不足，需要包含大小写字母、数字和特殊字符',
  INVALID_URL: 'URL格式不正确',
  INVALID_DATE: '日期格式不正确',
  INVALID_NUMBER: '数字格式不正确',
  VALUE_TOO_LONG: '值长度超出限制',
  VALUE_TOO_SHORT: '值长度不足',
  INVALID_ENUM: '值不在允许的范围内',
  INVALID_JSON: 'JSON格式不正确',
  INVALID_UUID: 'UUID格式不正确'
};

// 数据库错误映射
const DATABASE_ERRORS = {
  CONNECTION_FAILED: '数据库连接失败',
  QUERY_TIMEOUT: '查询超时',
  DUPLICATE_ENTRY: '重复记录',
  FOREIGN_KEY_VIOLATION: '外键约束违反',
  NOT_NULL_VIOLATION: '非空约束违反',
  CHECK_VIOLATION: '检查约束违反',
  SERIALIZATION_FAILURE: '序列化失败',
  DEADLOCK_DETECTED: '检测到死锁',
  TRANSACTION_ROLLBACK: '事务回滚'
};

/**
 * 根据错误代码获取错误信息
 * @param {number} code - 错误代码
 * @returns {Object} 错误信息
 */
function getErrorByCode(code) {
  // 先查找HTTP错误
  for (const [key, error] of Object.entries(HTTP_ERRORS)) {
    if (error.code === code) {
      return { ...error, type: 'HTTP_ERROR', key };
    }
  }

  // 再查找业务错误
  for (const [key, error] of Object.entries(BUSINESS_ERRORS)) {
    if (error.code === code) {
      return { ...error, type: 'BUSINESS_ERROR', key };
    }
  }

  // 默认错误
  return {
    code: 500,
    message: '未知错误',
    type: 'UNKNOWN_ERROR',
    key: 'UNKNOWN'
  };
}

/**
 * 创建自定义错误类
 */
class CustomError extends Error {
  constructor(errorInfo, details = null) {
    super(errorInfo.message);
    this.name = 'CustomError';
    this.code = errorInfo.code;
    this.type = errorInfo.type || 'BUSINESS_ERROR';
    this.details = details;
    this.timestamp = new Date().toISOString();
  }
}

/**
 * 创建HTTP错误
 * @param {string} errorKey - 错误键名
 * @param {*} details - 错误详情
 * @returns {CustomError}
 */
function createHttpError(errorKey, details = null) {
  const errorInfo = HTTP_ERRORS[errorKey];
  if (!errorInfo) {
    throw new Error(`未知的HTTP错误类型: ${errorKey}`);
  }
  return new CustomError(errorInfo, details);
}

/**
 * 创建业务错误
 * @param {string} errorKey - 错误键名
 * @param {*} details - 错误详情
 * @returns {CustomError}
 */
function createBusinessError(errorKey, details = null) {
  const errorInfo = BUSINESS_ERRORS[errorKey];
  if (!errorInfo) {
    throw new Error(`未知的业务错误类型: ${errorKey}`);
  }
  return new CustomError(errorInfo, details);
}

/**
 * 创建验证错误
 * @param {string} field - 字段名
 * @param {string} rule - 验证规则
 * @param {*} value - 字段值
 * @returns {CustomError}
 */
function createValidationError(field, rule, value = null) {
  const message = VALIDATION_ERRORS[rule] || '数据验证失败';
  const errorInfo = {
    ...BUSINESS_ERRORS.VALIDATION_ERROR,
    message: `${field}: ${message}`
  };
  
  return new CustomError(errorInfo, {
    field,
    rule,
    value,
    message
  });
}

module.exports = {
  HTTP_ERRORS,
  BUSINESS_ERRORS,
  VALIDATION_ERRORS,
  DATABASE_ERRORS,
  CustomError,
  getErrorByCode,
  createHttpError,
  createBusinessError,
  createValidationError
}; 