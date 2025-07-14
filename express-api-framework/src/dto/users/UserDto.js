/**
 * 用户数据传输对象
 * 定义用户相关的数据传输对象，包括更新、查询等操作
 */

const { USER_STATUS, GENDER } = require('../../constants/status');

/**
 * 用户更新请求DTO
 */
class UserUpdateRequestDto {
  /**
   * 构造函数
   * @param {Object} data - 请求数据
   */
  constructor(data = {}) {
    this.nickname = data.nickname !== undefined ? data.nickname : null;
    this.email = data.email !== undefined ? data.email : null;
    this.phone = data.phone !== undefined ? data.phone : null;
    this.avatar = data.avatar !== undefined ? data.avatar : null;
    this.gender = data.gender !== undefined ? data.gender : null;
    this.birthday = data.birthday !== undefined ? data.birthday : null;
    this.bio = data.bio !== undefined ? data.bio : null;
    this.location = data.location !== undefined ? data.location : null;
    this.website = data.website !== undefined ? data.website : null;
    this.profile = data.profile !== undefined ? data.profile : null;
  }

  /**
   * 验证更新数据
   * @returns {Object} 验证结果
   */
  validate() {
    const errors = [];

    // 验证昵称
    if (this.nickname !== null) {
      if (typeof this.nickname !== 'string') {
        errors.push('昵称必须为字符串');
      } else if (this.nickname.trim() === '') {
        errors.push('昵称不能为空');
      } else if (this.nickname.length > 100) {
        errors.push('昵称长度不能超过100位');
      }
    }

    // 验证邮箱
    if (this.email !== null) {
      if (typeof this.email !== 'string') {
        errors.push('邮箱必须为字符串');
      } else if (this.email.trim() !== '' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email)) {
        errors.push('邮箱格式不正确');
      }
    }

    // 验证手机号
    if (this.phone !== null) {
      if (typeof this.phone !== 'string') {
        errors.push('手机号必须为字符串');
      } else if (this.phone.trim() !== '' && !/^1[3-9]\d{9}$/.test(this.phone)) {
        errors.push('手机号格式不正确');
      }
    }

    // 验证性别
    if (this.gender !== null) {
      const validGenders = Object.values(GENDER);
      if (!validGenders.includes(this.gender)) {
        errors.push('性别值无效');
      }
    }

    // 验证生日
    if (this.birthday !== null) {
      if (typeof this.birthday === 'string') {
        const birthDate = new Date(this.birthday);
        if (isNaN(birthDate.getTime())) {
          errors.push('生日格式不正确');
        } else if (birthDate > new Date()) {
          errors.push('生日不能是未来日期');
        }
      } else if (!(this.birthday instanceof Date)) {
        errors.push('生日必须为日期格式');
      }
    }

    // 验证个人简介
    if (this.bio !== null && typeof this.bio === 'string' && this.bio.length > 500) {
      errors.push('个人简介长度不能超过500位');
    }

    // 验证地址
    if (this.location !== null && typeof this.location === 'string' && this.location.length > 200) {
      errors.push('地址长度不能超过200位');
    }

    // 验证网站
    if (this.website !== null && typeof this.website === 'string') {
      if (this.website.trim() !== '' && !/^https?:\/\/.+/.test(this.website)) {
        errors.push('网站地址格式不正确');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * 转换为更新数据（过滤空值）
   * @returns {Object} 更新数据
   */
  toUpdateData() {
    const updateData = {};
    
    if (this.nickname !== null) updateData.nickname = this.nickname;
    if (this.email !== null) updateData.email = this.email;
    if (this.phone !== null) updateData.phone = this.phone;
    if (this.avatar !== null) updateData.avatar = this.avatar;
    if (this.gender !== null) updateData.gender = this.gender;
    if (this.birthday !== null) updateData.birthday = this.birthday;
    if (this.bio !== null) updateData.bio = this.bio;
    if (this.location !== null) updateData.location = this.location;
    if (this.website !== null) updateData.website = this.website;
    if (this.profile !== null) updateData.profile = this.profile;

    return updateData;
  }

  /**
   * 转换为日志记录格式
   * @returns {Object} 日志数据
   */
  toLogData() {
    const fieldsUpdated = [];
    
    if (this.nickname !== null) fieldsUpdated.push('nickname');
    if (this.email !== null) fieldsUpdated.push('email');
    if (this.phone !== null) fieldsUpdated.push('phone');
    if (this.avatar !== null) fieldsUpdated.push('avatar');
    if (this.gender !== null) fieldsUpdated.push('gender');
    if (this.birthday !== null) fieldsUpdated.push('birthday');
    if (this.bio !== null) fieldsUpdated.push('bio');
    if (this.location !== null) fieldsUpdated.push('location');
    if (this.website !== null) fieldsUpdated.push('website');
    if (this.profile !== null) fieldsUpdated.push('profile');

    return {
      fields_updated: fieldsUpdated,
      update_count: fieldsUpdated.length
    };
  }
}

/**
 * 用户查询请求DTO
 */
class UserQueryRequestDto {
  /**
   * 构造函数
   * @param {Object} data - 请求数据
   */
  constructor(data = {}) {
    this.page = parseInt(data.page) || 1;
    this.page_size = parseInt(data.page_size) || 10;
    this.keyword = data.keyword || null;
    this.status = data.status || null;
    this.role_id = data.role_id ? parseInt(data.role_id) : null;
    this.email_verified = data.email_verified !== undefined ? data.email_verified === 'true' : null;
    this.phone_verified = data.phone_verified !== undefined ? data.phone_verified === 'true' : null;
    this.wechat_bound = data.wechat_bound !== undefined ? data.wechat_bound === 'true' : null;
    this.gender = data.gender !== undefined ? parseInt(data.gender) : null;
    this.created_start = data.created_start || null;
    this.created_end = data.created_end || null;
    this.sort_by = data.sort_by || 'created_at';
    this.sort_order = data.sort_order || 'desc';
  }

  /**
   * 验证查询参数
   * @returns {Object} 验证结果
   */
  validate() {
    const errors = [];

    // 验证分页参数
    if (this.page < 1) {
      errors.push('页码必须大于0');
    }
    if (this.page_size < 1 || this.page_size > 100) {
      errors.push('每页条数必须在1-100之间');
    }

    // 验证状态
    if (this.status !== null) {
      const validStatuses = Object.values(USER_STATUS);
      if (!validStatuses.includes(this.status)) {
        errors.push('用户状态无效');
      }
    }

    // 验证性别
    if (this.gender !== null) {
      const validGenders = Object.values(GENDER);
      if (!validGenders.includes(this.gender)) {
        errors.push('性别值无效');
      }
    }

    // 验证日期格式
    if (this.created_start && isNaN(new Date(this.created_start).getTime())) {
      errors.push('创建开始日期格式不正确');
    }
    if (this.created_end && isNaN(new Date(this.created_end).getTime())) {
      errors.push('创建结束日期格式不正确');
    }

    // 验证排序字段
    const validSortFields = ['id', 'username', 'nickname', 'email', 'phone', 'created_at', 'updated_at', 'login_count'];
    if (!validSortFields.includes(this.sort_by)) {
      errors.push('排序字段无效');
    }

    // 验证排序方向
    if (!['asc', 'desc'].includes(this.sort_order)) {
      errors.push('排序方向无效');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * 转换为查询条件
   * @returns {Object} 查询条件
   */
  toQueryConditions() {
    const conditions = {};
    
    if (this.keyword) {
      conditions.keyword = this.keyword.trim();
    }
    if (this.status !== null) {
      conditions.status = this.status;
    }
    if (this.role_id !== null) {
      conditions.role_id = this.role_id;
    }
    if (this.email_verified !== null) {
      conditions.email_verified = this.email_verified;
    }
    if (this.phone_verified !== null) {
      conditions.phone_verified = this.phone_verified;
    }
    if (this.wechat_bound !== null) {
      conditions.wechat_bound = this.wechat_bound;
    }
    if (this.gender !== null) {
      conditions.gender = this.gender;
    }
    if (this.created_start) {
      conditions.created_start = new Date(this.created_start);
    }
    if (this.created_end) {
      conditions.created_end = new Date(this.created_end);
    }

    return conditions;
  }

  /**
   * 获取分页信息
   * @returns {Object} 分页信息
   */
  getPagination() {
    return {
      page: this.page,
      page_size: this.page_size,
      offset: (this.page - 1) * this.page_size
    };
  }

  /**
   * 获取排序信息
   * @returns {Object} 排序信息
   */
  getSort() {
    return {
      sort_by: this.sort_by,
      sort_order: this.sort_order
    };
  }
}

/**
 * 用户设置更新DTO
 */
class UserSettingsUpdateDto {
  /**
   * 构造函数
   * @param {Object} data - 请求数据
   */
  constructor(data = {}) {
    this.language = data.language || null;
    this.timezone = data.timezone || null;
    this.theme = data.theme || null;
    this.avatar_style = data.avatar_style || null;
    this.date_format = data.date_format || null;
    this.time_format = data.time_format || null;
  }

  /**
   * 验证设置数据
   * @returns {Object} 验证结果
   */
  validate() {
    const errors = [];

    // 验证语言
    if (this.language !== null) {
      const validLanguages = ['zh-CN', 'zh-TW', 'en-US', 'ja-JP', 'ko-KR'];
      if (!validLanguages.includes(this.language)) {
        errors.push('语言设置无效');
      }
    }

    // 验证主题
    if (this.theme !== null) {
      const validThemes = ['light', 'dark', 'auto'];
      if (!validThemes.includes(this.theme)) {
        errors.push('主题设置无效');
      }
    }

    // 验证头像样式
    if (this.avatar_style !== null) {
      const validStyles = ['default', 'circle', 'square', 'rounded'];
      if (!validStyles.includes(this.avatar_style)) {
        errors.push('头像样式无效');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * 转换为设置数据
   * @returns {Object} 设置数据
   */
  toSettingsData() {
    const settings = {};
    
    if (this.language !== null) settings.language = this.language;
    if (this.timezone !== null) settings.timezone = this.timezone;
    if (this.theme !== null) settings.theme = this.theme;
    if (this.avatar_style !== null) settings.avatar_style = this.avatar_style;
    if (this.date_format !== null) settings.date_format = this.date_format;
    if (this.time_format !== null) settings.time_format = this.time_format;

    return settings;
  }
}

/**
 * 用户密码修改DTO
 */
class UserPasswordChangeDto {
  /**
   * 构造函数
   * @param {Object} data - 请求数据
   */
  constructor(data = {}) {
    this.current_password = data.current_password || null;
    this.new_password = data.new_password || null;
    this.new_password_confirm = data.new_password_confirm || null;
  }

  /**
   * 验证密码数据
   * @returns {Object} 验证结果
   */
  validate() {
    const errors = [];
    const crypto = require('../../utils/crypto');

    // 验证当前密码
    if (!this.current_password || this.current_password.trim() === '') {
      errors.push('当前密码不能为空');
    }

    // 验证新密码
    if (!this.new_password || this.new_password.trim() === '') {
      errors.push('新密码不能为空');
    } else {
      const passwordValidation = crypto.validatePasswordStrength(this.new_password);
      if (!passwordValidation.isValid) {
        errors.push(...passwordValidation.errors);
      }
    }

    // 验证确认密码
    if (!this.new_password_confirm || this.new_password_confirm.trim() === '') {
      errors.push('确认密码不能为空');
    } else if (this.new_password !== this.new_password_confirm) {
      errors.push('两次输入的新密码不一致');
    }

    // 验证新密码不能与当前密码相同
    if (this.current_password === this.new_password) {
      errors.push('新密码不能与当前密码相同');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

/**
 * 用户响应DTO
 */
class UserResponseDto {
  /**
   * 构造函数
   * @param {Object} user - 用户数据
   * @param {Object} options - 选项
   */
  constructor(user, options = {}) {
    this.user = user;
    this.includePrivate = options.includePrivate || false;
    this.includeStats = options.includeStats || false;
    this.includeRole = options.includeRole || false;
  }

  /**
   * 转换为JSON响应格式
   * @returns {Object} JSON响应
   */
  toJSON() {
    if (!this.user) return null;

    const response = {
      id: this.user.id,
      username: this.user.username,
      nickname: this.user.nickname,
      email: this.includePrivate ? this.user.email : null,
      phone: this.includePrivate ? this.user.phone : null,
      avatar: this.user.avatar,
      gender: this.user.gender,
      birthday: this.user.birthday,
      bio: this.user.bio,
      location: this.user.location,
      website: this.user.website,
      status: this.user.status,
      email_verified: this.user.email_verified,
      phone_verified: this.user.phone_verified,
      wechat_bound: this.user.wechat_bound,
      created_at: this.user.created_at,
      updated_at: this.user.updated_at
    };

    // 包含私有信息
    if (this.includePrivate) {
      response.last_login_time = this.user.last_login_time;
      response.login_count = this.user.login_count;
      response.settings = this.user.settings;
      response.privacy_settings = this.user.privacy_settings;
      response.notification_settings = this.user.notification_settings;
    }

    // 包含统计信息
    if (this.includeStats) {
      response.stats = this.user.getStats ? this.user.getStats() : null;
    }

    // 包含角色信息
    if (this.includeRole && this.user.role) {
      response.role = {
        id: this.user.role.id,
        name: this.user.role.name,
        code: this.user.role.code,
        type: this.user.role.type
      };
    }

    return response;
  }

  /**
   * 转换为公开信息格式
   * @returns {Object} 公开信息
   */
  toPublicJSON() {
    if (!this.user) return null;

    return {
      id: this.user.id,
      username: this.user.username,
      nickname: this.user.nickname,
      avatar: this.user.avatar,
      bio: this.user.bio,
      location: this.user.location,
      website: this.user.website,
      created_at: this.user.created_at
    };
  }
}

/**
 * 用户列表响应DTO
 */
class UserListResponseDto {
  /**
   * 构造函数
   * @param {Array} users - 用户列表
   * @param {Object} pagination - 分页信息
   * @param {Object} options - 选项
   */
  constructor(users, pagination, options = {}) {
    this.users = users || [];
    this.pagination = pagination || {};
    this.includePrivate = options.includePrivate || false;
    this.includeStats = options.includeStats || false;
    this.includeRole = options.includeRole || false;
  }

  /**
   * 转换为JSON响应格式
   * @returns {Object} JSON响应
   */
  toJSON() {
    const items = this.users.map(user => {
      const userDto = new UserResponseDto(user, {
        includePrivate: this.includePrivate,
        includeStats: this.includeStats,
        includeRole: this.includeRole
      });
      return userDto.toJSON();
    });

    return {
      items,
      pagination: this.pagination
    };
  }
}

module.exports = {
  UserUpdateRequestDto,
  UserQueryRequestDto,
  UserSettingsUpdateDto,
  UserPasswordChangeDto,
  UserResponseDto,
  UserListResponseDto
}; 