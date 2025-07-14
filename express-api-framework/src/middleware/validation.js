const Joi = require('joi');
const { ValidationError } = require('./errorHandler');

/**
 * 通用验证配置
 */
const DEFAULT_OPTIONS = {
  abortEarly: false, // 返回所有验证错误
  allowUnknown: false, // 不允许未知字段
  stripUnknown: true, // 移除未知字段
  convert: true, // 自动类型转换
  errors: {
    wrap: {
      label: '' // 去掉字段名的引号
    }
  }
};

/**
 * 自定义验证规则
 */
const customValidators = {
  /**
   * 手机号验证
   */
  phone: Joi.string()
    .pattern(/^1[3-9]\d{9}$/)
    .message('请输入有效的手机号码'),

  /**
   * 中文姓名验证
   */
  chineseName: Joi.string()
    .pattern(/^[\u4e00-\u9fa5]{2,10}$/)
    .message('姓名只能包含2-10个中文字符'),

  /**
   * 身份证号验证
   */
  idCard: Joi.string()
    .pattern(/(^\d{15}$)|(^\d{18}$)|(^\d{17}(\d|X|x)$)/)
    .message('请输入有效的身份证号码'),

  /**
   * 密码强度验证
   */
  strongPassword: Joi.string()
    .min(8)
    .max(20)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .message('密码必须包含大小写字母、数字和特殊字符，长度8-20位'),

  /**
   * 弱密码验证（仅长度要求）
   */
  weakPassword: Joi.string()
    .min(6)
    .max(20)
    .message('密码长度必须在6-20位之间'),

  /**
   * 用户名验证
   */
  username: Joi.string()
    .alphanum()
    .min(3)
    .max(20)
    .message('用户名只能包含字母和数字，长度3-20位'),

  /**
   * 邮箱验证
   */
  email: Joi.string()
    .email()
    .message('请输入有效的邮箱地址'),

  /**
   * 分页参数验证
   */
  pagination: {
    page: Joi.number().integer().min(1).default(1).message('页码必须是大于0的整数'),
    pageSize: Joi.number().integer().min(1).max(100).default(10).message('每页数量必须在1-100之间'),
    limit: Joi.number().integer().min(1).max(100).default(10).message('限制数量必须在1-100之间'),
    offset: Joi.number().integer().min(0).default(0).message('偏移量必须是非负整数')
  },

  /**
   * 排序参数验证
   */
  sort: {
    sortBy: Joi.string().default('id').message('排序字段必须是字符串'),
    sortOrder: Joi.string().valid('asc', 'desc', 'ASC', 'DESC').default('desc').message('排序方向只能是asc或desc')
  },

  /**
   * 搜索参数验证
   */
  search: {
    keyword: Joi.string().max(50).allow('').message('搜索关键词长度不能超过50个字符'),
    fields: Joi.array().items(Joi.string()).message('搜索字段必须是字符串数组')
  },

  /**
   * 日期范围验证
   */
  dateRange: {
    startDate: Joi.date().iso().message('开始日期格式不正确'),
    endDate: Joi.date().iso().min(Joi.ref('startDate')).message('结束日期必须大于等于开始日期')
  },

  /**
   * 文件验证
   */
  file: {
    filename: Joi.string().max(255).message('文件名长度不能超过255个字符'),
    size: Joi.number().max(10 * 1024 * 1024).message('文件大小不能超过10MB'),
    mimeType: Joi.string().valid(
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf', 'application/msword', 
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ).message('不支持的文件类型')
  },

  /**
   * MongoDB ObjectId验证
   */
  objectId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .message('无效的ID格式'),

  /**
   * URL验证
   */
  url: Joi.string()
    .uri({ scheme: ['http', 'https'] })
    .message('请输入有效的URL地址'),

  /**
   * 颜色值验证
   */
  color: Joi.string()
    .pattern(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/)
    .message('请输入有效的颜色值（如：#fff 或 #ffffff）'),

  /**
   * 版本号验证
   */
  version: Joi.string()
    .pattern(/^\d+\.\d+\.\d+$/)
    .message('版本号格式错误（如：1.0.0）')
};

/**
 * 创建验证中间件
 * @param {Object} schema - Joi验证模式
 * @param {string} source - 验证数据源：'body', 'query', 'params', 'headers'
 * @param {Object} options - 验证选项
 * @returns {Function} Express中间件函数
 */
const createValidator = (schema, source = 'body', options = {}) => {
  const validationOptions = { ...DEFAULT_OPTIONS, ...options };

  return (req, res, next) => {
    // 获取要验证的数据
    const data = req[source];
    
    // 执行验证
    const { error, value } = schema.validate(data, validationOptions);
    
    if (error) {
      // 格式化错误信息
      const details = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message.replace(/"/g, ''),
        value: detail.context?.value,
        type: detail.type
      }));
      
      const validationError = new ValidationError(
        `${source}参数验证失败`,
        details
      );
      
      return next(validationError);
    }
    
    // 将验证后的数据重新赋值
    req[source] = value;
    next();
  };
};

/**
 * 请求体验证中间件
 * @param {Object} schema - Joi验证模式
 * @param {Object} options - 验证选项
 * @returns {Function} Express中间件函数
 */
const validateBody = (schema, options = {}) => {
  return createValidator(schema, 'body', options);
};

/**
 * 查询参数验证中间件
 * @param {Object} schema - Joi验证模式
 * @param {Object} options - 验证选项
 * @returns {Function} Express中间件函数
 */
const validateQuery = (schema, options = {}) => {
  return createValidator(schema, 'query', options);
};

/**
 * 路径参数验证中间件
 * @param {Object} schema - Joi验证模式
 * @param {Object} options - 验证选项
 * @returns {Function} Express中间件函数
 */
const validateParams = (schema, options = {}) => {
  return createValidator(schema, 'params', options);
};

/**
 * 请求头验证中间件
 * @param {Object} schema - Joi验证模式
 * @param {Object} options - 验证选项
 * @returns {Function} Express中间件函数
 */
const validateHeaders = (schema, options = {}) => {
  return createValidator(schema, 'headers', options);
};

/**
 * 组合验证中间件
 * @param {Object} validators - 验证器对象
 * @param {Object} validators.body - 请求体验证器
 * @param {Object} validators.query - 查询参数验证器
 * @param {Object} validators.params - 路径参数验证器
 * @param {Object} validators.headers - 请求头验证器
 * @returns {Array} Express中间件数组
 */
const validate = (validators) => {
  const middlewares = [];
  
  if (validators.params) {
    middlewares.push(validateParams(validators.params));
  }
  
  if (validators.query) {
    middlewares.push(validateQuery(validators.query));
  }
  
  if (validators.body) {
    middlewares.push(validateBody(validators.body));
  }
  
  if (validators.headers) {
    middlewares.push(validateHeaders(validators.headers));
  }
  
  return middlewares;
};

/**
 * 通用分页验证中间件
 */
const validatePagination = validateQuery(Joi.object({
  page: customValidators.pagination.page,
  pageSize: customValidators.pagination.pageSize,
  sortBy: customValidators.sort.sortBy,
  sortOrder: customValidators.sort.sortOrder,
  keyword: customValidators.search.keyword.optional()
}));

/**
 * ID参数验证中间件
 */
const validateId = validateParams(Joi.object({
  id: Joi.number().integer().min(1).required().message('ID必须是有效的正整数')
}));

/**
 * 批量ID验证中间件
 */
const validateBatchIds = validateBody(Joi.object({
  ids: Joi.array()
    .items(Joi.number().integer().min(1))
    .min(1)
    .max(100)
    .required()
    .message('IDs必须是包含1-100个有效正整数的数组')
}));

/**
 * 文件上传验证中间件
 * @param {Object} options - 验证选项
 * @param {Array} options.allowedTypes - 允许的文件类型
 * @param {number} options.maxSize - 最大文件大小（字节）
 * @param {boolean} options.required - 是否必须上传文件
 * @returns {Function} Express中间件函数
 */
const validateFileUpload = (options = {}) => {
  const {
    allowedTypes = ['image/jpeg', 'image/png', 'image/gif'],
    maxSize = 5 * 1024 * 1024, // 5MB
    required = false
  } = options;

  return (req, res, next) => {
    const file = req.file;
    const files = req.files;

    // 检查是否存在文件
    if (required && !file && (!files || files.length === 0)) {
      return next(new ValidationError('请上传文件'));
    }

    // 如果没有文件且不是必须的，跳过验证
    if (!file && (!files || files.length === 0)) {
      return next();
    }

    // 验证单个文件
    const validateSingleFile = (fileObj) => {
      if (!allowedTypes.includes(fileObj.mimetype)) {
        throw new ValidationError(`不支持的文件类型：${fileObj.mimetype}`);
      }
      
      if (fileObj.size > maxSize) {
        throw new ValidationError(`文件大小超出限制：${Math.round(maxSize / 1024 / 1024)}MB`);
      }
    };

    try {
      // 验证单个文件
      if (file) {
        validateSingleFile(file);
      }

      // 验证多个文件
      if (files && Array.isArray(files)) {
        files.forEach(validateSingleFile);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * 条件验证中间件
 * @param {Function} condition - 条件函数
 * @param {Function} validator - 验证器中间件
 * @returns {Function} Express中间件函数
 */
const conditionalValidate = (condition, validator) => {
  return (req, res, next) => {
    if (condition(req)) {
      return validator(req, res, next);
    }
    next();
  };
};

module.exports = {
  // 基础验证函数
  validate,
  validateBody,
  validateQuery,
  validateParams,
  validateHeaders,
  
  // 通用验证中间件
  validatePagination,
  validateId,
  validateBatchIds,
  validateFileUpload,
  conditionalValidate,
  
  // 自定义验证器
  customValidators,
  
  // Joi实例（用于创建自定义验证）
  Joi
}; 