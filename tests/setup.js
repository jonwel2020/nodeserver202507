/**
 * 测试环境全局设置
 * 配置测试数据库连接和环境变量
 */
const path = require('path');
const dotenv = require('dotenv');

// 加载测试环境变量
dotenv.config({ path: path.join(__dirname, '../.env.test') });

// 设置测试环境变量
process.env.NODE_ENV = 'test';
process.env.DB_NAME = process.env.DB_NAME || 'express_api_test_db';
process.env.LOG_LEVEL = 'error'; // 测试时只输出错误日志

// 全局测试超时时间
jest.setTimeout(10000);

// 全局测试前置操作
beforeAll(async () => {
  // 这里可以添加全局测试前的初始化操作
  console.log('🧪 开始运行测试套件...');
});

// 全局测试后置操作
afterAll(async () => {
  // 这里可以添加全局测试后的清理操作
  console.log('✅ 测试套件运行完成');
});

// 每个测试前的操作
beforeEach(() => {
  // 清理模拟函数
  jest.clearAllMocks();
});

// 捕获未处理的Promise拒绝
process.on('unhandledRejection', (reason, promise) => {
  console.error('测试中发现未处理的Promise拒绝:', reason);
});

// 全局测试工具函数
global.testHelpers = {
  /**
   * 等待指定时间
   * @param {number} ms 等待时间（毫秒）
   */
  delay: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
  
  /**
   * 生成测试用的随机邮箱
   */
  randomEmail: () => `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}@test.com`,
  
  /**
   * 生成测试用的随机用户名
   */
  randomUsername: () => `test_user_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
  
  /**
   * 生成测试用的随机手机号
   */
  randomPhone: () => `139${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}`
}; 