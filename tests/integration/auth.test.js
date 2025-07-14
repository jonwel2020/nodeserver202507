/**
 * 认证系统集成测试
 */
const request = require('supertest');
const app = require('../../src/app');
const { testDb } = require('../helpers/database');
const { testUsers, loginData, registerData, generateRandomUser } = require('../fixtures/users');

describe('认证系统集成测试', () => {
  
  // 测试前设置
  beforeAll(async () => {
    await testDb.setupTestEnvironment();
  });

  // 测试后清理
  afterAll(async () => {
    await testDb.teardownTestEnvironment();
  });

  // 每个测试前清理数据
  beforeEach(async () => {
    await testDb.clearAllTables();
  });

  describe('POST /api/auth/register 用户注册测试', () => {
    test('应该成功注册新用户', async () => {
      const userData = generateRandomUser();
      
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: userData.username,
          email: userData.email,
          password: userData.password,
          phone: userData.phone,
          nickname: userData.nickname
        })
        .expect(201);

      expect(response.body).toMatchObject({
        code: 201,
        message: '注册成功',
        data: {
          user: {
            id: expect.any(Number),
            username: userData.username,
            email: userData.email,
            nickname: userData.nickname,
            phone: userData.phone
          },
          tokens: {
            accessToken: expect.any(String),
            refreshToken: expect.any(String)
          }
        }
      });

      // 验证数据库中用户已创建
      const user = await testDb.findUser({ email: userData.email });
      expect(user).toBeTruthy();
      expect(user.username).toBe(userData.username);
    });

    test('应该拒绝重复邮箱注册', async () => {
      // 先创建一个用户
      await testDb.insertUser(testUsers.standardUser);

      const response = await request(app)
        .post('/api/auth/register')
        .send(registerData.duplicateEmail)
        .expect(409);

      expect(response.body).toMatchObject({
        code: 409,
        message: '邮箱已被注册'
      });
    });

    test('应该拒绝重复用户名注册', async () => {
      await testDb.insertUser(testUsers.standardUser);

      const response = await request(app)
        .post('/api/auth/register')
        .send(registerData.duplicateUsername)
        .expect(409);

      expect(response.body).toMatchObject({
        code: 409,
        message: '用户名已被占用'
      });
    });

    test('应该拒绝无效数据注册', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send(registerData.invalidData)
        .expect(400);

      expect(response.body.code).toBe(400);
      expect(response.body.message).toContain('验证失败');
    });
  });

  describe('POST /api/auth/login 用户登录测试', () => {
    beforeEach(async () => {
      // 为每个登录测试创建测试用户
      await testDb.insertUser(testUsers.standardUser);
    });

    test('应该成功登录', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData.valid)
        .expect(200);

      expect(response.body).toMatchObject({
        code: 200,
        message: '登录成功',
        data: {
          user: {
            id: expect.any(Number),
            username: testUsers.standardUser.username,
            email: testUsers.standardUser.email,
            nickname: testUsers.standardUser.nickname
          },
          tokens: {
            accessToken: expect.any(String),
            refreshToken: expect.any(String)
          }
        }
      });

      // 验证Token格式
      expect(response.body.data.tokens.accessToken).toMatch(/^eyJ/);
      expect(response.body.data.tokens.refreshToken).toMatch(/^eyJ/);
    });

    test('应该拒绝错误邮箱', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData.invalidEmail)
        .expect(401);

      expect(response.body).toMatchObject({
        code: 401,
        message: '邮箱或密码错误'
      });
    });

    test('应该拒绝错误密码', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData.invalidPassword)
        .expect(401);

      expect(response.body).toMatchObject({
        code: 401,
        message: '邮箱或密码错误'
      });
    });

    test('应该拒绝被锁定用户登录', async () => {
      await testDb.insertUser(testUsers.lockedUser);

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUsers.lockedUser.email,
          password: testUsers.lockedUser.password
        })
        .expect(423);

      expect(response.body).toMatchObject({
        code: 423,
        message: expect.stringContaining('账户已被锁定')
      });
    });
  });

  describe('GET /api/auth/profile 获取用户信息测试', () => {
    let accessToken;
    let userId;

    beforeEach(async () => {
      // 创建用户并获取Token
      userId = await testDb.insertUser(testUsers.standardUser);
      
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send(loginData.valid);
      
      accessToken = loginResponse.body.data.tokens.accessToken;
    });

    test('应该成功获取用户信息', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        code: 200,
        message: '获取成功',
        data: {
          id: userId,
          username: testUsers.standardUser.username,
          email: testUsers.standardUser.email,
          nickname: testUsers.standardUser.nickname
        }
      });

      // 不应该返回密码
      expect(response.body.data.password).toBeUndefined();
    });

    test('应该拒绝无Token请求', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .expect(401);

      expect(response.body).toMatchObject({
        code: 401,
        message: '未提供认证Token'
      });
    });

    test('应该拒绝无效Token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body).toMatchObject({
        code: 401,
        message: expect.stringContaining('Token无效')
      });
    });
  });

  describe('POST /api/auth/refresh Token刷新测试', () => {
    let refreshToken;

    beforeEach(async () => {
      await testDb.insertUser(testUsers.standardUser);
      
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send(loginData.valid);
      
      refreshToken = loginResponse.body.data.tokens.refreshToken;
    });

    test('应该成功刷新Token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(response.body).toMatchObject({
        code: 200,
        message: '刷新成功',
        data: {
          accessToken: expect.any(String),
          refreshToken: expect.any(String)
        }
      });

      // 新Token应该与旧Token不同
      expect(response.body.data.accessToken).not.toBe(refreshToken);
    });

    test('应该拒绝无效的刷新Token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'invalid-refresh-token' })
        .expect(401);

      expect(response.body).toMatchObject({
        code: 401,
        message: expect.stringContaining('Token无效')
      });
    });
  });

  describe('POST /api/auth/logout 用户登出测试', () => {
    let accessToken;
    let refreshToken;

    beforeEach(async () => {
      await testDb.insertUser(testUsers.standardUser);
      
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send(loginData.valid);
      
      accessToken = loginResponse.body.data.tokens.accessToken;
      refreshToken = loginResponse.body.data.tokens.refreshToken;
    });

    test('应该成功登出', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ refreshToken })
        .expect(200);

      expect(response.body).toMatchObject({
        code: 200,
        message: '登出成功'
      });

      // 登出后原Token应该失效
      await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(401);
    });

    test('应该处理只有accessToken的登出', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.message).toBe('登出成功');
    });
  });

  describe('认证限流测试', () => {
    test('应该在快速登录尝试时触发限流', async () => {
      await testDb.insertUser(testUsers.standardUser);

      // 快速发送多个登录请求
      const promises = Array(6).fill().map(() => 
        request(app)
          .post('/api/auth/login')
          .send(loginData.invalidPassword)
      );

      const responses = await Promise.all(promises);
      
      // 至少有一个请求应该被限流
      const rateLimitedResponse = responses.find(res => res.status === 429);
      expect(rateLimitedResponse).toBeTruthy();
    });
  });
}); 