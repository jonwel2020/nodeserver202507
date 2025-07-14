#!/usr/bin/env node

/**
 * 种子数据脚本
 * 用于生成开发和测试环境的模拟数据
 */

require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const { faker } = require('@faker-js/faker');

// 设置中文区域
faker.locale = 'zh_CN';

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
  timezone: '+00:00'
};

/**
 * 创建数据库连接
 */
const createConnection = async () => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    console.log('✅ 数据库连接成功');
    return connection;
  } catch (error) {
    console.error('❌ 数据库连接失败:', error.message);
    process.exit(1);
  }
};

/**
 * 生成随机密码哈希
 */
const generatePasswordHash = async (password = '123456') => {
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(password, salt);
  return { hash, salt };
};

/**
 * 生成随机手机号
 */
const generatePhone = () => {
  const prefixes = ['130', '131', '132', '133', '134', '135', '136', '137', '138', '139',
                    '150', '151', '152', '153', '155', '156', '157', '158', '159',
                    '180', '181', '182', '183', '184', '185', '186', '187', '188', '189'];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const suffix = Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
  return prefix + suffix;
};

/**
 * 生成用户偏好设置
 */
const generateUserPreferences = () => {
  return {
    theme: faker.helpers.arrayElement(['light', 'dark', 'auto']),
    language: faker.helpers.arrayElement(['zh-CN', 'en-US']),
    timezone: 'Asia/Shanghai',
    notifications: {
      email: faker.datatype.boolean(),
      push: faker.datatype.boolean(),
      sms: faker.datatype.boolean()
    },
    privacy: {
      profileVisible: faker.datatype.boolean(),
      showOnlineStatus: faker.datatype.boolean(),
      allowDirectMessages: faker.datatype.boolean()
    }
  };
};

/**
 * 生成设备信息
 */
const generateDeviceInfo = () => {
  const devices = [
    { type: 'mobile', os: 'iOS', browser: 'Safari' },
    { type: 'mobile', os: 'Android', browser: 'Chrome' },
    { type: 'desktop', os: 'Windows', browser: 'Chrome' },
    { type: 'desktop', os: 'macOS', browser: 'Safari' },
    { type: 'tablet', os: 'iOS', browser: 'Safari' }
  ];
  
  const device = faker.helpers.arrayElement(devices);
  return {
    type: device.type,
    os: device.os,
    browser: device.browser,
    version: faker.system.semver(),
    screen: {
      width: faker.datatype.number({ min: 320, max: 1920 }),
      height: faker.datatype.number({ min: 568, max: 1080 })
    }
  };
};

/**
 * 清理现有测试数据
 */
const cleanupTestData = async (connection) => {
  try {
    console.log('🧹 清理现有测试数据...');
    
    // 删除测试数据（保留admin用户）
    await connection.execute('DELETE FROM login_history WHERE user_id > 1');
    await connection.execute('DELETE FROM wechat_users WHERE user_id > 1');
    await connection.execute('DELETE FROM user_feedback WHERE user_id > 1');
    await connection.execute('DELETE FROM user_roles WHERE user_id > 1');
    await connection.execute('DELETE FROM users WHERE id > 1');
    
    console.log('✅ 测试数据清理完成');
  } catch (error) {
    console.error('❌ 清理测试数据失败:', error.message);
    throw error;
  }
};

/**
 * 创建测试用户
 */
const createTestUsers = async (connection, count = 50) => {
  try {
    console.log(`🔄 创建 ${count} 个测试用户...`);
    
    const users = [];
    const passwords = await Promise.all(
      Array(count).fill().map(() => generatePasswordHash())
    );
    
    for (let i = 0; i < count; i++) {
      const gender = faker.datatype.number({ min: 1, max: 2 });
      const firstName = faker.name.firstName(gender === 1 ? 'male' : 'female');
      const lastName = faker.name.lastName();
      
      users.push([
        `user${String(i + 1).padStart(3, '0')}`, // username
        faker.internet.email(firstName, lastName, 'example.com'), // email
        generatePhone(), // phone
        passwords[i].hash, // password_hash
        passwords[i].salt, // salt
        `${lastName}${firstName}`, // nickname
        `${lastName}${firstName}`, // real_name
        faker.image.avatar(), // avatar_url
        gender, // gender
        faker.date.birthdate({ min: 18, max: 65, mode: 'age' }), // birthday
        faker.lorem.sentences(2), // bio
        faker.helpers.arrayElement([1, 1, 1, 1, 2]), // status (80%正常，20%禁用)
        faker.datatype.boolean() ? 1 : 0, // email_verified
        faker.datatype.boolean() ? 1 : 0, // phone_verified
        0, // two_factor_enabled
        null, // two_factor_secret
        faker.datatype.number({ min: 0, max: 100 }), // login_count
        faker.date.recent(30), // last_login_at
        faker.internet.ip(), // last_login_ip
        faker.date.recent(60), // password_changed_at
        0, // failed_login_attempts
        null, // locked_until
        JSON.stringify(generateUserPreferences()), // preferences
        JSON.stringify({ source: 'seed_data', created_by: 'script' }) // metadata
      ]);
    }
    
    // 批量插入用户
    const sql = `
      INSERT INTO users (
        username, email, phone, password_hash, salt, nickname, real_name, 
        avatar_url, gender, birthday, bio, status, email_verified, phone_verified,
        two_factor_enabled, two_factor_secret, login_count, last_login_at, 
        last_login_ip, password_changed_at, failed_login_attempts, locked_until,
        preferences, metadata
      ) VALUES ?
    `;
    
    await connection.execute(sql, [users]);
    console.log(`✅ 成功创建 ${count} 个测试用户`);
    
    return count;
  } catch (error) {
    console.error('❌ 创建测试用户失败:', error.message);
    throw error;
  }
};

/**
 * 分配用户角色
 */
const assignUserRoles = async (connection) => {
  try {
    console.log('🔄 分配用户角色...');
    
    // 获取角色信息
    const [roles] = await connection.execute('SELECT id, name FROM roles WHERE name IN ("user", "moderator", "admin")');
    const roleMap = {};
    roles.forEach(role => {
      roleMap[role.name] = role.id;
    });
    
    // 获取所有测试用户
    const [users] = await connection.execute('SELECT id FROM users WHERE id > 1');
    
    const userRoles = [];
    
    for (const user of users) {
      // 90%普通用户，8%协调员，2%管理员
      let roleId;
      const rand = Math.random();
      if (rand < 0.02) {
        roleId = roleMap.admin;
      } else if (rand < 0.10) {
        roleId = roleMap.moderator;
      } else {
        roleId = roleMap.user;
      }
      
      userRoles.push([
        user.id, // user_id
        roleId, // role_id
        1, // assigned_by (admin)
        faker.datatype.boolean() ? faker.date.future() : null // expires_at
      ]);
    }
    
    // 批量插入用户角色关联
    const sql = `
      INSERT INTO user_roles (user_id, role_id, assigned_by, expires_at)
      VALUES ?
    `;
    
    await connection.execute(sql, [userRoles]);
    console.log(`✅ 成功分配 ${userRoles.length} 个用户角色`);
    
  } catch (error) {
    console.error('❌ 分配用户角色失败:', error.message);
    throw error;
  }
};

/**
 * 创建微信用户数据
 */
const createWechatUsers = async (connection, percentage = 0.3) => {
  try {
    console.log(`🔄 创建微信用户数据 (${percentage * 100}%用户绑定微信)...`);
    
    // 获取部分用户
    const [users] = await connection.execute('SELECT id FROM users WHERE id > 1 ORDER BY RAND() LIMIT ?', [
      Math.floor(50 * percentage)
    ]);
    
    const wechatUsers = [];
    
    for (const user of users) {
      wechatUsers.push([
        user.id, // user_id
        `openid_${faker.datatype.uuid()}`, // openid
        Math.random() > 0.5 ? `unionid_${faker.datatype.uuid()}` : null, // unionid
        faker.datatype.string(24), // session_key
        faker.name.findName(), // nickname
        faker.image.avatar(), // avatar_url
        faker.datatype.number({ min: 1, max: 2 }), // gender
        faker.address.city(), // city
        faker.address.state(), // province
        '中国', // country
        'zh_CN', // language
        faker.date.recent(30), // bind_time
        faker.date.recent(7), // last_login_at
        1 // is_active
      ]);
    }
    
    // 批量插入微信用户数据
    const sql = `
      INSERT INTO wechat_users (
        user_id, openid, unionid, session_key, nickname, avatar_url,
        gender, city, province, country, language, bind_time, last_login_at, is_active
      ) VALUES ?
    `;
    
    await connection.execute(sql, [wechatUsers]);
    console.log(`✅ 成功创建 ${wechatUsers.length} 个微信用户数据`);
    
  } catch (error) {
    console.error('❌ 创建微信用户数据失败:', error.message);
    throw error;
  }
};

/**
 * 创建登录历史
 */
const createLoginHistory = async (connection, recordsPerUser = 5) => {
  try {
    console.log(`🔄 创建登录历史数据 (每用户${recordsPerUser}条记录)...`);
    
    // 获取所有用户
    const [users] = await connection.execute('SELECT id FROM users WHERE id > 1');
    
    const loginHistory = [];
    const loginTypes = ['web', 'mobile', 'wechat'];
    const loginMethods = ['password', 'wechat', 'phone', 'email'];
    
    for (const user of users) {
      for (let i = 0; i < recordsPerUser; i++) {
        const isSuccess = Math.random() > 0.1; // 90%成功率
        
        loginHistory.push([
          user.id, // user_id
          faker.helpers.arrayElement(loginTypes), // login_type
          faker.helpers.arrayElement(loginMethods), // login_method
          faker.internet.ip(), // ip_address
          faker.internet.userAgent(), // user_agent
          JSON.stringify(generateDeviceInfo()), // device_info
          `${faker.address.city()}, ${faker.address.country()}`, // location
          isSuccess ? 1 : 0, // is_success
          isSuccess ? null : faker.helpers.arrayElement(['密码错误', '账户被锁定', '验证码错误']), // failure_reason
          isSuccess ? faker.datatype.uuid() : null, // session_id
          isSuccess && Math.random() > 0.5 ? faker.date.recent() : null, // logout_at
          faker.date.recent(30) // created_at
        ]);
      }
    }
    
    // 批量插入登录历史
    const sql = `
      INSERT INTO login_history (
        user_id, login_type, login_method, ip_address, user_agent,
        device_info, location, is_success, failure_reason, session_id, logout_at, created_at
      ) VALUES ?
    `;
    
    await connection.execute(sql, [loginHistory]);
    console.log(`✅ 成功创建 ${loginHistory.length} 条登录历史记录`);
    
  } catch (error) {
    console.error('❌ 创建登录历史失败:', error.message);
    throw error;
  }
};

/**
 * 创建用户反馈
 */
const createUserFeedback = async (connection, count = 20) => {
  try {
    console.log(`🔄 创建 ${count} 条用户反馈...`);
    
    // 获取部分用户
    const [users] = await connection.execute('SELECT id FROM users WHERE id > 1 ORDER BY RAND() LIMIT ?', [count]);
    
    const feedbacks = [];
    const types = ['bug', 'feature', 'complaint', 'suggestion', 'other'];
    const categories = ['界面问题', '功能建议', '性能优化', '用户体验', '安全问题', '其他'];
    const statuses = [1, 1, 1, 2, 2, 3, 4]; // 大部分是待处理和处理中
    const priorities = [1, 2, 2, 2, 3, 4]; // 大部分是中等优先级
    
    for (let i = 0; i < count; i++) {
      const user = users[i % users.length];
      const status = faker.helpers.arrayElement(statuses);
      
      feedbacks.push([
        user.id, // user_id
        faker.helpers.arrayElement(types), // type
        faker.helpers.arrayElement(categories), // category
        faker.lorem.sentence(), // title
        faker.lorem.paragraphs(faker.datatype.number({ min: 1, max: 3 })), // content
        faker.helpers.arrayElement([null, faker.internet.email(), faker.phone.phoneNumber()]), // contact_info
        JSON.stringify([]), // attachments
        status, // status
        faker.helpers.arrayElement(priorities), // priority
        status > 1 ? 1 : null, // assigned_to (分配给admin)
        status === 3 ? faker.lorem.paragraph() : null, // response
        status === 3 ? faker.date.recent() : null, // resolved_at
        faker.internet.ip(), // ip_address
        faker.internet.userAgent(), // user_agent
        faker.date.recent(60) // created_at
      ]);
    }
    
    // 批量插入用户反馈
    const sql = `
      INSERT INTO user_feedback (
        user_id, type, category, title, content, contact_info, attachments,
        status, priority, assigned_to, response, resolved_at, ip_address, user_agent, created_at
      ) VALUES ?
    `;
    
    await connection.execute(sql, [feedbacks]);
    console.log(`✅ 成功创建 ${count} 条用户反馈`);
    
  } catch (error) {
    console.error('❌ 创建用户反馈失败:', error.message);
    throw error;
  }
};

/**
 * 显示数据统计
 */
const showDataStatistics = async (connection) => {
  try {
    console.log('\n📊 种子数据统计:');
    console.log('='.repeat(50));
    
    const tables = [
      { name: 'users', description: '用户' },
      { name: 'user_roles', description: '用户角色' },
      { name: 'wechat_users', description: '微信用户' },
      { name: 'login_history', description: '登录历史' },
      { name: 'user_feedback', description: '用户反馈' }
    ];
    
    for (const table of tables) {
      const [rows] = await connection.execute(`SELECT COUNT(*) as count FROM ${table.name}`);
      console.log(`📋 ${table.description.padEnd(15)}: ${rows[0].count.toString().padStart(6)} 条记录`);
    }
    
    // 角色分布统计
    const [roleStats] = await connection.execute(`
      SELECT r.display_name, COUNT(ur.user_id) as user_count
      FROM roles r
      LEFT JOIN user_roles ur ON r.id = ur.role_id AND ur.is_active = 1
      GROUP BY r.id, r.display_name
      ORDER BY user_count DESC
    `);
    
    console.log('\n👥 角色分布:');
    roleStats.forEach(stat => {
      console.log(`   ${stat.display_name.padEnd(15)}: ${stat.user_count} 人`);
    });
    
    // 状态分布统计
    const [statusStats] = await connection.execute(`
      SELECT 
        CASE status 
          WHEN 1 THEN '正常'
          WHEN 2 THEN '禁用'
          WHEN 3 THEN '锁定'
          WHEN 4 THEN '注销'
          ELSE '其他'
        END as status_name,
        COUNT(*) as count
      FROM users
      GROUP BY status
      ORDER BY status
    `);
    
    console.log('\n📈 用户状态分布:');
    statusStats.forEach(stat => {
      console.log(`   ${stat.status_name.padEnd(15)}: ${stat.count} 人`);
    });
    
    console.log('='.repeat(50));
    
  } catch (error) {
    console.error('❌ 获取数据统计失败:', error.message);
  }
};

/**
 * 主函数
 */
const main = async () => {
  console.log('🌱 开始生成种子数据...\n');
  
  let connection;
  
  try {
    // 检查环境
    if (process.env.NODE_ENV === 'production') {
      console.error('❌ 不能在生产环境执行种子数据脚本');
      process.exit(1);
    }
    
    // 创建数据库连接
    connection = await createConnection();
    
    // 清理现有测试数据
    await cleanupTestData(connection);
    
    // 创建测试用户
    await createTestUsers(connection, 50);
    
    // 分配用户角色
    await assignUserRoles(connection);
    
    // 创建微信用户数据（30%的用户）
    await createWechatUsers(connection, 0.3);
    
    // 创建登录历史（每用户5条记录）
    await createLoginHistory(connection, 5);
    
    // 创建用户反馈
    await createUserFeedback(connection, 20);
    
    // 显示数据统计
    await showDataStatistics(connection);
    
    console.log('\n🎉 种子数据生成完成！');
    console.log('\n📝 测试账户信息:');
    console.log('管理员: admin / admin123456');
    console.log('测试用户: user001 ~ user050 / 123456');
    
  } catch (error) {
    console.error('\n❌ 种子数据生成失败:', error.message);
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
  main,
  createTestUsers,
  createLoginHistory,
  createUserFeedback
}; 