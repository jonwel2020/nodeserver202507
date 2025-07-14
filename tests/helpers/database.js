/**
 * 测试数据库辅助工具
 * 提供测试数据库的创建、清理和数据操作功能
 */
const mysql = require('mysql2/promise');
const { createUserData } = require('../fixtures/users');

/**
 * 测试数据库管理类
 */
class TestDatabase {
  constructor() {
    this.connection = null;
    this.testDbName = process.env.DB_NAME || 'express_api_test_db';
  }

  /**
   * 创建数据库连接
   */
  async connect() {
    if (this.connection) {
      return this.connection;
    }

    this.connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: this.testDbName,
      charset: 'utf8mb4',
      timezone: '+08:00'
    });

    return this.connection;
  }

  /**
   * 创建测试数据库
   */
  async createDatabase() {
    const tempConnection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      charset: 'utf8mb4'
    });

    try {
      // 创建测试数据库
      await tempConnection.execute(`CREATE DATABASE IF NOT EXISTS \`${this.testDbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
      console.log(`✅ 测试数据库 ${this.testDbName} 创建成功`);
    } catch (error) {
      console.error('❌ 创建测试数据库失败:', error.message);
      throw error;
    } finally {
      await tempConnection.end();
    }
  }

  /**
   * 删除测试数据库
   */
  async dropDatabase() {
    const tempConnection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      charset: 'utf8mb4'
    });

    try {
      await tempConnection.execute(`DROP DATABASE IF EXISTS \`${this.testDbName}\``);
      console.log(`✅ 测试数据库 ${this.testDbName} 删除成功`);
    } catch (error) {
      console.error('❌ 删除测试数据库失败:', error.message);
    } finally {
      await tempConnection.end();
    }
  }

  /**
   * 初始化测试数据库表结构
   */
  async initTables() {
    const connection = await this.connect();

    const tables = [
      // 用户表
      `CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL COMMENT '用户名',
        email VARCHAR(100) UNIQUE NOT NULL COMMENT '邮箱',
        password VARCHAR(255) NOT NULL COMMENT '密码哈希',
        phone VARCHAR(20) UNIQUE COMMENT '手机号',
        nickname VARCHAR(100) COMMENT '昵称',
        avatar VARCHAR(500) COMMENT '头像URL',
        gender TINYINT DEFAULT 0 COMMENT '性别 0:未知 1:男 2:女',
        birthday DATE COMMENT '生日',
        bio TEXT COMMENT '个人简介',
        status TINYINT DEFAULT 1 COMMENT '状态 0:禁用 1:正常',
        email_verified TINYINT DEFAULT 0 COMMENT '邮箱是否验证',
        phone_verified TINYINT DEFAULT 0 COMMENT '手机是否验证',
        login_attempts INT DEFAULT 0 COMMENT '登录失败次数',
        locked_until DATETIME COMMENT '锁定到期时间',
        last_login_at DATETIME COMMENT '最后登录时间',
        last_login_ip VARCHAR(45) COMMENT '最后登录IP',
        wechat_openid VARCHAR(100) COMMENT '微信OpenID',
        wechat_unionid VARCHAR(100) COMMENT '微信UnionID',
        settings JSON COMMENT '用户设置',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP NULL,
        INDEX idx_email (email),
        INDEX idx_phone (phone),
        INDEX idx_username (username),
        INDEX idx_wechat_openid (wechat_openid),
        INDEX idx_status (status),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表'`,

      // 角色表
      `CREATE TABLE IF NOT EXISTS roles (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(50) UNIQUE NOT NULL COMMENT '角色名称',
        display_name VARCHAR(100) NOT NULL COMMENT '显示名称',
        description TEXT COMMENT '角色描述',
        permissions JSON COMMENT '权限列表',
        is_default TINYINT DEFAULT 0 COMMENT '是否默认角色',
        status TINYINT DEFAULT 1 COMMENT '状态 0:禁用 1:正常',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_name (name),
        INDEX idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='角色表'`,

      // JWT黑名单表
      `CREATE TABLE IF NOT EXISTS token_blacklist (
        id INT AUTO_INCREMENT PRIMARY KEY,
        token_jti VARCHAR(255) UNIQUE NOT NULL COMMENT 'JWT ID',
        user_id INT NOT NULL COMMENT '用户ID',
        token_type ENUM('access', 'refresh') NOT NULL COMMENT 'Token类型',
        expires_at DATETIME NOT NULL COMMENT '过期时间',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_token_jti (token_jti),
        INDEX idx_user_id (user_id),
        INDEX idx_expires_at (expires_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='JWT令牌黑名单'`
    ];

    try {
      for (const sql of tables) {
        await connection.execute(sql);
      }
      console.log('✅ 测试数据库表结构初始化成功');
    } catch (error) {
      console.error('❌ 初始化测试数据库表结构失败:', error.message);
      throw error;
    }
  }

  /**
   * 清空所有表数据
   */
  async clearAllTables() {
    const connection = await this.connect();

    const tables = ['token_blacklist', 'users', 'roles'];

    try {
      // 禁用外键检查
      await connection.execute('SET FOREIGN_KEY_CHECKS = 0');

      // 清空所有表
      for (const table of tables) {
        await connection.execute(`TRUNCATE TABLE ${table}`);
      }

      // 恢复外键检查
      await connection.execute('SET FOREIGN_KEY_CHECKS = 1');

      console.log('✅ 所有测试表数据清空成功');
    } catch (error) {
      console.error('❌ 清空测试表数据失败:', error.message);
      throw error;
    }
  }

  /**
   * 插入测试用户数据
   * @param {Object} userData 用户数据
   * @returns {Promise<number>} 插入的用户ID
   */
  async insertUser(userData) {
    const connection = await this.connect();
    
    try {
      const processedData = await createUserData(userData);
      
      const sql = `
        INSERT INTO users (
          username, email, password, phone, nickname, avatar, gender, 
          birthday, bio, status, email_verified, phone_verified,
          login_attempts, locked_until, wechat_openid, wechat_unionid,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      const values = [
        processedData.username,
        processedData.email,
        processedData.password,
        processedData.phone || null,
        processedData.nickname || null,
        processedData.avatar || null,
        processedData.gender || 0,
        processedData.birthday || null,
        processedData.bio || null,
        processedData.status || 1,
        processedData.email_verified || 0,
        processedData.phone_verified || 0,
        processedData.login_attempts || 0,
        processedData.locked_until || null,
        processedData.wechat_openid || null,
        processedData.wechat_unionid || null,
        processedData.created_at,
        processedData.updated_at
      ];
      
      const [result] = await connection.execute(sql, values);
      return result.insertId;
    } catch (error) {
      console.error('❌ 插入测试用户失败:', error.message);
      throw error;
    }
  }

  /**
   * 查找用户
   * @param {Object} criteria 查询条件
   * @returns {Promise<Object|null>} 用户数据
   */
  async findUser(criteria) {
    const connection = await this.connect();

    try {
      const keys = Object.keys(criteria);
      const values = Object.values(criteria);
      const whereClause = keys.map(key => `${key} = ?`).join(' AND ');

      const sql = `SELECT * FROM users WHERE ${whereClause} AND deleted_at IS NULL LIMIT 1`;
      const [rows] = await connection.execute(sql, values);

      return rows.length > 0 ? rows[0] : null;
    } catch (error) {
      console.error('❌ 查找用户失败:', error.message);
      throw error;
    }
  }

  /**
   * 关闭数据库连接
   */
  async close() {
    if (this.connection) {
      await this.connection.end();
      this.connection = null;
    }
  }

  /**
   * 设置测试环境
   */
  async setupTestEnvironment() {
    try {
      await this.createDatabase();
      await this.initTables();
      console.log('✅ 测试环境设置完成');
    } catch (error) {
      console.error('❌ 测试环境设置失败:', error.message);
      throw error;
    }
  }

  /**
   * 清理测试环境
   */
  async teardownTestEnvironment() {
    try {
      await this.close();
      await this.dropDatabase();
      console.log('✅ 测试环境清理完成');
    } catch (error) {
      console.error('❌ 测试环境清理失败:', error.message);
    }
  }
}

// 导出单例实例
const testDb = new TestDatabase();

module.exports = {
  TestDatabase,
  testDb
}; 