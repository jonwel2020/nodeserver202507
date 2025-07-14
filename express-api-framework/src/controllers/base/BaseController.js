/**
 * 控制器层基类
 * 提供统一的响应格式、参数验证、分页逻辑、错误处理等功能
 * 所有Controller类都应该继承此基类
 * 
 * @author 系统
 * @since 1.0.0
 */

const { logger } = require('../../config');
const { CustomError, VALIDATION_ERRORS, AUTH_ERRORS } = require('../../constants/errors');

class BaseController {
  /**
   * 构造函数
   * @param {BaseService} service - 对应的Service实例
   * @param {Object} options - 控制器选项
   */
  constructor(service, options = {}) {
    this.service = service;
    this.options = {
      enablePagination: options.enablePagination !== false, // 默认启用分页
      defaultPageSize: options.defaultPageSize || 10,
      maxPageSize: options.maxPageSize || 100,
      enableValidation: options.enableValidation !== false, // 默认启用验证
      logRequests: options.logRequests !== false, // 默认记录请求日志
      ...options
    };

    // 绑定方法到实例，确保this指向正确
    this.handleRequest = this.handleRequest.bind(this);
    this.validateParams = this.validateParams.bind(this);
    this.extractPaginationParams = this.extractPaginationParams.bind(this);
    this.extractSortParams = this.extractSortParams.bind(this);
  }

  /**
   * 统一请求处理装饰器
   * @param {Function} handler - 处理函数
   * @param {Object} options - 处理选项
   * @returns {Function} Express中间件函数
   */
  handleRequest(handler, options = {}) {
    return async (req, res, next) => {
      const startTime = Date.now();
      const requestId = req.id || Date.now() + Math.random();
      
      try {
        // 记录请求日志
        if (this.options.logRequests) {
          logger.info('请求开始:', {
            requestId,
            method: req.method,
            url: req.originalUrl,
            userAgent: req.get('User-Agent'),
            ip: req.ip,
            userId: req.user?.id || null
          });
        }

        // 参数验证
        if (options.validate && this.options.enableValidation) {
          await this.validateParams(req, options.validate);
        }

        // 权限检查
        if (options.requireAuth && !req.user) {
          throw new CustomError('用户未登录', AUTH_ERRORS.TOKEN_REQUIRED.code);
        }

        // 执行业务逻辑
        const result = await handler.call(this, req, res, next);
        
        // 如果处理函数没有发送响应，则发送成功响应
        if (result !== undefined && !res.headersSent) {
          res.success(result);
        }

        // 记录成功日志
        const duration = Date.now() - startTime;
        if (this.options.logRequests) {
          logger.info('请求完成:', {
            requestId,
            duration: `${duration}ms`,
            statusCode: res.statusCode
          });
        }
      } catch (error) {
        const duration = Date.now() - startTime;
        
        // 记录错误日志
        logger.error('请求处理失败:', {
          requestId,
          method: req.method,
          url: req.originalUrl,
          error: error.message,
          stack: error.stack,
          duration: `${duration}ms`,
          userId: req.user?.id || null
        });

        // 发送错误响应
        if (!res.headersSent) {
          if (error instanceof CustomError) {
            res.error(error.message, error.code);
          } else {
            res.error('服务器内部错误', 500);
          }
        }
      }
    };
  }

  /**
   * 参数验证
   * @param {Object} req - 请求对象
   * @param {Object} rules - 验证规则
   * @returns {Promise<void>}
   */
  async validateParams(req, rules = {}) {
    const errors = [];

    // 验证路径参数
    if (rules.params) {
      const paramErrors = this.validateObject(req.params, rules.params, 'params');
      errors.push(...paramErrors);
    }

    // 验证查询参数
    if (rules.query) {
      const queryErrors = this.validateObject(req.query, rules.query, 'query');
      errors.push(...queryErrors);
    }

    // 验证请求体
    if (rules.body) {
      const bodyErrors = this.validateObject(req.body, rules.body, 'body');
      errors.push(...bodyErrors);
    }

    // 验证文件上传
    if (rules.files && req.files) {
      const fileErrors = this.validateFiles(req.files, rules.files);
      errors.push(...fileErrors);
    }

    if (errors.length > 0) {
      throw new CustomError(`参数验证失败: ${errors.join(', ')}`, VALIDATION_ERRORS.VALIDATION_FAILED.code);
    }
  }

  /**
   * 验证对象
   * @param {Object} obj - 要验证的对象
   * @param {Object} rules - 验证规则
   * @param {string} source - 数据来源（params, query, body）
   * @returns {Array<string>} 错误信息数组
   */
  validateObject(obj, rules, source) {
    const errors = [];

    // 检查必填字段
    if (rules.required && Array.isArray(rules.required)) {
      for (const field of rules.required) {
        if (obj[field] === undefined || obj[field] === null || obj[field] === '') {
          errors.push(`${source}.${field} 是必填的`);
        }
      }
    }

    // 检查字段类型
    if (rules.types) {
      for (const [field, expectedType] of Object.entries(rules.types)) {
        if (obj[field] !== undefined) {
          const actualType = typeof obj[field];
          if (actualType !== expectedType) {
            errors.push(`${source}.${field} 类型错误，期望 ${expectedType}，实际 ${actualType}`);
          }
        }
      }
    }

    // 检查字段长度
    if (rules.minLength) {
      for (const [field, minLen] of Object.entries(rules.minLength)) {
        if (obj[field] && typeof obj[field] === 'string' && obj[field].length < minLen) {
          errors.push(`${source}.${field} 长度不能少于 ${minLen} 个字符`);
        }
      }
    }

    if (rules.maxLength) {
      for (const [field, maxLen] of Object.entries(rules.maxLength)) {
        if (obj[field] && typeof obj[field] === 'string' && obj[field].length > maxLen) {
          errors.push(`${source}.${field} 长度不能超过 ${maxLen} 个字符`);
        }
      }
    }

    // 检查数值范围
    if (rules.min) {
      for (const [field, minVal] of Object.entries(rules.min)) {
        if (obj[field] !== undefined) {
          const numVal = Number(obj[field]);
          if (!isNaN(numVal) && numVal < minVal) {
            errors.push(`${source}.${field} 不能小于 ${minVal}`);
          }
        }
      }
    }

    if (rules.max) {
      for (const [field, maxVal] of Object.entries(rules.max)) {
        if (obj[field] !== undefined) {
          const numVal = Number(obj[field]);
          if (!isNaN(numVal) && numVal > maxVal) {
            errors.push(`${source}.${field} 不能大于 ${maxVal}`);
          }
        }
      }
    }

    // 检查正则表达式
    if (rules.patterns) {
      for (const [field, pattern] of Object.entries(rules.patterns)) {
        if (obj[field] && typeof obj[field] === 'string') {
          const regex = new RegExp(pattern);
          if (!regex.test(obj[field])) {
            errors.push(`${source}.${field} 格式不正确`);
          }
        }
      }
    }

    // 检查枚举值
    if (rules.enums) {
      for (const [field, enumValues] of Object.entries(rules.enums)) {
        if (obj[field] !== undefined && !enumValues.includes(obj[field])) {
          errors.push(`${source}.${field} 必须是以下值之一: ${enumValues.join(', ')}`);
        }
      }
    }

    return errors;
  }

  /**
   * 验证文件上传
   * @param {Object} files - 上传的文件
   * @param {Object} rules - 文件验证规则
   * @returns {Array<string>} 错误信息数组
   */
  validateFiles(files, rules) {
    const errors = [];

    if (rules.required && Array.isArray(rules.required)) {
      for (const field of rules.required) {
        if (!files[field] || files[field].length === 0) {
          errors.push(`文件 ${field} 是必需的`);
        }
      }
    }

    if (rules.maxSize) {
      for (const [field, maxSize] of Object.entries(rules.maxSize)) {
        if (files[field]) {
          const fileArray = Array.isArray(files[field]) ? files[field] : [files[field]];
          for (const file of fileArray) {
            if (file.size > maxSize) {
              errors.push(`文件 ${field} 大小不能超过 ${Math.round(maxSize / 1024 / 1024)}MB`);
            }
          }
        }
      }
    }

    if (rules.allowedTypes) {
      for (const [field, allowedTypes] of Object.entries(rules.allowedTypes)) {
        if (files[field]) {
          const fileArray = Array.isArray(files[field]) ? files[field] : [files[field]];
          for (const file of fileArray) {
            const fileType = file.mimetype.toLowerCase();
            if (!allowedTypes.includes(fileType)) {
              errors.push(`文件 ${field} 类型不支持，支持的类型: ${allowedTypes.join(', ')}`);
            }
          }
        }
      }
    }

    return errors;
  }

  /**
   * 提取分页参数
   * @param {Object} req - 请求对象
   * @returns {Object} 分页参数
   */
  extractPaginationParams(req) {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    let pageSize = parseInt(req.query.pageSize) || this.options.defaultPageSize;
    
    // 限制分页大小
    pageSize = Math.min(pageSize, this.options.maxPageSize);
    pageSize = Math.max(1, pageSize);

    return { page, pageSize };
  }

  /**
   * 提取排序参数
   * @param {Object} req - 请求对象
   * @param {Array<string>} allowedFields - 允许排序的字段
   * @returns {string|null} 排序字符串
   */
  extractSortParams(req, allowedFields = []) {
    const { sortBy, sortOrder } = req.query;
    
    if (!sortBy) {
      return null;
    }

    // 检查字段是否被允许
    if (allowedFields.length > 0 && !allowedFields.includes(sortBy)) {
      throw new CustomError(`不支持按 ${sortBy} 字段排序`, VALIDATION_ERRORS.INVALID_SORT_FIELD.code);
    }

    const order = sortOrder?.toLowerCase() === 'desc' ? 'DESC' : 'ASC';
    return `${sortBy} ${order}`;
  }

  /**
   * 提取查询条件
   * @param {Object} req - 请求对象
   * @param {Array<string>} allowedFields - 允许查询的字段
   * @returns {Object} 查询条件
   */
  extractQueryConditions(req, allowedFields = []) {
    const conditions = {};
    const { query } = req;

    // 基础查询字段
    const queryFields = ['keyword', 'status', 'type', 'category'];
    
    for (const field of queryFields) {
      if (query[field] && (allowedFields.length === 0 || allowedFields.includes(field))) {
        conditions[field] = query[field];
      }
    }

    // 范围查询 (例如: created_at_start, created_at_end)
    const rangeFields = ['created_at', 'updated_at'];
    for (const field of rangeFields) {
      const startKey = `${field}_start`;
      const endKey = `${field}_end`;
      
      if (query[startKey] || query[endKey]) {
        if (allowedFields.length === 0 || allowedFields.includes(field)) {
          const rangeCondition = {};
          
          if (query[startKey]) {
            rangeCondition.operator = '>=';
            rangeCondition.value = query[startKey];
          }
          
          if (query[endKey]) {
            rangeCondition.operator = query[startKey] ? 'BETWEEN' : '<=';
            rangeCondition.value = query[startKey] ? [query[startKey], query[endKey]] : query[endKey];
          }
          
          conditions[field] = rangeCondition;
        }
      }
    }

    return conditions;
  }

  /**
   * 检查用户权限
   * @param {Object} req - 请求对象
   * @param {string|Array<string>} requiredPermissions - 需要的权限
   * @returns {boolean} 是否有权限
   */
  checkPermission(req, requiredPermissions) {
    if (!req.user) {
      return false;
    }

    const userPermissions = req.user.permissions || [];
    const required = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions];

    return required.some(permission => userPermissions.includes(permission));
  }

  /**
   * 检查资源所有权
   * @param {Object} req - 请求对象
   * @param {Object} resource - 资源对象
   * @param {string} ownerField - 所有者字段名，默认为'user_id'
   * @returns {boolean} 是否拥有资源
   */
  checkOwnership(req, resource, ownerField = 'user_id') {
    if (!req.user || !resource) {
      return false;
    }

    return resource[ownerField] === req.user.id;
  }

  /**
   * 生成标准的CRUD控制器方法
   * @returns {Object} CRUD方法对象
   */
  generateCrudMethods() {
    return {
      // 获取列表（分页）
      index: this.handleRequest(async (req) => {
        const pagination = this.extractPaginationParams(req);
        const sortBy = this.extractSortParams(req);
        const conditions = this.extractQueryConditions(req);

        return await this.service.paginate({
          ...pagination,
          conditions,
          orderBy: sortBy
        });
      }),

      // 获取单个资源
      show: this.handleRequest(async (req) => {
        const { id } = req.params;
        const entity = await this.service.findById(id);
        
        if (!entity) {
          throw new CustomError('资源不存在', 404);
        }

        return entity;
      }, {
        validate: {
          params: {
            required: ['id'],
            types: { id: 'string' }
          }
        }
      }),

      // 创建资源
      create: this.handleRequest(async (req) => {
        const data = req.body;
        
        // 如果是用户相关的资源，自动添加用户ID
        if (req.user && !data.user_id) {
          data.user_id = req.user.id;
        }

        return await this.service.create(data);
      }, {
        requireAuth: true,
        validate: {
          body: {
            required: [] // 由子类具体定义
          }
        }
      }),

      // 更新资源
      update: this.handleRequest(async (req) => {
        const { id } = req.params;
        const data = req.body;

        // 检查资源是否存在
        const existing = await this.service.findById(id);
        if (!existing) {
          throw new CustomError('资源不存在', 404);
        }

        // 检查权限（所有者或管理员）
        if (!this.checkOwnership(req, existing) && !this.checkPermission(req, 'admin')) {
          throw new CustomError('没有权限修改此资源', 403);
        }

        return await this.service.update(id, data);
      }, {
        requireAuth: true,
        validate: {
          params: {
            required: ['id'],
            types: { id: 'string' }
          }
        }
      }),

      // 删除资源
      destroy: this.handleRequest(async (req) => {
        const { id } = req.params;

        // 检查资源是否存在
        const existing = await this.service.findById(id);
        if (!existing) {
          throw new CustomError('资源不存在', 404);
        }

        // 检查权限（所有者或管理员）
        if (!this.checkOwnership(req, existing) && !this.checkPermission(req, 'admin')) {
          throw new CustomError('没有权限删除此资源', 403);
        }

        const success = await this.service.delete(id);
        return { success, message: '删除成功' };
      }, {
        requireAuth: true,
        validate: {
          params: {
            required: ['id'],
            types: { id: 'string' }
          }
        }
      }),

      // 批量删除
      batchDestroy: this.handleRequest(async (req) => {
        const { ids } = req.body;

        if (!Array.isArray(ids) || ids.length === 0) {
          throw new CustomError('请提供要删除的ID列表', VALIDATION_ERRORS.INVALID_INPUT.code);
        }

        // 检查权限
        if (!this.checkPermission(req, 'admin')) {
          throw new CustomError('没有权限执行批量删除', 403);
        }

        const results = await this.service.batchOperation('delete', ids);
        const successCount = results.filter(r => !r.error).length;
        
        return {
          total: ids.length,
          success: successCount,
          failed: ids.length - successCount,
          message: `批量删除完成，成功: ${successCount}，失败: ${ids.length - successCount}`
        };
      }, {
        requireAuth: true,
        validate: {
          body: {
            required: ['ids'],
            types: { ids: 'object' }
          }
        }
      })
    };
  }

  /**
   * 处理文件上传
   * @param {Object} req - 请求对象
   * @param {string} fieldName - 文件字段名
   * @param {Object} options - 上传选项
   * @returns {Promise<Object>} 上传结果
   */
  async handleFileUpload(req, fieldName = 'file', options = {}) {
    const file = req.files?.[fieldName];
    
    if (!file) {
      throw new CustomError(`文件 ${fieldName} 是必需的`, VALIDATION_ERRORS.MISSING_REQUIRED_FIELD.code);
    }

    // 这里可以集成文件上传服务
    // 暂时返回文件信息
    return {
      filename: file.filename,
      originalName: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      url: `/uploads/${file.filename}`
    };
  }

  /**
   * 统计信息控制器
   * @returns {Function} Express中间件函数
   */
  getStatistics() {
    return this.handleRequest(async (req) => {
      if (!this.checkPermission(req, 'admin')) {
        throw new CustomError('没有权限查看统计信息', 403);
      }

      return await this.service.getStatistics();
    }, {
      requireAuth: true
    });
  }

  /**
   * 健康检查
   * @returns {Function} Express中间件函数
   */
  healthCheck() {
    return this.handleRequest(async () => {
      return {
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: this.service.constructor.name
      };
    });
  }

  /**
   * 清理资源
   * @returns {Promise<void>}
   */
  async cleanup() {
    try {
      if (this.service && typeof this.service.cleanup === 'function') {
        await this.service.cleanup();
      }
      
      logger.info('Controller资源清理完成');
    } catch (error) {
      logger.error('Controller资源清理失败:', error);
    }
  }
}

module.exports = BaseController; 