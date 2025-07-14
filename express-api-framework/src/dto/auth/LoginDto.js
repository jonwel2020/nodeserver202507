/**
 * 登录数据传输对象
 * 定义登录请求和响应的数据结构
 */

/**
 * 登录请求DTO
 * 用于验证和转换登录请求数据
 */
class LoginRequestDto {
  /**
   * 构造函数
   * @param {Object} data - 请求数据
   */
  constructor(data = {}) {
    this.username = data.username || null;        // 用户名/邮箱/手机号
    this.password = data.password || null;        // 密码
    this.remember_me = data.remember_me || false; // 记住我
    this.captcha = data.captcha || null;          // 验证码
    this.captcha_key = data.captcha_key || null;  // 验证码key
    this.device_info = data.device_info || {};    // 设备信息
    this.client_type = data.client_type || 'web'; // 客户端类型
  }

  /**
   * 验证登录数据
   * @returns {Object} 验证结果
   */
  validate() {
    const errors = [];

    // 验证用户名
    if (!this.username || this.username.trim() === '') {
      errors.push('用户名不能为空');
    } else if (this.username.length < 3) {
      errors.push('用户名长度不能少于3位');
    } else if (this.username.length > 50) {
      errors.push('用户名长度不能超过50位');
    }

    // 验证密码
    if (!this.password || this.password.trim() === '') {
      errors.push('密码不能为空');
    } else if (this.password.length < 6) {
      errors.push('密码长度不能少于6位');
    } else if (this.password.length > 100) {
      errors.push('密码长度不能超过100位');
    }

    // 验证客户端类型
    const validClientTypes = ['web', 'mobile', 'wechat', 'admin'];
    if (!validClientTypes.includes(this.client_type)) {
      errors.push('客户端类型无效');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * 获取登录标识类型
   * @returns {string} 登录类型 (username, email, phone)
   */
  getLoginType() {
    const username = this.username.trim();
    
    // 邮箱格式
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(username)) {
      return 'email';
    }
    
    // 手机号格式
    if (/^1[3-9]\d{9}$/.test(username)) {
      return 'phone';
    }
    
    // 默认为用户名
    return 'username';
  }

  /**
   * 转换为数据库查询条件
   * @returns {Object} 查询条件
   */
  toQueryCondition() {
    const loginType = this.getLoginType();
    const condition = {};
    
    switch (loginType) {
      case 'email':
        condition.email = this.username.trim();
        break;
      case 'phone':
        condition.phone = this.username.trim();
        break;
      default:
        condition.username = this.username.trim();
        break;
    }
    
    return condition;
  }

  /**
   * 转换为日志记录格式
   * @returns {Object} 日志数据
   */
  toLogData() {
    return {
      username: this.username,
      login_type: this.getLoginType(),
      client_type: this.client_type,
      device_info: this.device_info,
      has_captcha: !!this.captcha,
      remember_me: this.remember_me
    };
  }
}

/**
 * 登录响应DTO
 * 用于标准化登录成功后的响应数据
 */
class LoginResponseDto {
  /**
   * 构造函数
   * @param {Object} data - 响应数据
   */
  constructor(data = {}) {
    this.user = data.user || null;                    // 用户信息
    this.access_token = data.access_token || null;    // 访问令牌
    this.refresh_token = data.refresh_token || null;  // 刷新令牌
    this.expires_in = data.expires_in || 86400;       // Token过期时间（秒）
    this.token_type = data.token_type || 'Bearer';    // Token类型
    this.permissions = data.permissions || [];        // 用户权限
    this.role = data.role || null;                    // 用户角色
    this.settings = data.settings || {};              // 用户设置
    this.login_time = data.login_time || new Date();  // 登录时间
  }

  /**
   * 转换为JSON响应格式
   * @param {boolean} includeTokens - 是否包含令牌信息
   * @returns {Object} JSON响应
   */
  toJSON(includeTokens = true) {
    const response = {
      user: this.user,
      permissions: this.permissions,
      role: this.role,
      settings: this.settings,
      login_time: this.login_time
    };

    if (includeTokens) {
      response.access_token = this.access_token;
      response.refresh_token = this.refresh_token;
      response.expires_in = this.expires_in;
      response.token_type = this.token_type;
    }

    return response;
  }

  /**
   * 转换为客户端安全格式（隐藏敏感信息）
   * @returns {Object} 客户端响应
   */
  toClientJSON() {
    return {
      user: this.user ? {
        id: this.user.id,
        username: this.user.username,
        nickname: this.user.nickname,
        avatar: this.user.avatar,
        email_verified: this.user.email_verified,
        phone_verified: this.user.phone_verified,
        wechat_bound: this.user.wechat_bound
      } : null,
      access_token: this.access_token,
      refresh_token: this.refresh_token,
      expires_in: this.expires_in,
      token_type: this.token_type,
      permissions: this.permissions,
      role: this.role ? {
        id: this.role.id,
        name: this.role.name,
        type: this.role.type
      } : null,
      login_time: this.login_time
    };
  }
}

/**
 * 微信登录请求DTO
 */
class WechatLoginRequestDto {
  /**
   * 构造函数
   * @param {Object} data - 请求数据
   */
  constructor(data = {}) {
    this.code = data.code || null;                    // 微信授权码
    this.encrypted_data = data.encrypted_data || null; // 加密数据
    this.iv = data.iv || null;                        // 初始向量
    this.signature = data.signature || null;          // 签名
    this.raw_data = data.raw_data || null;            // 原始数据
    this.device_info = data.device_info || {};        // 设备信息
  }

  /**
   * 验证微信登录数据
   * @returns {Object} 验证结果
   */
  validate() {
    const errors = [];

    if (!this.code || this.code.trim() === '') {
      errors.push('微信授权码不能为空');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * 转换为日志记录格式
   * @returns {Object} 日志数据
   */
  toLogData() {
    return {
      has_code: !!this.code,
      has_encrypted_data: !!this.encrypted_data,
      has_signature: !!this.signature,
      device_info: this.device_info
    };
  }
}

/**
 * 刷新Token请求DTO
 */
class RefreshTokenRequestDto {
  /**
   * 构造函数
   * @param {Object} data - 请求数据
   */
  constructor(data = {}) {
    this.refresh_token = data.refresh_token || null;  // 刷新令牌
    this.client_type = data.client_type || 'web';     // 客户端类型
  }

  /**
   * 验证刷新Token数据
   * @returns {Object} 验证结果
   */
  validate() {
    const errors = [];

    if (!this.refresh_token || this.refresh_token.trim() === '') {
      errors.push('刷新令牌不能为空');
    }

    const validClientTypes = ['web', 'mobile', 'wechat', 'admin'];
    if (!validClientTypes.includes(this.client_type)) {
      errors.push('客户端类型无效');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

/**
 * 刷新Token响应DTO
 */
class RefreshTokenResponseDto {
  /**
   * 构造函数
   * @param {Object} data - 响应数据
   */
  constructor(data = {}) {
    this.access_token = data.access_token || null;    // 新的访问令牌
    this.refresh_token = data.refresh_token || null;  // 新的刷新令牌
    this.expires_in = data.expires_in || 86400;       // Token过期时间（秒）
    this.token_type = data.token_type || 'Bearer';    // Token类型
    this.issued_at = data.issued_at || new Date();    // 签发时间
  }

  /**
   * 转换为JSON响应格式
   * @returns {Object} JSON响应
   */
  toJSON() {
    return {
      access_token: this.access_token,
      refresh_token: this.refresh_token,
      expires_in: this.expires_in,
      token_type: this.token_type,
      issued_at: this.issued_at
    };
  }
}

/**
 * 登出请求DTO
 */
class LogoutRequestDto {
  /**
   * 构造函数
   * @param {Object} data - 请求数据
   */
  constructor(data = {}) {
    this.all_devices = data.all_devices || false;     // 是否登出所有设备
    this.device_id = data.device_id || null;          // 设备ID
  }

  /**
   * 转换为日志记录格式
   * @returns {Object} 日志数据
   */
  toLogData() {
    return {
      all_devices: this.all_devices,
      device_id: this.device_id
    };
  }
}

module.exports = {
  LoginRequestDto,
  LoginResponseDto,
  WechatLoginRequestDto,
  RefreshTokenRequestDto,
  RefreshTokenResponseDto,
  LogoutRequestDto
}; 