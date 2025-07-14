/**
 * 业务逻辑层基类
 * 提供通用的业务逻辑、缓存管理、事务处理等功能
 * 所有Service类都应该继承此基类
 * 
 * @author 系统
 * @since 1.0.0
 */

const { logger } = require('../../config');
const { cache } = require('../../utils/cache');
const { CustomError, BUSINESS_ERRORS, VALIDATION_ERRORS } = require('../../constants/errors');

class BaseService {
  /**
   * 构造函数
   * @param {BaseRepository} repository - 对应的Repository实例
   * @param {Object} options - 服务选项
   */
  constructor(repository, options = {}) {
    this.repository = repository;
    this.options = {
      enableCache: options.enableCache !== false, // 默认启用缓存
      cacheTimeout: options.cacheTimeout || 3600, // 缓存过期时间（秒）
      cachePrefix: options.cachePrefix || `${repository.tableName}:`,
      validateInput: options.validateInput !== false, // 默认启用输入验证
      ...options
    };
    
    this.activeTransactions = new Set(); // 跟踪活跃事务
  }

  /**
   * 生成缓存键
   * @param {string} key - 缓存键
   * @param {*} identifier - 标识符（如ID）
   * @returns {string}
   */
  getCacheKey(key, identifier = '') {
    return `${this.options.cachePrefix}${key}${identifier ? ':' + identifier : ''}`;
  }

  /**
   * 从缓存获取数据
   * @param {string} key - 缓存键
   * @param {*} identifier - 标识符
   * @returns {Promise<*>} 缓存的数据
   */
  async getFromCache(key, identifier = '') {
    if (!this.options.enableCache) {
      return null;
    }

    try {
      const cacheKey = this.getCacheKey(key, identifier);
      const cached = await cache.get(cacheKey);
      
      if (cached) {
        logger.debug(`缓存命中 - Key: ${cacheKey}`);
        return cached;
      }
      
      return null;
    } catch (error) {
      logger.warn('缓存读取失败:', error);
      return null;
    }
  }

  /**
   * 设置缓存数据
   * @param {string} key - 缓存键
   * @param {*} data - 要缓存的数据
   * @param {*} identifier - 标识符
   * @param {number} timeout - 过期时间（秒）
   * @returns {Promise<boolean>}
   */
  async setCache(key, data, identifier = '', timeout = null) {
    if (!this.options.enableCache || !data) {
      return false;
    }

    try {
      const cacheKey = this.getCacheKey(key, identifier);
      const expireTime = timeout || this.options.cacheTimeout;
      
      await cache.set(cacheKey, data, expireTime);
      logger.debug(`缓存设置成功 - Key: ${cacheKey}, Expire: ${expireTime}s`);
      return true;
    } catch (error) {
      logger.warn('缓存设置失败:', error);
      return false;
    }
  }

  /**
   * 删除缓存
   * @param {string} key - 缓存键
   * @param {*} identifier - 标识符
   * @returns {Promise<boolean>}
   */
  async deleteCache(key, identifier = '') {
    if (!this.options.enableCache) {
      return false;
    }

    try {
      const cacheKey = this.getCacheKey(key, identifier);
      await cache.delete(cacheKey);
      logger.debug(`缓存删除成功 - Key: ${cacheKey}`);
      return true;
    } catch (error) {
      logger.warn('缓存删除失败:', error);
      return false;
    }
  }

  /**
   * 清除相关缓存
   * @param {Array<string>} patterns - 缓存键模式数组
   * @returns {Promise<void>}
   */
  async clearRelatedCache(patterns = []) {
    if (!this.options.enableCache) {
      return;
    }

    try {
      // 默认清除实体相关的缓存
      const defaultPatterns = [
        `${this.options.cachePrefix}list:*`,
        `${this.options.cachePrefix}count:*`,
        `${this.options.cachePrefix}paginate:*`
      ];

      const allPatterns = [...defaultPatterns, ...patterns];
      
      for (const pattern of allPatterns) {
        await cache.deletePattern(pattern);
      }
      
      logger.debug(`相关缓存清除完成 - 模式: ${allPatterns.join(', ')}`);
    } catch (error) {
      logger.warn('清除相关缓存失败:', error);
    }
  }

  /**
   * 输入数据验证
   * @param {*} data - 要验证的数据
   * @param {Object} rules - 验证规则
   * @param {string} operation - 操作类型（create, update等）
   * @returns {Promise<*>} 验证后的数据
   */
  async validateInput(data, rules = {}, operation = 'create') {
    if (!this.options.validateInput) {
      return data;
    }

    try {
      // 这里可以集成Joi或其他验证库
      // 基础验证逻辑
      if (!data || typeof data !== 'object') {
        throw new CustomError('无效的输入数据', VALIDATION_ERRORS.INVALID_INPUT.code);
      }

      // 检查必填字段
      if (rules.required && Array.isArray(rules.required)) {
        for (const field of rules.required) {
          if (operation === 'create' && (data[field] === undefined || data[field] === null || data[field] === '')) {
            throw new CustomError(`字段 ${field} 是必填的`, VALIDATION_ERRORS.MISSING_REQUIRED_FIELD.code);
          }
        }
      }

      // 检查字段长度
      if (rules.maxLength) {
        for (const [field, maxLen] of Object.entries(rules.maxLength)) {
          if (data[field] && typeof data[field] === 'string' && data[field].length > maxLen) {
            throw new CustomError(`字段 ${field} 长度不能超过 ${maxLen} 个字符`, VALIDATION_ERRORS.INVALID_LENGTH.code);
          }
        }
      }

      // 检查数据类型
      if (rules.types) {
        for (const [field, expectedType] of Object.entries(rules.types)) {
          if (data[field] !== undefined && typeof data[field] !== expectedType) {
            throw new CustomError(`字段 ${field} 类型错误，期望 ${expectedType}`, VALIDATION_ERRORS.INVALID_TYPE.code);
          }
        }
      }

      return data;
    } catch (error) {
      logger.warn('输入验证失败:', { data, rules, error: error.message });
      throw error;
    }
  }

  /**
   * 执行事务操作
   * @param {Function} operation - 事务操作函数
   * @param {Object} options - 事务选项
   * @returns {Promise<*>} 操作结果
   */
  async executeTransaction(operation, options = {}) {
    const transactionId = Date.now() + Math.random();
    this.activeTransactions.add(transactionId);

    try {
      logger.info(`事务开始 - ID: ${transactionId}`);
      
      await this.repository.beginTransaction();
      const result = await operation();
      await this.repository.commitTransaction();
      
      logger.info(`事务提交成功 - ID: ${transactionId}`);
      
      // 清除相关缓存
      if (options.clearCache !== false) {
        await this.clearRelatedCache(options.cachePatterns);
      }
      
      return result;
    } catch (error) {
      logger.error(`事务回滚 - ID: ${transactionId}:`, error);
      await this.repository.rollbackTransaction();
      throw error;
    } finally {
      this.activeTransactions.delete(transactionId);
    }
  }

  /**
   * 根据ID获取单个实体（带缓存）
   * @param {number|string} id - 实体ID
   * @param {Object} options - 选项
   * @returns {Promise<Object|null>}
   */
  async findById(id, options = {}) {
    const { useCache = true, fields = ['*'] } = options;
    
    // 参数验证
    if (!id) {
      throw new CustomError('ID不能为空', VALIDATION_ERRORS.MISSING_REQUIRED_FIELD.code);
    }

    // 尝试从缓存获取
    if (useCache) {
      const cached = await this.getFromCache('entity', id);
      if (cached) {
        return cached;
      }
    }

    try {
      const entity = await this.repository.findById(id, fields);
      
      if (!entity) {
        return null;
      }

      // 缓存结果
      if (useCache) {
        await this.setCache('entity', entity, id);
      }

      return entity;
    } catch (error) {
      logger.error(`获取实体失败 - ID: ${id}:`, error);
      throw new CustomError(BUSINESS_ERRORS.OPERATION_FAILED.message, BUSINESS_ERRORS.OPERATION_FAILED.code);
    }
  }

  /**
   * 分页查询（带缓存）
   * @param {Object} options - 查询选项
   * @returns {Promise<Object>}
   */
  async paginate(options = {}) {
    const {
      page = 1,
      pageSize = 10,
      conditions = {},
      fields = ['*'],
      orderBy = null,
      useCache = true
    } = options;

    // 参数验证
    if (page < 1 || pageSize < 1 || pageSize > 100) {
      throw new CustomError('分页参数无效', VALIDATION_ERRORS.INVALID_PAGINATION.code);
    }

    // 生成缓存键
    const cacheKey = `paginate:${JSON.stringify({ page, pageSize, conditions, fields, orderBy })}`;
    
    // 尝试从缓存获取
    if (useCache) {
      const cached = await this.getFromCache('', cacheKey);
      if (cached) {
        return cached;
      }
    }

    try {
      const result = await this.repository.paginate({
        page,
        pageSize,
        conditions,
        fields,
        orderBy
      });

      // 缓存结果
      if (useCache) {
        await this.setCache('', result, cacheKey, 300); // 分页结果缓存5分钟
      }

      return result;
    } catch (error) {
      logger.error('分页查询失败:', error);
      throw new CustomError(BUSINESS_ERRORS.OPERATION_FAILED.message, BUSINESS_ERRORS.OPERATION_FAILED.code);
    }
  }

  /**
   * 创建实体
   * @param {Object} data - 实体数据
   * @param {Object} options - 选项
   * @returns {Promise<Object>}
   */
  async create(data, options = {}) {
    const { validateRules = {}, clearCache = true } = options;

    // 验证输入数据
    const validatedData = await this.validateInput(data, validateRules, 'create');

    try {
      const result = await this.executeTransaction(async () => {
        // 创建前的钩子函数
        const processedData = await this.beforeCreate(validatedData);
        
        // 执行创建
        const entity = await this.repository.create(processedData);
        
        // 创建后的钩子函数
        await this.afterCreate(entity, processedData);
        
        return entity;
      }, { clearCache });

      logger.info(`实体创建成功 - ID: ${result.id}`);
      return result;
    } catch (error) {
      logger.error('创建实体失败:', error);
      throw error;
    }
  }

  /**
   * 更新实体
   * @param {number|string} id - 实体ID
   * @param {Object} data - 更新数据
   * @param {Object} options - 选项
   * @returns {Promise<Object|null>}
   */
  async update(id, data, options = {}) {
    const { validateRules = {}, clearCache = true } = options;

    // 参数验证
    if (!id) {
      throw new CustomError('ID不能为空', VALIDATION_ERRORS.MISSING_REQUIRED_FIELD.code);
    }

    // 验证输入数据
    const validatedData = await this.validateInput(data, validateRules, 'update');

    try {
      const result = await this.executeTransaction(async () => {
        // 检查实体是否存在
        const existing = await this.repository.findById(id);
        if (!existing) {
          throw new CustomError('实体不存在', BUSINESS_ERRORS.ENTITY_NOT_FOUND.code);
        }

        // 更新前的钩子函数
        const processedData = await this.beforeUpdate(id, validatedData, existing);
        
        // 执行更新
        const entity = await this.repository.update(id, processedData);
        
        // 更新后的钩子函数
        await this.afterUpdate(entity, processedData, existing);
        
        return entity;
      }, { 
        clearCache, 
        cachePatterns: [`${this.options.cachePrefix}entity:${id}`]
      });

      logger.info(`实体更新成功 - ID: ${id}`);
      return result;
    } catch (error) {
      logger.error(`更新实体失败 - ID: ${id}:`, error);
      throw error;
    }
  }

  /**
   * 删除实体（软删除）
   * @param {number|string} id - 实体ID
   * @param {Object} options - 选项
   * @returns {Promise<boolean>}
   */
  async delete(id, options = {}) {
    const { clearCache = true } = options;

    // 参数验证
    if (!id) {
      throw new CustomError('ID不能为空', VALIDATION_ERRORS.MISSING_REQUIRED_FIELD.code);
    }

    try {
      const result = await this.executeTransaction(async () => {
        // 检查实体是否存在
        const existing = await this.repository.findById(id);
        if (!existing) {
          throw new CustomError('实体不存在', BUSINESS_ERRORS.ENTITY_NOT_FOUND.code);
        }

        // 删除前的钩子函数
        await this.beforeDelete(id, existing);
        
        // 执行删除
        const success = await this.repository.softDelete(id);
        
        if (success) {
          // 删除后的钩子函数
          await this.afterDelete(id, existing);
        }
        
        return success;
      }, { 
        clearCache, 
        cachePatterns: [`${this.options.cachePrefix}entity:${id}`]
      });

      logger.info(`实体删除成功 - ID: ${id}`);
      return result;
    } catch (error) {
      logger.error(`删除实体失败 - ID: ${id}:`, error);
      throw error;
    }
  }

  /**
   * 恢复软删除的实体
   * @param {number|string} id - 实体ID
   * @param {Object} options - 选项
   * @returns {Promise<boolean>}
   */
  async restore(id, options = {}) {
    const { clearCache = true } = options;

    // 参数验证
    if (!id) {
      throw new CustomError('ID不能为空', VALIDATION_ERRORS.MISSING_REQUIRED_FIELD.code);
    }

    try {
      const result = await this.executeTransaction(async () => {
        // 恢复前的钩子函数
        await this.beforeRestore(id);
        
        // 执行恢复
        const success = await this.repository.restore(id);
        
        if (success) {
          // 恢复后的钩子函数
          await this.afterRestore(id);
        }
        
        return success;
      }, { 
        clearCache, 
        cachePatterns: [`${this.options.cachePrefix}entity:${id}`]
      });

      logger.info(`实体恢复成功 - ID: ${id}`);
      return result;
    } catch (error) {
      logger.error(`恢复实体失败 - ID: ${id}:`, error);
      throw error;
    }
  }

  /**
   * 批量操作
   * @param {string} operation - 操作类型
   * @param {Array} items - 操作项目
   * @param {Object} options - 选项
   * @returns {Promise<Array>}
   */
  async batchOperation(operation, items, options = {}) {
    if (!Array.isArray(items) || items.length === 0) {
      return [];
    }

    const { batchSize = 100, clearCache = true } = options;
    const results = [];

    try {
      // 分批处理
      for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        
        const batchResult = await this.executeTransaction(async () => {
          const batchResults = [];
          
          for (const item of batch) {
            try {
              let result;
              
              switch (operation) {
                case 'create':
                  result = await this.repository.create(item);
                  break;
                case 'update':
                  result = await this.repository.update(item.id, item.data);
                  break;
                case 'delete':
                  result = await this.repository.softDelete(item.id || item);
                  break;
                default:
                  throw new CustomError(`不支持的批量操作: ${operation}`, BUSINESS_ERRORS.OPERATION_FAILED.code);
              }
              
              batchResults.push(result);
            } catch (error) {
              logger.warn(`批量操作项目失败:`, { operation, item, error: error.message });
              batchResults.push({ error: error.message });
            }
          }
          
          return batchResults;
        }, { clearCache: false }); // 批量操作时暂不清缓存
        
        results.push(...batchResult);
      }

      // 批量操作完成后清除缓存
      if (clearCache) {
        await this.clearRelatedCache();
      }

      logger.info(`批量操作完成 - 操作: ${operation}, 数量: ${items.length}`);
      return results;
    } catch (error) {
      logger.error(`批量操作失败 - 操作: ${operation}:`, error);
      throw error;
    }
  }

  /**
   * 获取统计信息
   * @param {Object} options - 选项
   * @returns {Promise<Object>}
   */
  async getStatistics(options = {}) {
    const { useCache = true, cacheTimeout = 300 } = options;

    // 尝试从缓存获取
    if (useCache) {
      const cached = await this.getFromCache('statistics');
      if (cached) {
        return cached;
      }
    }

    try {
      const stats = {
        total: await this.repository.count(),
        active: await this.repository.count({}, false),
        deleted: await this.repository.count({}, true) - await this.repository.count({}, false)
      };

      // 缓存统计信息
      if (useCache) {
        await this.setCache('statistics', stats, '', cacheTimeout);
      }

      return stats;
    } catch (error) {
      logger.error('获取统计信息失败:', error);
      throw new CustomError(BUSINESS_ERRORS.OPERATION_FAILED.message, BUSINESS_ERRORS.OPERATION_FAILED.code);
    }
  }

  // 钩子函数 - 子类可以重写这些方法

  /**
   * 创建前钩子
   * @param {Object} data - 创建数据
   * @returns {Promise<Object>} 处理后的数据
   */
  async beforeCreate(data) {
    return data;
  }

  /**
   * 创建后钩子
   * @param {Object} entity - 创建的实体
   * @param {Object} originalData - 原始数据
   * @returns {Promise<void>}
   */
  async afterCreate(entity, originalData) {
    // 默认实现为空，子类可以重写
  }

  /**
   * 更新前钩子
   * @param {number|string} id - 实体ID
   * @param {Object} data - 更新数据
   * @param {Object} existing - 现有实体
   * @returns {Promise<Object>} 处理后的数据
   */
  async beforeUpdate(id, data, existing) {
    return data;
  }

  /**
   * 更新后钩子
   * @param {Object} entity - 更新后的实体
   * @param {Object} updateData - 更新数据
   * @param {Object} originalEntity - 原始实体
   * @returns {Promise<void>}
   */
  async afterUpdate(entity, updateData, originalEntity) {
    // 默认实现为空，子类可以重写
  }

  /**
   * 删除前钩子
   * @param {number|string} id - 实体ID
   * @param {Object} entity - 要删除的实体
   * @returns {Promise<void>}
   */
  async beforeDelete(id, entity) {
    // 默认实现为空，子类可以重写
  }

  /**
   * 删除后钩子
   * @param {number|string} id - 实体ID
   * @param {Object} entity - 被删除的实体
   * @returns {Promise<void>}
   */
  async afterDelete(id, entity) {
    // 默认实现为空，子类可以重写
  }

  /**
   * 恢复前钩子
   * @param {number|string} id - 实体ID
   * @returns {Promise<void>}
   */
  async beforeRestore(id) {
    // 默认实现为空，子类可以重写
  }

  /**
   * 恢复后钩子
   * @param {number|string} id - 实体ID
   * @returns {Promise<void>}
   */
  async afterRestore(id) {
    // 默认实现为空，子类可以重写
  }

  /**
   * 获取活跃事务数量
   * @returns {number}
   */
  getActiveTransactionCount() {
    return this.activeTransactions.size;
  }

  /**
   * 清理资源
   * @returns {Promise<void>}
   */
  async cleanup() {
    try {
      // 等待所有活跃事务完成
      while (this.activeTransactions.size > 0) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      logger.info('Service资源清理完成');
    } catch (error) {
      logger.error('Service资源清理失败:', error);
    }
  }
}

module.exports = BaseService; 