/**
 * 响应工具类单元测试
 */
const ResponseUtil = require('../../../src/utils/response');

describe('ResponseUtil 响应工具类测试', () => {
  
  describe('success() 成功响应测试', () => {
    test('应该返回标准成功响应格式', () => {
      const data = { id: 1, name: '测试用户' };
      const response = ResponseUtil.success(data, '操作成功');
      
      expect(response).toEqual({
        code: 200,
        message: '操作成功',
        data: data,
        timestamp: expect.any(String)
      });
      
      // 验证时间戳格式
      expect(new Date(response.timestamp)).toBeInstanceOf(Date);
    });

    test('应该使用默认消息', () => {
      const data = { test: 'data' };
      const response = ResponseUtil.success(data);
      
      expect(response.message).toBe('操作成功');
      expect(response.code).toBe(200);
      expect(response.data).toEqual(data);
    });

    test('应该处理空数据', () => {
      const response = ResponseUtil.success();
      
      expect(response.data).toBeNull();
      expect(response.code).toBe(200);
    });
  });

  describe('error() 错误响应测试', () => {
    test('应该返回标准错误响应格式', () => {
      const response = ResponseUtil.error('参数错误', 400, '详细错误信息');
      
      expect(response).toEqual({
        code: 400,
        message: '参数错误',
        error: '详细错误信息',
        timestamp: expect.any(String)
      });
    });

    test('应该使用默认错误代码', () => {
      const response = ResponseUtil.error('系统错误');
      
      expect(response.code).toBe(500);
      expect(response.message).toBe('系统错误');
      expect(response.error).toBeUndefined();
    });

    test('应该处理Error对象', () => {
      const error = new Error('测试错误');
      const response = ResponseUtil.error('操作失败', 500, error);
      
      expect(response.error).toBe('测试错误');
    });
  });

  describe('paginated() 分页响应测试', () => {
    test('应该返回标准分页响应格式', () => {
      const items = [{ id: 1 }, { id: 2 }, { id: 3 }];
      const pagination = {
        total: 100,
        page: 1,
        pageSize: 10
      };
      
      const response = ResponseUtil.paginated(items, pagination, '获取成功');
      
      expect(response).toEqual({
        code: 200,
        message: '获取成功',
        data: {
          items: items,
          pagination: {
            total: 100,
            total_pages: 10,
            current_page: 1,
            page_size: 10,
            has_previous: false,
            has_next: true,
            is_first_page: true,
            is_last_page: false
          }
        },
        timestamp: expect.any(String)
      });
    });

    test('应该正确计算最后一页', () => {
      const items = [{ id: 1 }];
      const pagination = {
        total: 21,
        page: 3,
        pageSize: 10
      };
      
      const response = ResponseUtil.paginated(items, pagination);
      
      expect(response.data.pagination).toEqual({
        total: 21,
        total_pages: 3,
        current_page: 3,
        page_size: 10,
        has_previous: true,
        has_next: false,
        is_first_page: false,
        is_last_page: true
      });
    });

    test('应该处理空结果', () => {
      const response = ResponseUtil.paginated([], { total: 0, page: 1, pageSize: 10 });
      
      expect(response.data.items).toEqual([]);
      expect(response.data.pagination.total).toBe(0);
      expect(response.data.pagination.total_pages).toBe(0);
    });
  });

  describe('created() 创建成功响应测试', () => {
    test('应该返回201状态码', () => {
      const data = { id: 1, name: '新用户' };
      const response = ResponseUtil.created(data, '创建成功');
      
      expect(response.code).toBe(201);
      expect(response.message).toBe('创建成功');
      expect(response.data).toEqual(data);
    });
  });

  describe('noContent() 无内容响应测试', () => {
    test('应该返回204状态码', () => {
      const response = ResponseUtil.noContent('删除成功');
      
      expect(response.code).toBe(204);
      expect(response.message).toBe('删除成功');
      expect(response.data).toBeNull();
    });
  });

  describe('businessError() 业务错误响应测试', () => {
    test('应该返回600状态码', () => {
      const response = ResponseUtil.businessError('业务规则错误', '用户余额不足');
      
      expect(response.code).toBe(600);
      expect(response.message).toBe('业务规则错误');
      expect(response.error).toBe('用户余额不足');
    });
  });

  describe('validationError() 验证错误响应测试', () => {
    test('应该返回601状态码和验证详情', () => {
      const validationDetails = {
        email: ['邮箱格式不正确'],
        password: ['密码长度不足']
      };
      
      const response = ResponseUtil.validationError('数据验证失败', validationDetails);
      
      expect(response.code).toBe(601);
      expect(response.message).toBe('数据验证失败');
      expect(response.error).toEqual(validationDetails);
    });
  });

  describe('databaseError() 数据库错误响应测试', () => {
    test('应该返回602状态码', () => {
      const response = ResponseUtil.databaseError('数据库连接失败');
      
      expect(response.code).toBe(602);
      expect(response.message).toBe('数据库连接失败');
    });
  });

  describe('unauthorized() 未授权响应测试', () => {
    test('应该返回401状态码', () => {
      const response = ResponseUtil.unauthorized('请先登录');
      
      expect(response.code).toBe(401);
      expect(response.message).toBe('请先登录');
    });
  });

  describe('forbidden() 禁止访问响应测试', () => {
    test('应该返回403状态码', () => {
      const response = ResponseUtil.forbidden('权限不足');
      
      expect(response.code).toBe(403);
      expect(response.message).toBe('权限不足');
    });
  });

  describe('notFound() 资源不存在响应测试', () => {
    test('应该返回404状态码', () => {
      const response = ResponseUtil.notFound('用户不存在');
      
      expect(response.code).toBe(404);
      expect(response.message).toBe('用户不存在');
    });
  });

  describe('conflict() 资源冲突响应测试', () => {
    test('应该返回409状态码', () => {
      const response = ResponseUtil.conflict('邮箱已存在');
      
      expect(response.code).toBe(409);
      expect(response.message).toBe('邮箱已存在');
    });
  });
}); 