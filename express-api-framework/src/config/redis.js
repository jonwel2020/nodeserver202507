/**
 * Redis配置模块
 * 支持连接管理、重连机制和集群配置
 */
const redis = require('redis');
const logger = require('./logger');

// Redis配置
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  db: process.env.REDIS_DB || 0,
  retryDelayOnFailover: 100,
  enableReadyCheck: true,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  keepAlive: 30000,
  family: 4
};

let client;
let isConnected = false;

/**
 * 初始化Redis连接
 */
async function initRedis() {
  try {
    // 创建Redis客户端
    client = redis.createClient({
      url: `redis://${redisConfig.password ? `:${redisConfig.password}@` : ''}${redisConfig.host}:${redisConfig.port}/${redisConfig.db}`,
      socket: {
        connectTimeout: 5000,
        lazyConnect: true,
        keepAlive: redisConfig.keepAlive,
        family: redisConfig.family
      },
      retryDelayOnFailover: redisConfig.retryDelayOnFailover,
      enableAutoPipelining: true
    });

    // 设置事件监听
    setupRedisEvents();

    // 连接Redis
    await client.connect();
    
    // 测试连接
    await testRedisConnection();
    
    isConnected = true;
    logger.info('Redis连接初始化成功');
    
    return client;
  } catch (error) {
    logger.error('Redis连接初始化失败:', error);
    throw error;
  }
}

/**
 * 设置Redis事件监听
 */
function setupRedisEvents() {
  client.on('connect', () => {
    logger.info('Redis连接已建立');
  });

  client.on('ready', () => {
    isConnected = true;
    logger.info('Redis已就绪');
  });

  client.on('error', (error) => {
    isConnected = false;
    logger.error('Redis连接错误:', error);
  });

  client.on('end', () => {
    isConnected = false;
    logger.warn('Redis连接已断开');
  });

  client.on('reconnecting', (delay, attempt) => {
    logger.info(`Redis重连中... 延迟: ${delay}ms, 尝试次数: ${attempt}`);
  });
}

/**
 * 测试Redis连接
 */
async function testRedisConnection() {
  try {
    await client.ping();
    logger.info('Redis连接测试成功');
  } catch (error) {
    logger.error('Redis连接测试失败:', error);
    throw error;
  }
}

/**
 * 获取Redis客户端
 * @returns {Object} Redis客户端实例
 */
function getRedisClient() {
  if (!client || !isConnected) {
    throw new Error('Redis客户端未初始化或连接已断开');
  }
  return client;
}

/**
 * 设置缓存
 * @param {string} key - 缓存键
 * @param {*} value - 缓存值
 * @param {number} ttl - 过期时间（秒）
 * @returns {Promise<string>}
 */
async function setCache(key, value, ttl = 3600) {
  try {
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
    if (ttl > 0) {
      return await client.setEx(key, ttl, stringValue);
    } else {
      return await client.set(key, stringValue);
    }
  } catch (error) {
    logger.error('设置缓存失败:', { key, error: error.message });
    throw error;
  }
}

/**
 * 获取缓存
 * @param {string} key - 缓存键
 * @param {boolean} parseJson - 是否解析JSON
 * @returns {Promise<*>}
 */
async function getCache(key, parseJson = true) {
  try {
    const value = await client.get(key);
    if (value === null) return null;
    
    if (parseJson) {
      try {
        return JSON.parse(value);
      } catch {
        return value; // 如果不是JSON格式，直接返回字符串
      }
    }
    return value;
  } catch (error) {
    logger.error('获取缓存失败:', { key, error: error.message });
    throw error;
  }
}

/**
 * 删除缓存
 * @param {string|string[]} keys - 缓存键或键数组
 * @returns {Promise<number>}
 */
async function deleteCache(keys) {
  try {
    if (Array.isArray(keys)) {
      return await client.del(keys);
    } else {
      return await client.del(keys);
    }
  } catch (error) {
    logger.error('删除缓存失败:', { keys, error: error.message });
    throw error;
  }
}

/**
 * 检查缓存是否存在
 * @param {string} key - 缓存键
 * @returns {Promise<boolean>}
 */
async function existsCache(key) {
  try {
    const result = await client.exists(key);
    return result === 1;
  } catch (error) {
    logger.error('检查缓存存在性失败:', { key, error: error.message });
    throw error;
  }
}

/**
 * 设置缓存过期时间
 * @param {string} key - 缓存键
 * @param {number} ttl - 过期时间（秒）
 * @returns {Promise<boolean>}
 */
async function expireCache(key, ttl) {
  try {
    const result = await client.expire(key, ttl);
    return result === 1;
  } catch (error) {
    logger.error('设置缓存过期时间失败:', { key, ttl, error: error.message });
    throw error;
  }
}

/**
 * 获取缓存剩余过期时间
 * @param {string} key - 缓存键
 * @returns {Promise<number>} 剩余秒数，-1表示无过期时间，-2表示键不存在
 */
async function getTTL(key) {
  try {
    return await client.ttl(key);
  } catch (error) {
    logger.error('获取缓存TTL失败:', { key, error: error.message });
    throw error;
  }
}

/**
 * 批量获取缓存
 * @param {string[]} keys - 缓存键数组
 * @param {boolean} parseJson - 是否解析JSON
 * @returns {Promise<Array>}
 */
async function mgetCache(keys, parseJson = true) {
  try {
    const values = await client.mGet(keys);
    if (!parseJson) return values;
    
    return values.map(value => {
      if (value === null) return null;
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    });
  } catch (error) {
    logger.error('批量获取缓存失败:', { keys, error: error.message });
    throw error;
  }
}

/**
 * 批量设置缓存
 * @param {Object} keyValuePairs - 键值对对象
 * @returns {Promise<string>}
 */
async function msetCache(keyValuePairs) {
  try {
    const pairs = [];
    for (const [key, value] of Object.entries(keyValuePairs)) {
      pairs.push(key);
      pairs.push(typeof value === 'string' ? value : JSON.stringify(value));
    }
    return await client.mSet(pairs);
  } catch (error) {
    logger.error('批量设置缓存失败:', { error: error.message });
    throw error;
  }
}

/**
 * 模糊查找键
 * @param {string} pattern - 匹配模式
 * @returns {Promise<string[]>}
 */
async function keysCache(pattern) {
  try {
    return await client.keys(pattern);
  } catch (error) {
    logger.error('模糊查找缓存键失败:', { pattern, error: error.message });
    throw error;
  }
}

/**
 * 清空所有缓存
 * @returns {Promise<string>}
 */
async function flushAllCache() {
  try {
    logger.warn('执行清空所有缓存操作');
    return await client.flushAll();
  } catch (error) {
    logger.error('清空所有缓存失败:', error);
    throw error;
  }
}

/**
 * 获取Redis信息
 * @returns {Promise<Object>}
 */
async function getRedisInfo() {
  try {
    const info = await client.info();
    return parseRedisInfo(info);
  } catch (error) {
    logger.error('获取Redis信息失败:', error);
    throw error;
  }
}

/**
 * 解析Redis INFO命令输出
 * @param {string} info - Redis INFO输出
 * @returns {Object}
 */
function parseRedisInfo(info) {
  const lines = info.split('\r\n');
  const result = {};
  let section = 'general';

  for (const line of lines) {
    if (line.startsWith('#')) {
      section = line.substring(2).toLowerCase();
      result[section] = {};
    } else if (line.includes(':')) {
      const [key, value] = line.split(':', 2);
      result[section] = result[section] || {};
      result[section][key] = isNaN(value) ? value : Number(value);
    }
  }

  return result;
}

/**
 * 检查Redis连接状态
 * @returns {boolean}
 */
function isRedisConnected() {
  return isConnected && client && client.isOpen;
}

/**
 * 关闭Redis连接
 */
async function closeRedis() {
  try {
    if (client) {
      await client.quit();
      isConnected = false;
      logger.info('Redis连接已关闭');
    }
  } catch (error) {
    logger.error('关闭Redis连接失败:', error);
  }
}

module.exports = {
  initRedis,
  getRedisClient,
  setCache,
  getCache,
  deleteCache,
  existsCache,
  expireCache,
  getTTL,
  mgetCache,
  msetCache,
  keysCache,
  flushAllCache,
  getRedisInfo,
  isRedisConnected,
  closeRedis
}; 