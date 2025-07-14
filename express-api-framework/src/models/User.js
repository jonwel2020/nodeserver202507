const BaseModel = require('./base/BaseModel');
const { ROLES } = require('../constants/roles');
const { USER_STATUS } = require('../constants/status');
const crypto = require('../utils/crypto');

/**
 * 用户模型类
 * 管理用户的基本信息、认证状态、角色权限等
 */
class User extends BaseModel {
  /**
   * 构造函数
   * @param {Object} data - 用户数据
   */
  constructor(data = {}) {
    super(data);
    
    // 基本信息
    this.username = data.username || null;          // 用户名（登录名）
    this.nickname = data.nickname || null;          // 昵称（显示名）
    this.email = data.email || null;                // 邮箱
    this.phone = data.phone || null;                // 手机号
    this.avatar = data.avatar || null;              // 头像URL
    
    // 认证信息
    this.password = data.password || null;          // 密码（加密存储）
    this.salt = data.salt || null;                  // 密码盐值
    this.status = data.status || USER_STATUS.ACTIVE; // 用户状态
    this.role_id = data.role_id || ROLES.API_USER.id; // 角色ID
    
    // 安全信息
    this.last_login_time = data.last_login_time || null;     // 最后登录时间
    this.last_login_ip = data.last_login_ip || null;         // 最后登录IP
    this.login_failure_count = data.login_failure_count || 0; // 登录失败次数
    this.locked_until = data.locked_until || null;           // 锁定到期时间
    this.password_changed_at = data.password_changed_at || null; // 密码修改时间
    
    // 微信绑定信息
    this.wechat_openid = data.wechat_openid || null;         // 微信OpenID
    this.wechat_unionid = data.wechat_unionid || null;       // 微信UnionID
    this.wechat_nickname = data.wechat_nickname || null;     // 微信昵称
    this.wechat_avatar = data.wechat_avatar || null;         // 微信头像
    
    // 用户设置
    this.settings = data.settings || {};            // 用户个人设置（JSON）
    this.privacy_settings = data.privacy_settings || {}; // 隐私设置（JSON）
    this.notification_settings = data.notification_settings || {}; // 通知设置（JSON）
    
    // 统计信息
    this.login_count = data.login_count || 0;       // 登录次数
    this.email_verified = data.email_verified || false;     // 邮箱是否验证
    this.phone_verified = data.phone_verified || false;     // 手机是否验证
    this.wechat_bound = data.wechat_bound || false;         // 是否绑定微信
    
    // 业务字段
    this.profile = data.profile || {};              // 扩展个人资料（JSON）
    this.tags = data.tags || [];                    // 用户标签
    this.remarks = data.remarks || null;            // 管理员备注
  }

  /**
   * 获取数据库表名
   * @returns {string} 表名
   */
  static getTableName() {
    return 'users';
  }

  /**
   * 获取字段映射
   * @returns {Object} 字段映射
   */
  static getFieldMapping() {
    return {
      id: 'id',
      username: 'username',
      nickname: 'nickname',
      email: 'email',
      phone: 'phone',
      avatar: 'avatar',
      password: 'password',
      salt: 'salt',
      status: 'status',
      role_id: 'role_id',
      last_login_time: 'last_login_time',
      last_login_ip: 'last_login_ip',
      login_failure_count: 'login_failure_count',
      locked_until: 'locked_until',
      password_changed_at: 'password_changed_at',
      wechat_openid: 'wechat_openid',
      wechat_unionid: 'wechat_unionid',
      wechat_nickname: 'wechat_nickname',
      wechat_avatar: 'wechat_avatar',
      settings: 'settings',
      privacy_settings: 'privacy_settings',
      notification_settings: 'notification_settings',
      login_count: 'login_count',
      email_verified: 'email_verified',
      phone_verified: 'phone_verified',
      wechat_bound: 'wechat_bound',
      profile: 'profile',
      tags: 'tags',
      remarks: 'remarks',
      created_at: 'created_at',
      updated_at: 'updated_at',
      deleted_at: 'deleted_at',
      version: 'version'
    };
  }

  /**
   * 获取验证规则
   * @returns {Object} 验证规则
   */
  static getValidationRules() {
    return {
      username: {
        required: true,
        type: 'string',
        min: 3,
        max: 50,
        pattern: /^[a-zA-Z0-9_]+$/,
        message: '用户名长度3-50位，只能包含字母、数字和下划线'
      },
      nickname: {
        required: false,
        type: 'string',
        min: 1,
        max: 100,
        message: '昵称长度1-100位'
      },
      email: {
        required: false,
        type: 'email',
        message: '请输入有效的邮箱地址'
      },
      phone: {
        required: false,
        type: 'string',
        pattern: /^1[3-9]\d{9}$/,
        message: '请输入有效的手机号码'
      },
      password: {
        required: true,
        type: 'string',
        min: 6,
        max: 100,
        message: '密码长度6-100位'
      },
      status: {
        required: true,
        type: 'string',
        enum: Object.values(USER_STATUS),
        message: '用户状态无效'
      },
      role_id: {
        required: true,
        type: 'number',
        min: 1,
        message: '角色ID必须为正整数'
      }
    };
  }

  /**
   * 设置密码（自动加密）
   * @param {string} plainPassword - 明文密码
   */
  setPassword(plainPassword) {
    const { hash, salt } = crypto.hashPassword(plainPassword);
    this.password = hash;
    this.salt = salt;
    this.password_changed_at = new Date();
  }

  /**
   * 验证密码
   * @param {string} plainPassword - 明文密码
   * @returns {boolean} 验证结果
   */
  verifyPassword(plainPassword) {
    return crypto.verifyPassword(plainPassword, this.password, this.salt);
  }

  /**
   * 检查账户是否被锁定
   * @returns {boolean} 锁定状态
   */
  isLocked() {
    if (!this.locked_until) return false;
    return new Date() < new Date(this.locked_until);
  }

  /**
   * 锁定账户
   * @param {number} minutes - 锁定分钟数，默认30分钟
   */
  lockAccount(minutes = 30) {
    this.locked_until = new Date(Date.now() + minutes * 60 * 1000);
  }

  /**
   * 解锁账户
   */
  unlockAccount() {
    this.locked_until = null;
    this.login_failure_count = 0;
  }

  /**
   * 记录登录失败
   */
  recordLoginFailure() {
    this.login_failure_count += 1;
    
    // 连续失败5次后锁定账户30分钟
    if (this.login_failure_count >= 5) {
      this.lockAccount(30);
    }
  }

  /**
   * 记录成功登录
   * @param {string} ip - 登录IP
   */
  recordSuccessLogin(ip) {
    this.last_login_time = new Date();
    this.last_login_ip = ip;
    this.login_count += 1;
    this.login_failure_count = 0;
    this.locked_until = null;
  }

  /**
   * 检查用户是否激活
   * @returns {boolean} 激活状态
   */
  isActive() {
    return this.status === USER_STATUS.ACTIVE;
  }

  /**
   * 检查邮箱是否已验证
   * @returns {boolean} 验证状态
   */
  isEmailVerified() {
    return this.email_verified === true;
  }

  /**
   * 检查手机是否已验证
   * @returns {boolean} 验证状态
   */
  isPhoneVerified() {
    return this.phone_verified === true;
  }

  /**
   * 检查是否绑定微信
   * @returns {boolean} 绑定状态
   */
  isWechatBound() {
    return this.wechat_bound === true && this.wechat_openid;
  }

  /**
   * 绑定微信
   * @param {Object} wechatInfo - 微信信息
   */
  bindWechat(wechatInfo) {
    this.wechat_openid = wechatInfo.openid;
    this.wechat_unionid = wechatInfo.unionid || null;
    this.wechat_nickname = wechatInfo.nickname || null;
    this.wechat_avatar = wechatInfo.headimgurl || null;
    this.wechat_bound = true;
  }

  /**
   * 解绑微信
   */
  unbindWechat() {
    this.wechat_openid = null;
    this.wechat_unionid = null;
    this.wechat_nickname = null;
    this.wechat_avatar = null;
    this.wechat_bound = false;
  }

  /**
   * 更新用户设置
   * @param {Object} settings - 设置对象
   */
  updateSettings(settings) {
    this.settings = { ...this.settings, ...settings };
  }

  /**
   * 更新隐私设置
   * @param {Object} privacySettings - 隐私设置对象
   */
  updatePrivacySettings(privacySettings) {
    this.privacy_settings = { ...this.privacy_settings, ...privacySettings };
  }

  /**
   * 更新通知设置
   * @param {Object} notificationSettings - 通知设置对象
   */
  updateNotificationSettings(notificationSettings) {
    this.notification_settings = { ...this.notification_settings, ...notificationSettings };
  }

  /**
   * 转换为JSON（安全输出，隐藏敏感信息）
   * @param {boolean} includePrivate - 是否包含私有信息
   * @returns {Object} JSON对象
   */
  toJSON(includePrivate = false) {
    const data = super.toJSON();
    
    // 移除敏感字段
    delete data.password;
    delete data.salt;
    
    if (!includePrivate) {
      delete data.login_failure_count;
      delete data.locked_until;
      delete data.wechat_openid;
      delete data.wechat_unionid;
      delete data.last_login_ip;
      delete data.remarks;
    }
    
    return data;
  }

  /**
   * 转换为公开信息（用于其他用户查看）
   * @returns {Object} 公开信息对象
   */
  toPublicJSON() {
    return {
      id: this.id,
      username: this.username,
      nickname: this.nickname,
      avatar: this.avatar,
      created_at: this.created_at
    };
  }

  /**
   * 获取显示名称
   * @returns {string} 显示名称
   */
  getDisplayName() {
    return this.nickname || this.username || `用户${this.id}`;
  }

  /**
   * 获取头像URL（含默认头像处理）
   * @returns {string} 头像URL
   */
  getAvatarUrl() {
    if (this.avatar) {
      return this.avatar;
    }
    if (this.wechat_avatar) {
      return this.wechat_avatar;
    }
    // 返回默认头像
    return `/images/default-avatar.png`;
  }

  /**
   * 获取用户统计信息
   * @returns {Object} 统计信息
   */
  getStats() {
    return {
      login_count: this.login_count,
      last_login_time: this.last_login_time,
      email_verified: this.email_verified,
      phone_verified: this.phone_verified,
      wechat_bound: this.wechat_bound,
      created_at: this.created_at,
      days_since_registration: Math.floor((Date.now() - new Date(this.created_at)) / (1000 * 60 * 60 * 24))
    };
  }
}

module.exports = User; 