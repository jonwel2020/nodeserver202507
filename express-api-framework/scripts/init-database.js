#!/usr/bin/env node

/**
 * 数据库初始化脚本
 * 执行数据库表创建和基础数据插入
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

/**
 * 数据库配置
 */
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'express_api_db',
  charset: 'utf8mb4',
  timezone: '+00:00',
  multipleStatements: true
};

/**
 * 创建数据库连接
 */
const createConnection = async () => {
  try {
    // 首先连接到MySQL服务器（不指定数据库）
    const adminConnection = await mysql.createConnection({
      ...dbConfig,
      database: undefined
    });

    // 创建数据库（如果不存在）
    await adminConnection.execute(`CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    console.log(`✅ 数据库 '${dbConfig.database}' 已确保存在`);
    
    await adminConnection.end();

    // 连接到指定数据库
    const connection = await mysql.createConnection(dbConfig);
    console.log('✅ 数据库连接成功');
    
    return connection;
  } catch (error) {
    console.error('❌ 数据库连接失败:', error.message);
    process.exit(1);
  }
};

/**
 * 读取SQL文件
 */
const readSQLFile = (filename) => {
  try {
    const filePath = path.join(__dirname, filename);
    const sql = fs.readFileSync(filePath, 'utf8');
    console.log(`✅ SQL文件 '${filename}' 读取成功`);
    return sql;
  } catch (error) {
    console.error(`❌ 读取SQL文件失败: ${error.message}`);
    process.exit(1);
  }
};

/**
 * 执行SQL脚本
 */
const executeSQLScript = async (connection, sql) => {
  try {
    console.log('🔄 开始执行SQL脚本...');
    
    // 分割SQL语句（处理多语句）
    const statements = sql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    let successCount = 0;
    
    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await connection.execute(statement);
          successCount++;
        } catch (error) {
          // 忽略一些预期的错误（如表已存在等）
          if (!error.message.includes('already exists') && 
              !error.message.includes('Duplicate entry')) {
            console.warn(`⚠️ SQL执行警告: ${error.message}`);
            console.warn(`语句: ${statement.substring(0, 100)}...`);
          }
        }
      }
    }
    
    console.log(`✅ SQL脚本执行完成，成功执行 ${successCount} 条语句`);
  } catch (error) {
    console.error('❌ SQL脚本执行失败:', error.message);
    throw error;
  }
};

/**
 * 验证数据库结构
 */
const validateDatabase = async (connection) => {
  try {
    console.log('🔍 验证数据库结构...');
    
    // 检查必要的表是否存在
    const requiredTables = [
      'users', 'roles', 'user_roles', 'wechat_users', 
      'login_history', 'token_blacklist', 'user_feedback', 'system_config'
    ];
    
    for (const table of requiredTables) {
      const [rows] = await connection.execute(
        'SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = ? AND table_name = ?',
        [dbConfig.database, table]
      );
      
      if (rows[0].count === 0) {
        throw new Error(`表 '${table}' 不存在`);
      }
      console.log(`✅ 表 '${table}' 存在`);
    }

    // 检查默认数据
    const [adminUsers] = await connection.execute('SELECT COUNT(*) as count FROM users WHERE username = "admin"');
    const [defaultRoles] = await connection.execute('SELECT COUNT(*) as count FROM roles WHERE is_system = 1');
    const [systemConfigs] = await connection.execute('SELECT COUNT(*) as count FROM system_config');
    
    console.log(`✅ 管理员用户: ${adminUsers[0].count} 个`);
    console.log(`✅ 系统角色: ${defaultRoles[0].count} 个`);
    console.log(`✅ 系统配置: ${systemConfigs[0].count} 个`);
    
    // 检查视图
    const [views] = await connection.execute(
      'SELECT COUNT(*) as count FROM information_schema.views WHERE table_schema = ? AND table_name = "user_details"',
      [dbConfig.database]
    );
    console.log(`✅ 视图: ${views[0].count} 个`);
    
    console.log('✅ 数据库结构验证完成');
  } catch (error) {
    console.error('❌ 数据库验证失败:', error.message);
    throw error;
  }
};

/**
 * 创建测试数据
 */
const createTestData = async (connection) => {
  try {
    console.log('🔄 创建测试数据...');
    
    // 检查是否已有测试数据
    const [existingUsers] = await connection.execute('SELECT COUNT(*) as count FROM users WHERE username LIKE "test%"');
    
    if (existingUsers[0].count > 0) {
      console.log('ℹ️ 测试数据已存在，跳过创建');
      return;
    }

    // 创建测试用户
    const testUsers = [
      {
        username: 'testuser1',
        email: 'test1@example.com',
        phone: '13800138001',
        nickname: '测试用户1',
        real_name: '张三'
      },
      {
        username: 'testuser2', 
        email: 'test2@example.com',
        phone: '13800138002',
        nickname: '测试用户2',
        real_name: '李四'
      }
    ];

    // 默认密码哈希 (123456)
    const defaultPasswordHash = '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6hsP1LkgTa';
    const defaultSalt = 'test_salt';

    for (const user of testUsers) {
      await connection.execute(
        `INSERT INTO users (username, email, phone, password_hash, salt, nickname, real_name, status, email_verified) 
         VALUES (?, ?, ?, ?, ?, ?, ?, 1, 1)`,
        [user.username, user.email, user.phone, defaultPasswordHash, defaultSalt, user.nickname, user.real_name]
      );
    }

    // 为测试用户分配普通用户角色
    const [userRole] = await connection.execute('SELECT id FROM roles WHERE name = "user"');
    if (userRole.length > 0) {
      const [testUserIds] = await connection.execute('SELECT id FROM users WHERE username LIKE "test%"');
      
      for (const user of testUserIds) {
        await connection.execute(
          'INSERT INTO user_roles (user_id, role_id, assigned_by) VALUES (?, ?, 1)',
          [user.id, userRole[0].id]
        );
      }
    }

    console.log(`✅ 创建了 ${testUsers.length} 个测试用户`);
  } catch (error) {
    console.error('❌ 创建测试数据失败:', error.message);
    // 测试数据创建失败不应该中断整个过程
  }
};

/**
 * 显示数据库信息
 */
const showDatabaseInfo = async (connection) => {
  try {
    console.log('\n📊 数据库信息统计:');
    console.log('='.repeat(40));
    
    // 表统计信息
    const tables = ['users', 'roles', 'user_roles', 'wechat_users', 'login_history', 'token_blacklist', 'user_feedback', 'system_config'];
    
    for (const table of tables) {
      const [rows] = await connection.execute(`SELECT COUNT(*) as count FROM ${table}`);
      console.log(`📋 ${table.padEnd(20)}: ${rows[0].count} 条记录`);
    }
    
    console.log('='.repeat(40));
    
    // 管理员账户信息
    const [adminInfo] = await connection.execute(`
      SELECT u.username, u.email, u.nickname, u.created_at 
      FROM users u 
      JOIN user_roles ur ON u.id = ur.user_id 
      JOIN roles r ON ur.role_id = r.id 
      WHERE r.name = 'super_admin'
    `);
    
    if (adminInfo.length > 0) {
      console.log('\n👑 管理员账户:');
      console.log(`用户名: ${adminInfo[0].username}`);
      console.log(`邮箱: ${adminInfo[0].email}`);
      console.log(`昵称: ${adminInfo[0].nickname}`);
      console.log(`创建时间: ${adminInfo[0].created_at}`);
      console.log('默认密码: admin123456');
    }
    
    console.log('\n🌐 数据库访问信息:');
    console.log(`主机: ${dbConfig.host}:${dbConfig.port}`);
    console.log(`数据库: ${dbConfig.database}`);
    console.log(`字符集: utf8mb4`);
    
  } catch (error) {
    console.error('❌ 获取数据库信息失败:', error.message);
  }
};

/**
 * 主函数
 */
const main = async () => {
  console.log('🚀 开始初始化数据库...\n');
  
  let connection;
  
  try {
    // 创建数据库连接
    connection = await createConnection();
    
    // 读取并执行SQL脚本
    const sql = readSQLFile('init-database.sql');
    await executeSQLScript(connection, sql);
    
    // 验证数据库结构
    await validateDatabase(connection);
    
    // 创建测试数据（仅在开发环境）
    if (process.env.NODE_ENV !== 'production') {
      await createTestData(connection);
    }
    
    // 显示数据库信息
    await showDatabaseInfo(connection);
    
    console.log('\n🎉 数据库初始化完成！');
    console.log('\n📝 下一步操作:');
    console.log('1. 运行 npm run dev 启动开发服务器');
    console.log('2. 访问 http://localhost:3000/health 检查服务状态');
    console.log('3. 使用管理员账户登录: admin / admin123456');
    
  } catch (error) {
    console.error('\n❌ 数据库初始化失败:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 数据库连接已关闭');
    }
  }
};

// 如果直接运行此脚本
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  createConnection,
  executeSQLScript,
  validateDatabase,
  main
}; 