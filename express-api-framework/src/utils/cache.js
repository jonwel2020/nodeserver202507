/**
 * 缓存工具类
 * 提供多级缓存策略和常用缓存操作
 */
const { redis } = require('../config');
const logger = require('../config/logger');

// 本地内存缓存
const localCache = new Map();
const localCacheExpire = new Map();

// 缓存前缀配置
const CACHE_PREFIXES = {
  USER: 'user:',
  SESSION: 'session:',
  CAPTCHA: 'captcha:',
  RATE_LIMIT: 'rate_limit:',
  PERMISSION: 'permission:',
  TEMP: 'temp:',
  LOCK: 'lock:'
};

// 默认过期时间（秒）
const DEFAULT_TTL = {
  SHORT: 300,    // 5分钟
  MEDIUM: 1800,  // 30分钟
  LONG: 3600,    // 1小时
  DAY: 86400,    // 1天
  WEEK: 604800   // 1周
};

class CacheManager {
  constructor() {
    this.useRedis = true;
    this.localCacheMaxSize = 1000; // 本地缓存最大条目数
  }

  /**
   * 检查Redis连接状态
   * @returns {boolean}
   */
  isRedisAvailable() {
    try {
      return redis.isRedisConnected();
    } catch (error) {
      logger.warn('Redis连接检查失败，切换到本地缓存', error);
      return false;
    }
  }

  /**
   * 生成缓存键
   * @param {string} prefix - 前缀
   * @param {string} key - 键名
   * @returns {string}
   */
  generateKey(prefix, key) {
    return `${prefix}${key}`;
  }

  /**
   * 设置缓存
   * @param {string} key - 缓存键
   * @param {*} value - 缓存值
   * @param {number} ttl - 过期时间（秒）
   * @param {boolean} useLocal - 是否使用本地缓存
   * @returns {Promise<boolean>}
   */
  async set(key, value, ttl = DEFAULT_TTL.MEDIUM, useLocal = false) {
    try {
      // 优先使用Redis
      if (this.useRedis && this.isRedisAvailable() && !useLocal) {
        await redis.setCache(key, value, ttl);
        return true;
      }

      // 使用本地缓存
      return this.setLocal(key, value, ttl);
    } catch (error) {
      logger.error('设置缓存失败:', { key, error: error.message });
      
      // Redis失败时尝试本地缓存
      if (!useLocal) {
        return this.setLocal(key, value, ttl);
      }
      
      return false;
    }
  }

  /**
   * 获取缓存
   * @param {string} key - 缓存键
   * @param {boolean} useLocal - 是否使用本地缓存
   * @returns {Promise<*>}
   */
  async get(key, useLocal = false) {
    try {
      // 优先使用Redis
      if (this.useRedis && this.isRedisAvailable() && !useLocal) {
        return await redis.getCache(key);
      }

      // 使用本地缓存
      return this.getLocal(key);
    } catch (error) {
      logger.error('获取缓存失败:', { key, error: error.message });
      
      // Redis失败时尝试本地缓存
      if (!useLocal) {
        return this.getLocal(key);
      }
      
      return null;
    }
  }

  /**
   * 删除缓存
   * @param {string|string[]} keys - 缓存键
   * @param {boolean} useLocal - 是否使用本地缓存
   * @returns {Promise<boolean>}
   */
  async delete(keys, useLocal = false) {
    try {
      // 优先使用Redis
      if (this.useRedis && this.isRedisAvailable() && !useLocal) {
        await redis.deleteCache(keys);
        return true;
      }

      // 使用本地缓存
      return this.deleteLocal(keys);
    } catch (error) {
      logger.error('删除缓存失败:', { keys, error: error.message });
      return false;
    }
  }

  /**
   * 检查缓存是否存在
   * @param {string} key - 缓存键
   * @param {boolean} useLocal - 是否使用本地缓存
   * @returns {Promise<boolean>}
   */
  async exists(key, useLocal = false) {
    try {
      if (this.useRedis && this.isRedisAvailable() && !useLocal) {
        return await redis.existsCache(key);
      }

      return this.existsLocal(key);
    } catch (error) {
      logger.error('检查缓存存在性失败:', { key, error: error.message });
      return false;
    }
  }

  /**
   * 设置本地缓存
   * @param {string} key - 缓存键
   * @param {*} value - 缓存值
   * @param {number} ttl - 过期时间（秒）
   * @returns {boolean}
   */
  setLocal(key, value, ttl = DEFAULT_TTL.MEDIUM) {
    try {
      // 检查缓存大小限制
      if (localCache.size >= this.localCacheMaxSize) {
        this.clearExpiredLocal();
        
        // 如果清理后仍然超限，删除最老的条目
        if (localCache.size >= this.localCacheMaxSize) {
          const firstKey = localCache.keys().next().value;
          localCache.delete(firstKey);
          localCacheExpire.delete(firstKey);
        }
      }

      localCache.set(key, value);
      
      if (ttl > 0) {
        localCacheExpire.set(key, Date.now() + ttl * 1000);
      }
      
      return true;
    } catch (error) {
      logger.error('设置本地缓存失败:', { key, error: error.message });
      return false;
    }
  }

  /**
   * 获取本地缓存
   * @param {string} key - 缓存键
   * @returns {*}
   */
  getLocal(key) {
    try {
      // 检查是否过期
      if (localCacheExpire.has(key)) {
        if (Date.now() > localCacheExpire.get(key)) {
          localCache.delete(key);
          localCacheExpire.delete(key);
          return null;
        }
      }

      return localCache.get(key) || null;
    } catch (error) {
      logger.error('获取本地缓存失败:', { key, error: error.message });
      return null;
    }
  }

  /**
   * 删除本地缓存
   * @param {string|string[]} keys - 缓存键
   * @returns {boolean}
   */
  deleteLocal(keys) {
    try {
      const keyArray = Array.isArray(keys) ? keys : [keys];
      
      keyArray.forEach(key => {
        localCache.delete(key);
        localCacheExpire.delete(key);
      });
      
      return true;
    } catch (error) {
      logger.error('删除本地缓存失败:', { keys, error: error.message });
      return false;
    }
  }

  /**
   * 检查本地缓存是否存在
   * @param {string} key - 缓存键
   * @returns {boolean}
   */
  existsLocal(key) {
    return this.getLocal(key) !== null;
  }

  /**
   * 清理过期的本地缓存
   */
  clearExpiredLocal() {
    const now = Date.now();
    
    for (const [key, expireTime] of localCacheExpire.entries()) {
      if (now > expireTime) {
        localCache.delete(key);
        localCacheExpire.delete(key);
      }
    }
  }

  /**
   * 清空所有本地缓存
   */
  clearAllLocal() {
    localCache.clear();
    localCacheExpire.clear();
  }

  /**
   * 获取本地缓存统计信息
   * @returns {Object}
   */
  getLocalStats() {
    return {
      size: localCache.size,
      maxSize: this.localCacheMaxSize,
      expireSize: localCacheExpire.size
    };
  }
}

// 创建缓存管理器实例
const cacheManager = new CacheManager();

/**
 * 用户缓存相关操作
 */
const userCache = {
  /**
   * 设置用户缓存
   * @param {number} userId - 用户ID
   * @param {Object} userData - 用户数据
   * @param {number} ttl - 过期时间
   * @returns {Promise<boolean>}
   */
  async setUser(userId, userData, ttl = DEFAULT_TTL.LONG) {
    const key = cacheManager.generateKey(CACHE_PREFIXES.USER, userId);
    return await cacheManager.set(key, userData, ttl);
  },

  /**
   * 获取用户缓存
   * @param {number} userId - 用户ID
   * @returns {Promise<Object|null>}
   */
  async getUser(userId) {
    const key = cacheManager.generateKey(CACHE_PREFIXES.USER, userId);
    return await cacheManager.get(key);
  },

  /**
   * 删除用户缓存
   * @param {number} userId - 用户ID
   * @returns {Promise<boolean>}
   */
  async deleteUser(userId) {
    const key = cacheManager.generateKey(CACHE_PREFIXES.USER, userId);
    return await cacheManager.delete(key);
  },

  /**
   * 更新用户缓存字段
   * @param {number} userId - 用户ID
   * @param {Object} updates - 更新数据
   * @returns {Promise<boolean>}
   */
  async updateUser(userId, updates) {
    const userData = await this.getUser(userId);
    if (userData) {
      const updatedData = { ...userData, ...updates };
      return await this.setUser(userId, updatedData);
    }
    return false;
  }
};

/**
 * 会话缓存相关操作
 */
const sessionCache = {
  /**
   * 设置会话缓存
   * @param {string} sessionId - 会话ID
   * @param {Object} sessionData - 会话数据
   * @param {number} ttl - 过期时间
   * @returns {Promise<boolean>}
   */
  async setSession(sessionId, sessionData, ttl = DEFAULT_TTL.DAY) {
    const key = cacheManager.generateKey(CACHE_PREFIXES.SESSION, sessionId);
    return await cacheManager.set(key, sessionData, ttl);
  },

  /**
   * 获取会话缓存
   * @param {string} sessionId - 会话ID
   * @returns {Promise<Object|null>}
   */
  async getSession(sessionId) {
    const key = cacheManager.generateKey(CACHE_PREFIXES.SESSION, sessionId);
    return await cacheManager.get(key);
  },

  /**
   * 删除会话缓存
   * @param {string} sessionId - 会话ID
   * @returns {Promise<boolean>}
   */
  async deleteSession(sessionId) {
    const key = cacheManager.generateKey(CACHE_PREFIXES.SESSION, sessionId);
    return await cacheManager.delete(key);
  }
};

/**
 * 验证码缓存相关操作
 */
const captchaCache = {
  /**
   * 设置验证码
   * @param {string} identifier - 标识符（手机号、邮箱等）
   * @param {string} code - 验证码
   * @param {number} ttl - 过期时间
   * @returns {Promise<boolean>}
   */
  async setCaptcha(identifier, code, ttl = DEFAULT_TTL.SHORT) {
    const key = cacheManager.generateKey(CACHE_PREFIXES.CAPTCHA, identifier);
    return await cacheManager.set(key, { code, createdAt: Date.now() }, ttl);
  },

  /**
   * 验证验证码
   * @param {string} identifier - 标识符
   * @param {string} code - 验证码
   * @returns {Promise<boolean>}
   */
  async verifyCaptcha(identifier, code) {
    const key = cacheManager.generateKey(CACHE_PREFIXES.CAPTCHA, identifier);
    const cachedData = await cacheManager.get(key);
    
    if (!cachedData || cachedData.code !== code) {
      return false;
    }

    // 验证成功后删除验证码
    await cacheManager.delete(key);
    return true;
  }
};

/**
 * 分布式锁相关操作
 */
const lockCache = {
  /**
   * 获取分布式锁
   * @param {string} lockKey - 锁键
   * @param {number} ttl - 锁过期时间
   * @param {string} lockValue - 锁值（用于释放锁）
   * @returns {Promise<boolean>}
   */
  async acquireLock(lockKey, ttl = 30, lockValue = null) {
    const key = cacheManager.generateKey(CACHE_PREFIXES.LOCK, lockKey);
    const value = lockValue || `${Date.now()}_${Math.random()}`;
    
    try {
      if (cacheManager.isRedisAvailable()) {
        const client = redis.getRedisClient();
        const result = await client.set(key, value, 'EX', ttl, 'NX');
        return result === 'OK';
      }
      
      // 本地锁（适用于单机环境）
      if (!cacheManager.existsLocal(key)) {
        cacheManager.setLocal(key, value, ttl);
        return true;
      }
      
      return false;
    } catch (error) {
      logger.error('获取分布式锁失败:', { lockKey, error: error.message });
      return false;
    }
  },

  /**
   * 释放分布式锁
   * @param {string} lockKey - 锁键
   * @param {string} lockValue - 锁值
   * @returns {Promise<boolean>}
   */
  async releaseLock(lockKey, lockValue) {
    const key = cacheManager.generateKey(CACHE_PREFIXES.LOCK, lockKey);
    
    try {
      if (cacheManager.isRedisAvailable()) {
        const client = redis.getRedisClient();
        // 使用Lua脚本确保原子性
        const script = `
          if redis.call("get", KEYS[1]) == ARGV[1] then
            return redis.call("del", KEYS[1])
          else
            return 0
          end
        `;
        const result = await client.eval(script, 1, key, lockValue);
        return result === 1;
      }
      
      // 本地锁释放
      const currentValue = cacheManager.getLocal(key);
      if (currentValue === lockValue) {
        cacheManager.deleteLocal(key);
        return true;
      }
      
      return false;
    } catch (error) {
      logger.error('释放分布式锁失败:', { lockKey, error: error.message });
      return false;
    }
  }
};

/**
 * 启动定期清理任务
 */
function startCleanupTasks() {
  // 每5分钟清理一次过期的本地缓存
  setInterval(() => {
    cacheManager.clearExpiredLocal();
  }, 5 * 60 * 1000);
}

// 启动清理任务
startCleanupTasks();

module.exports = {
  cacheManager,
  userCache,
  sessionCache,
  captchaCache,
  lockCache,
  CACHE_PREFIXES,
  DEFAULT_TTL
}; 