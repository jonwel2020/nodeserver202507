/**
 * 注册数据传输对象
 * 定义用户注册请求和响应的数据结构
 */

const crypto = require('../../utils/crypto');
const { USER_STATUS } = require('../../constants/status');

/**
 * 用户注册请求DTO
 */
class RegisterRequestDto {
  /**
   * 构造函数
   * @param {Object} data - 请求数据
   */
  constructor(data = {}) {
    this.username = data.username || null;            // 用户名
    this.password = data.password || null;            // 密码
    this.password_confirm = data.password_confirm || null; // 确认密码
    this.email = data.email || null;                  // 邮箱
    this.phone = data.phone || null;                  // 手机号
    this.nickname = data.nickname || null;            // 昵称
    this.captcha = data.captcha || null;              // 验证码
    this.captcha_key = data.captcha_key || null;      // 验证码key
    this.verification_code = data.verification_code || null; // 短信/邮箱验证码
    this.verification_type = data.verification_type || 'none'; // 验证类型 (none, sms, email)
    this.invite_code = data.invite_code || null;      // 邀请码
    this.agree_terms = data.agree_terms || false;     // 同意条款
    this.device_info = data.device_info || {};        // 设备信息
    this.referrer = data.referrer || null;            // 推荐人
  }

  /**
   * 验证注册数据
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
    } else if (!/^[a-zA-Z0-9_]+$/.test(this.username)) {
      errors.push('用户名只能包含字母、数字和下划线');
    }

    // 验证密码
    if (!this.password || this.password.trim() === '') {
      errors.push('密码不能为空');
    } else {
      const passwordValidation = crypto.validatePasswordStrength(this.password);
      if (!passwordValidation.isValid) {
        errors.push(...passwordValidation.errors);
      }
    }

    // 验证确认密码
    if (!this.password_confirm || this.password_confirm.trim() === '') {
      errors.push('确认密码不能为空');
    } else if (this.password !== this.password_confirm) {
      errors.push('两次输入的密码不一致');
    }

    // 验证邮箱（如果提供）
    if (this.email) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email)) {
        errors.push('邮箱格式不正确');
      }
    }

    // 验证手机号（如果提供）
    if (this.phone) {
      if (!/^1[3-9]\d{9}$/.test(this.phone)) {
        errors.push('手机号格式不正确');
      }
    }

    // 验证昵称（如果提供）
    if (this.nickname) {
      if (this.nickname.length > 100) {
        errors.push('昵称长度不能超过100位');
      }
    }

    // 验证是否同意条款
    if (!this.agree_terms) {
      errors.push('必须同意用户协议和隐私政策');
    }

    // 验证验证码（如果需要）
    if (this.verification_type !== 'none') {
      if (!this.verification_code || this.verification_code.trim() === '') {
        errors.push('验证码不能为空');
      } else if (!/^\d{4,6}$/.test(this.verification_code)) {
        errors.push('验证码格式不正确');
      }
    }

    // 至少提供邮箱或手机号
    if (!this.email && !this.phone) {
      errors.push('至少需要提供邮箱或手机号');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * 转换为用户模型数据
   * @returns {Object} 用户数据
   */
  toUserData() {
    return {
      username: this.username.trim(),
      email: this.email ? this.email.trim() : null,
      phone: this.phone ? this.phone.trim() : null,
      nickname: this.nickname ? this.nickname.trim() : this.username.trim(),
      status: USER_STATUS.ACTIVE, // 默认激活状态
      email_verified: this.verification_type === 'email',
      phone_verified: this.verification_type === 'sms',
      settings: this.getDefaultSettings(),
      privacy_settings: this.getDefaultPrivacySettings(),
      notification_settings: this.getDefaultNotificationSettings()
    };
  }

  /**
   * 获取默认用户设置
   * @returns {Object} 默认设置
   */
  getDefaultSettings() {
    return {
      language: 'zh-CN',
      timezone: 'Asia/Shanghai',
      theme: 'light',
      avatar_style: 'default'
    };
  }

  /**
   * 获取默认隐私设置
   * @returns {Object} 默认隐私设置
   */
  getDefaultPrivacySettings() {
    return {
      profile_visibility: 'public',
      show_email: false,
      show_phone: false,
      allow_search: true,
      allow_friend_requests: true
    };
  }

  /**
   * 获取默认通知设置
   * @returns {Object} 默认通知设置
   */
  getDefaultNotificationSettings() {
    return {
      email_notifications: true,
      sms_notifications: false,
      push_notifications: true,
      marketing_emails: false,
      security_alerts: true
    };
  }

  /**
   * 转换为日志记录格式
   * @returns {Object} 日志数据
   */
  toLogData() {
    return {
      username: this.username,
      has_email: !!this.email,
      has_phone: !!this.phone,
      verification_type: this.verification_type,
      has_invite_code: !!this.invite_code,
      device_info: this.device_info,
      referrer: this.referrer
    };
  }
}

/**
 * 注册响应DTO
 */
class RegisterResponseDto {
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
    this.requires_verification = data.requires_verification || false; // 是否需要验证
    this.verification_sent_to = data.verification_sent_to || null; // 验证码发送到
    this.next_step = data.next_step || 'complete';    // 下一步操作
  }

  /**
   * 转换为JSON响应格式
   * @returns {Object} JSON响应
   */
  toJSON() {
    const response = {
      user: this.user,
      requires_verification: this.requires_verification,
      next_step: this.next_step
    };

    if (this.verification_sent_to) {
      response.verification_sent_to = this.verification_sent_to;
    }

    if (this.access_token) {
      response.access_token = this.access_token;
      response.refresh_token = this.refresh_token;
      response.expires_in = this.expires_in;
      response.token_type = this.token_type;
    }

    return response;
  }

  /**
   * 转换为客户端安全格式
   * @returns {Object} 客户端响应
   */
  toClientJSON() {
    return {
      user: this.user ? {
        id: this.user.id,
        username: this.user.username,
        nickname: this.user.nickname,
        email_verified: this.user.email_verified,
        phone_verified: this.user.phone_verified
      } : null,
      access_token: this.access_token,
      refresh_token: this.refresh_token,
      expires_in: this.expires_in,
      token_type: this.token_type,
      requires_verification: this.requires_verification,
      verification_sent_to: this.verification_sent_to,
      next_step: this.next_step
    };
  }
}

/**
 * 邮箱注册请求DTO
 */
class EmailRegisterRequestDto extends RegisterRequestDto {
  /**
   * 构造函数
   * @param {Object} data - 请求数据
   */
  constructor(data = {}) {
    super(data);
    this.verification_type = 'email';
  }

  /**
   * 验证邮箱注册数据
   * @returns {Object} 验证结果
   */
  validate() {
    const baseValidation = super.validate();
    
    if (!this.email) {
      baseValidation.errors.push('邮箱不能为空');
    }

    return baseValidation;
  }
}

/**
 * 手机注册请求DTO
 */
class PhoneRegisterRequestDto extends RegisterRequestDto {
  /**
   * 构造函数
   * @param {Object} data - 请求数据
   */
  constructor(data = {}) {
    super(data);
    this.verification_type = 'sms';
  }

  /**
   * 验证手机注册数据
   * @returns {Object} 验证结果
   */
  validate() {
    const baseValidation = super.validate();
    
    if (!this.phone) {
      baseValidation.errors.push('手机号不能为空');
    }

    return baseValidation;
  }
}

/**
 * 微信注册请求DTO
 */
class WechatRegisterRequestDto {
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
    this.username = data.username || null;            // 用户名（可选）
    this.phone = data.phone || null;                  // 手机号（可选）
    this.email = data.email || null;                  // 邮箱（可选）
    this.verification_code = data.verification_code || null; // 验证码（可选）
    this.agree_terms = data.agree_terms || false;     // 同意条款
    this.device_info = data.device_info || {};        // 设备信息
  }

  /**
   * 验证微信注册数据
   * @returns {Object} 验证结果
   */
  validate() {
    const errors = [];

    if (!this.code || this.code.trim() === '') {
      errors.push('微信授权码不能为空');
    }

    if (!this.agree_terms) {
      errors.push('必须同意用户协议和隐私政策');
    }

    // 如果提供了用户名，验证格式
    if (this.username) {
      if (this.username.length < 3) {
        errors.push('用户名长度不能少于3位');
      } else if (this.username.length > 50) {
        errors.push('用户名长度不能超过50位');
      } else if (!/^[a-zA-Z0-9_]+$/.test(this.username)) {
        errors.push('用户名只能包含字母、数字和下划线');
      }
    }

    // 如果提供了手机号，验证格式
    if (this.phone && !/^1[3-9]\d{9}$/.test(this.phone)) {
      errors.push('手机号格式不正确');
    }

    // 如果提供了邮箱，验证格式
    if (this.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email)) {
      errors.push('邮箱格式不正确');
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
      has_username: !!this.username,
      has_phone: !!this.phone,
      has_email: !!this.email,
      device_info: this.device_info
    };
  }
}

/**
 * 验证码验证请求DTO
 */
class VerificationRequestDto {
  /**
   * 构造函数
   * @param {Object} data - 请求数据
   */
  constructor(data = {}) {
    this.type = data.type || 'email';               // 验证类型 (email, sms)
    this.target = data.target || null;              // 验证目标（邮箱或手机号）
    this.code = data.code || null;                  // 验证码
    this.token = data.token || null;                // 验证令牌
  }

  /**
   * 验证验证码请求数据
   * @returns {Object} 验证结果
   */
  validate() {
    const errors = [];

    const validTypes = ['email', 'sms'];
    if (!validTypes.includes(this.type)) {
      errors.push('验证类型无效');
    }

    if (!this.target || this.target.trim() === '') {
      errors.push('验证目标不能为空');
    } else {
      if (this.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.target)) {
        errors.push('邮箱格式不正确');
      } else if (this.type === 'sms' && !/^1[3-9]\d{9}$/.test(this.target)) {
        errors.push('手机号格式不正确');
      }
    }

    if (!this.code || this.code.trim() === '') {
      errors.push('验证码不能为空');
    } else if (!/^\d{4,6}$/.test(this.code)) {
      errors.push('验证码格式不正确');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

module.exports = {
  RegisterRequestDto,
  RegisterResponseDto,
  EmailRegisterRequestDto,
  PhoneRegisterRequestDto,
  WechatRegisterRequestDto,
  VerificationRequestDto
}; 