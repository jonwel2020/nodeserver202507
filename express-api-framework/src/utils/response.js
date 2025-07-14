/**
 * 统一响应格式工具类
 * 提供标准化的API响应格式和分页支持
 */

/**
 * 成功响应
 * @param {*} data - 响应数据
 * @param {string} message - 响应消息
 * @param {number} code - 状态码
 * @returns {Object} 标准响应格式
 */
function success(data = null, message = '操作成功', code = 200) {
  return {
    code,
    message,
    data,
    timestamp: new Date().toISOString()
  };
}

/**
 * 错误响应
 * @param {string} message - 错误消息
 * @param {number} code - 错误码
 * @param {*} error - 详细错误信息
 * @returns {Object} 标准错误响应格式
 */
function error(message = '操作失败', code = 400, error = null) {
  const response = {
    code,
    message,
    timestamp: new Date().toISOString()
  };

  // 在开发环境显示详细错误信息
  if (process.env.NODE_ENV === 'development' && error) {
    response.error = error;
  }

  return response;
}

/**
 * 分页响应
 * @param {Array} items - 数据列表
 * @param {number} total - 总记录数
 * @param {number} page - 当前页码
 * @param {number} pageSize - 每页大小
 * @param {string} message - 响应消息
 * @returns {Object} 分页响应格式
 */
function paginated(items, total, page, pageSize, message = '获取成功') {
  const totalPages = Math.ceil(total / pageSize);
  
  return {
    code: 200,
    message,
    data: {
      items,
      pagination: {
        total,
        total_pages: totalPages,
        current_page: page,
        page_size: pageSize,
        has_previous: page > 1,
        has_next: page < totalPages,
        is_first_page: page === 1,
        is_last_page: page === totalPages
      }
    },
    timestamp: new Date().toISOString()
  };
}

/**
 * 创建成功响应
 * @param {*} data - 创建的数据
 * @param {string} message - 响应消息
 * @returns {Object} 创建成功响应
 */
function created(data = null, message = '创建成功') {
  return success(data, message, 201);
}

/**
 * 无内容响应
 * @param {string} message - 响应消息
 * @returns {Object} 无内容响应
 */
function noContent(message = '操作成功') {
  return success(null, message, 204);
}

/**
 * 未授权响应
 * @param {string} message - 错误消息
 * @returns {Object} 未授权响应
 */
function unauthorized(message = '未授权访问') {
  return error(message, 401);
}

/**
 * 权限不足响应
 * @param {string} message - 错误消息
 * @returns {Object} 权限不足响应
 */
function forbidden(message = '权限不足') {
  return error(message, 403);
}

/**
 * 资源不存在响应
 * @param {string} message - 错误消息
 * @returns {Object} 资源不存在响应
 */
function notFound(message = '资源不存在') {
  return error(message, 404);
}

/**
 * 数据冲突响应
 * @param {string} message - 错误消息
 * @returns {Object} 数据冲突响应
 */
function conflict(message = '数据冲突') {
  return error(message, 409);
}

/**
 * 数据验证错误响应
 * @param {string} message - 错误消息
 * @param {Object} validationErrors - 验证错误详情
 * @returns {Object} 验证错误响应
 */
function validationError(message = '数据验证失败', validationErrors = null) {
  const response = error(message, 422);
  if (validationErrors) {
    response.validation_errors = validationErrors;
  }
  return response;
}

/**
 * 服务器内部错误响应
 * @param {string} message - 错误消息
 * @param {*} errorDetails - 错误详情
 * @returns {Object} 服务器错误响应
 */
function serverError(message = '服务器内部错误', errorDetails = null) {
  return error(message, 500, errorDetails);
}

/**
 * 服务不可用响应
 * @param {string} message - 错误消息
 * @returns {Object} 服务不可用响应
 */
function serviceUnavailable(message = '服务暂不可用') {
  return error(message, 503);
}

/**
 * 业务逻辑错误响应（自定义6xx状态码）
 * @param {string} message - 错误消息
 * @param {number} code - 业务错误码，默认600
 * @param {*} details - 错误详情
 * @returns {Object} 业务错误响应
 */
function businessError(message = '业务逻辑错误', code = 600, details = null) {
  const response = {
    code,
    message,
    timestamp: new Date().toISOString()
  };

  if (details) {
    response.details = details;
  }

  return response;
}

/**
 * 数据库操作错误响应
 * @param {string} message - 错误消息
 * @param {*} details - 错误详情
 * @returns {Object} 数据库错误响应
 */
function databaseError(message = '数据库操作失败', details = null) {
  return businessError(message, 602, details);
}

/**
 * 发送响应的中间件工具
 * @param {Object} res - Express响应对象
 * @param {Object} responseData - 响应数据
 */
function send(res, responseData) {
  // 设置HTTP状态码
  let httpStatus = 200;
  
  if (responseData.code >= 200 && responseData.code < 300) {
    httpStatus = responseData.code;
  } else if (responseData.code >= 400 && responseData.code < 500) {
    httpStatus = responseData.code;
  } else if (responseData.code >= 500 && responseData.code < 600) {
    httpStatus = responseData.code;
  } else if (responseData.code >= 600) {
    // 自定义业务错误码映射为400
    httpStatus = 400;
  }

  res.status(httpStatus).json(responseData);
}

/**
 * Express中间件：添加响应工具方法到res对象
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 * @param {Function} next - Express下一个中间件
 */
function responseMiddleware(req, res, next) {
  // 添加响应方法到res对象
  res.success = (data, message) => send(res, success(data, message));
  res.error = (message, code, error) => send(res, error(message, code, error));
  res.paginated = (items, total, page, pageSize, message) => 
    send(res, paginated(items, total, page, pageSize, message));
  res.created = (data, message) => send(res, created(data, message));
  res.noContent = (message) => send(res, noContent(message));
  res.unauthorized = (message) => send(res, unauthorized(message));
  res.forbidden = (message) => send(res, forbidden(message));
  res.notFound = (message) => send(res, notFound(message));
  res.conflict = (message) => send(res, conflict(message));
  res.validationError = (message, validationErrors) => 
    send(res, validationError(message, validationErrors));
  res.serverError = (message, errorDetails) => 
    send(res, serverError(message, errorDetails));
  res.serviceUnavailable = (message) => 
    send(res, serviceUnavailable(message));
  res.businessError = (message, code, details) => 
    send(res, businessError(message, code, details));
  res.databaseError = (message, details) => 
    send(res, databaseError(message, details));

  next();
}

module.exports = {
  success,
  error,
  paginated,
  created,
  noContent,
  unauthorized,
  forbidden,
  notFound,
  conflict,
  validationError,
  serverError,
  serviceUnavailable,
  businessError,
  databaseError,
  send,
  responseMiddleware
}; 