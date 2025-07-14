/**
 * 用户测试数据 Fixtures
 * 提供测试用的用户数据模板
 */
const bcrypt = require('bcryptjs');

/**
 * 测试用户数据
 */
const testUsers = {
  // 标准用户
  standardUser: {
    username: 'test_user',
    email: 'test@example.com',
    password: 'Test123456',
    phone: '13800138000',
    nickname: '测试用户',
    avatar: null,
    gender: 1,
    birthday: '1990-01-01',
    bio: '这是一个测试用户',
    status: 1,
    email_verified: 1,
    phone_verified: 1
  },
  
  // 管理员用户
  adminUser: {
    username: 'admin_user',
    email: 'admin@example.com',
    password: 'Admin123456',
    phone: '13800138001',
    nickname: '管理员',
    avatar: null,
    gender: 1,
    birthday: '1985-01-01',
    bio: '这是一个管理员用户',
    status: 1,
    email_verified: 1,
    phone_verified: 1
  },
  
  // 未验证用户
  unverifiedUser: {
    username: 'unverified_user',
    email: 'unverified@example.com',
    password: 'Test123456',
    phone: '13800138002',
    nickname: '未验证用户',
    avatar: null,
    gender: 2,
    birthday: '1992-01-01',
    bio: '这是一个未验证用户',
    status: 1,
    email_verified: 0,
    phone_verified: 0
  },
  
  // 被锁定用户
  lockedUser: {
    username: 'locked_user',
    email: 'locked@example.com',
    password: 'Test123456',
    phone: '13800138003',
    nickname: '被锁定用户',
    avatar: null,
    gender: 1,
    birthday: '1988-01-01',
    bio: '这是一个被锁定用户',
    status: 0,
    email_verified: 1,
    phone_verified: 1,
    login_attempts: 5,
    locked_until: new Date(Date.now() + 24 * 60 * 60 * 1000) // 锁定24小时
  },
  
  // 微信用户
  wechatUser: {
    username: 'wechat_user',
    email: 'wechat@example.com',
    password: 'Test123456',
    phone: '13800138004',
    nickname: '微信用户',
    avatar: 'https://example.com/avatar.jpg',
    gender: 1,
    birthday: '1991-01-01',
    bio: '这是一个微信用户',
    status: 1,
    email_verified: 1,
    phone_verified: 1,
    wechat_openid: 'test_openid_123',
    wechat_unionid: 'test_unionid_123'
  }
};

/**
 * 创建用户数据（带加密密码）
 * @param {Object} userData 用户数据
 * @returns {Promise<Object>} 处理后的用户数据
 */
async function createUserData(userData) {
  const hashedPassword = await bcrypt.hash(userData.password, 12);
  return {
    ...userData,
    password: hashedPassword,
    created_at: new Date(),
    updated_at: new Date()
  };
}

/**
 * 创建多个用户数据
 * @param {Array} usersArray 用户数据数组
 * @returns {Promise<Array>} 处理后的用户数据数组
 */
async function createUsersData(usersArray) {
  const processedUsers = [];
  for (const userData of usersArray) {
    const processedUser = await createUserData(userData);
    processedUsers.push(processedUser);
  }
  return processedUsers;
}

/**
 * 生成随机用户数据
 * @param {Object} overrides 覆盖的字段
 * @returns {Object} 随机用户数据
 */
function generateRandomUser(overrides = {}) {
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substr(2, 5);
  
  return {
    username: `user_${timestamp}_${randomStr}`,
    email: `user_${timestamp}_${randomStr}@test.com`,
    password: 'Test123456',
    phone: `139${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}`,
    nickname: `测试用户_${randomStr}`,
    avatar: null,
    gender: Math.floor(Math.random() * 3), // 0: 未知, 1: 男, 2: 女
    birthday: '1990-01-01',
    bio: `这是一个随机生成的测试用户_${randomStr}`,
    status: 1,
    email_verified: Math.random() > 0.5 ? 1 : 0,
    phone_verified: Math.random() > 0.5 ? 1 : 0,
    ...overrides
  };
}

/**
 * 测试用的登录数据
 */
const loginData = {
  valid: {
    email: 'test@example.com',
    password: 'Test123456'
  },
  
  invalidEmail: {
    email: 'invalid@example.com',
    password: 'Test123456'
  },
  
  invalidPassword: {
    email: 'test@example.com',
    password: 'wrongpassword'
  },
  
  adminValid: {
    email: 'admin@example.com',
    password: 'Admin123456'
  }
};

/**
 * 测试用的注册数据
 */
const registerData = {
  valid: {
    username: 'new_user',
    email: 'newuser@example.com',
    password: 'NewUser123456',
    phone: '13900139000',
    nickname: '新用户'
  },
  
  duplicateEmail: {
    username: 'another_user',
    email: 'test@example.com', // 重复邮箱
    password: 'Test123456',
    phone: '13900139001',
    nickname: '另一个用户'
  },
  
  duplicateUsername: {
    username: 'test_user', // 重复用户名
    email: 'another@example.com',
    password: 'Test123456',
    phone: '13900139002',
    nickname: '另一个用户'
  },
  
  invalidData: {
    username: 'ab', // 用户名太短
    email: 'invalid-email', // 邮箱格式错误
    password: '123', // 密码太简单
    phone: '123', // 手机号格式错误
    nickname: ''
  }
};

module.exports = {
  testUsers,
  createUserData,
  createUsersData,
  generateRandomUser,
  loginData,
  registerData
}; 