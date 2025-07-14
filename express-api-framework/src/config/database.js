/**
 * 数据库配置模块
 * 支持读写分离、连接池管理和自动重连
 */
const mysql = require('mysql2/promise');
const logger = require('./logger');

// 数据库连接池配置
const poolConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'express_api_db',
  charset: 'utf8mb4',
  connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT) || 10,
  acquireTimeout: 60000,
  timeout: 60000,
  reconnect: true,
  multipleStatements: true,
  timezone: '+08:00'
};

// 读库配置（支持读写分离）
const readPoolConfig = {
  ...poolConfig,
  host: process.env.DB_READ_HOST || process.env.DB_HOST || 'localhost'
};

// 写库配置
const writePoolConfig = {
  ...poolConfig,
  host: process.env.DB_WRITE_HOST || process.env.DB_HOST || 'localhost'
};

// 创建连接池
let writePool;
let readPool;

/**
 * 初始化数据库连接池
 */
async function initDatabase() {
  try {
    // 创建写库连接池
    writePool = mysql.createPool(writePoolConfig);
    
    // 创建读库连接池（如果配置了读写分离）
    if (process.env.DB_READ_HOST && process.env.DB_READ_HOST !== process.env.DB_HOST) {
      readPool = mysql.createPool(readPoolConfig);
      logger.info('数据库读写分离连接池初始化成功');
    } else {
      readPool = writePool; // 使用同一个连接池
      logger.info('数据库连接池初始化成功');
    }

    // 测试连接
    await testConnection();
    
    // 监听连接池事件
    setupPoolEvents();
    
    return { writePool, readPool };
  } catch (error) {
    logger.error('数据库连接池初始化失败:', error);
    throw error;
  }
}

/**
 * 测试数据库连接
 */
async function testConnection() {
  try {
    const connection = await writePool.getConnection();
    await connection.ping();
    connection.release();
    logger.info('数据库连接测试成功');
  } catch (error) {
    logger.error('数据库连接测试失败:', error);
    throw error;
  }
}

/**
 * 设置连接池事件监听
 */
function setupPoolEvents() {
  writePool.on('connection', (connection) => {
    logger.debug(`新的写库连接建立: ${connection.threadId}`);
  });

  writePool.on('error', (error) => {
    logger.error('写库连接池错误:', error);
  });

  if (readPool !== writePool) {
    readPool.on('connection', (connection) => {
      logger.debug(`新的读库连接建立: ${connection.threadId}`);
    });

    readPool.on('error', (error) => {
      logger.error('读库连接池错误:', error);
    });
  }
}

/**
 * 获取写库连接
 * @returns {Promise<Connection>}
 */
async function getWriteConnection() {
  try {
    return await writePool.getConnection();
  } catch (error) {
    logger.error('获取写库连接失败:', error);
    throw error;
  }
}

/**
 * 获取读库连接
 * @returns {Promise<Connection>}
 */
async function getReadConnection() {
  try {
    return await readPool.getConnection();
  } catch (error) {
    logger.error('获取读库连接失败:', error);
    throw error;
  }
}

/**
 * 执行写操作（INSERT, UPDATE, DELETE）
 * @param {string} sql - SQL语句
 * @param {Array} params - 参数
 * @returns {Promise<Object>}
 */
async function executeWrite(sql, params = []) {
  const connection = await getWriteConnection();
  try {
    const [result] = await connection.execute(sql, params);
    return result;
  } catch (error) {
    logger.error('写操作执行失败:', { sql, params, error: error.message });
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * 执行读操作（SELECT）
 * @param {string} sql - SQL语句
 * @param {Array} params - 参数
 * @returns {Promise<Array>}
 */
async function executeRead(sql, params = []) {
  const connection = await getReadConnection();
  try {
    const [rows] = await connection.execute(sql, params);
    return rows;
  } catch (error) {
    logger.error('读操作执行失败:', { sql, params, error: error.message });
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * 开始事务
 * @returns {Promise<Connection>}
 */
async function beginTransaction() {
  const connection = await getWriteConnection();
  try {
    await connection.beginTransaction();
    return connection;
  } catch (error) {
    connection.release();
    logger.error('开始事务失败:', error);
    throw error;
  }
}

/**
 * 提交事务
 * @param {Connection} connection - 数据库连接
 */
async function commitTransaction(connection) {
  try {
    await connection.commit();
  } catch (error) {
    logger.error('提交事务失败:', error);
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * 回滚事务
 * @param {Connection} connection - 数据库连接
 */
async function rollbackTransaction(connection) {
  try {
    await connection.rollback();
  } catch (error) {
    logger.error('回滚事务失败:', error);
  } finally {
    connection.release();
  }
}

/**
 * 关闭数据库连接池
 */
async function closeDatabase() {
  try {
    if (writePool) {
      await writePool.end();
      logger.info('写库连接池已关闭');
    }
    if (readPool && readPool !== writePool) {
      await readPool.end();
      logger.info('读库连接池已关闭');
    }
  } catch (error) {
    logger.error('关闭数据库连接池失败:', error);
  }
}

/**
 * 获取连接池状态
 * @returns {Object}
 */
function getPoolStatus() {
  return {
    write: {
      totalConnections: writePool.pool._allConnections.length,
      freeConnections: writePool.pool._freeConnections.length,
      acquiringConnections: writePool.pool._acquiringConnections.length
    },
    read: readPool === writePool ? '使用写库连接池' : {
      totalConnections: readPool.pool._allConnections.length,
      freeConnections: readPool.pool._freeConnections.length,
      acquiringConnections: readPool.pool._acquiringConnections.length
    }
  };
}

module.exports = {
  initDatabase,
  getWriteConnection,
  getReadConnection,
  executeWrite,
  executeRead,
  beginTransaction,
  commitTransaction,
  rollbackTransaction,
  closeDatabase,
  getPoolStatus,
  writePool: () => writePool,
  readPool: () => readPool
}; 