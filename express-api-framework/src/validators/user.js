/**
 * 用户相关的数据验证器
 * 包括用户信息更新、查询、设置等验证
 */

const Joi = require('joi');
const { USER_STATUS, GENDER } = require('../constants/status');

/**
 * 用户ID验证规则
 */
const userIdSchema = Joi.number()
  .integer()
  .min(1)
  .required()
  .messages({
    'number.base': '用户ID必须为数字',
    'number.integer': '用户ID必须为整数',
    'number.min': '用户ID必须大于0',
    'any.required': '用户ID不能为空'
  });

/**
 * 昵称验证规则
 */
const nicknameSchema = Joi.string()
  .min(1)
  .max(100)
  .messages({
    'string.empty': '昵称不能为空',
    'string.min': '昵称长度不能少于1位',
    'string.max': '昵称长度不能超过100位'
  });

/**
 * 邮箱验证规则
 */
const emailSchema = Joi.string()
  .email()
  .max(255)
  .messages({
    'string.email': '邮箱格式不正确',
    'string.max': '邮箱长度不能超过255位'
  });

/**
 * 手机号验证规则
 */
const phoneSchema = Joi.string()
  .pattern(/^1[3-9]\d{9}$/)
  .messages({
    'string.pattern.base': '手机号格式不正确'
  });

/**
 * 头像URL验证规则
 */
const avatarSchema = Joi.string()
  .uri()
  .max(500)
  .allow('')
  .messages({
    'string.uri': '头像地址格式不正确',
    'string.max': '头像地址长度不能超过500位'
  });

/**
 * 性别验证规则
 */
const genderSchema = Joi.number()
  .valid(...Object.values(GENDER))
  .messages({
    'any.only': '性别值无效'
  });

/**
 * 生日验证规则
 */
const birthdaySchema = Joi.date()
  .max('now')
  .messages({
    'date.base': '生日格式不正确',
    'date.max': '生日不能是未来日期'
  });

/**
 * 个人简介验证规则
 */
const bioSchema = Joi.string()
  .max(500)
  .allow('')
  .messages({
    'string.max': '个人简介长度不能超过500位'
  });

/**
 * 地址验证规则
 */
const locationSchema = Joi.string()
  .max(200)
  .allow('')
  .messages({
    'string.max': '地址长度不能超过200位'
  });

/**
 * 网站验证规则
 */
const websiteSchema = Joi.string()
  .uri()
  .max(500)
  .allow('')
  .messages({
    'string.uri': '网站地址格式不正确',
    'string.max': '网站地址长度不能超过500位'
  });

/**
 * 用户更新验证
 */
const validateUserUpdate = Joi.object({
  nickname: nicknameSchema.optional(),
  email: emailSchema.optional(),
  phone: phoneSchema.optional(),
  avatar: avatarSchema.optional(),
  gender: genderSchema.optional(),
  birthday: birthdaySchema.optional(),
  bio: bioSchema.optional(),
  location: locationSchema.optional(),
  website: websiteSchema.optional(),
  profile: Joi.object().unknown(true).optional()
}).min(1).messages({
  'object.min': '至少需要提供一个更新字段'
});

/**
 * 用户查询验证
 */
const validateUserQuery = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  page_size: Joi.number().integer().min(1).max(100).default(10),
  keyword: Joi.string().max(100).allow(''),
  status: Joi.string().valid(...Object.values(USER_STATUS)).optional(),
  role_id: Joi.number().integer().min(1).optional(),
  email_verified: Joi.boolean().optional(),
  phone_verified: Joi.boolean().optional(),
  wechat_bound: Joi.boolean().optional(),
  gender: genderSchema.optional(),
  created_start: Joi.date().optional(),
  created_end: Joi.date().min(Joi.ref('created_start')).optional(),
  sort_by: Joi.string()
    .valid('id', 'username', 'nickname', 'email', 'phone', 'created_at', 'updated_at', 'login_count')
    .default('created_at'),
  sort_order: Joi.string().valid('asc', 'desc').default('desc')
}).messages({
  'date.min': '结束日期不能早于开始日期'
});

/**
 * 用户设置更新验证
 */
const validateUserSettings = Joi.object({
  language: Joi.string().valid('zh-CN', 'zh-TW', 'en-US', 'ja-JP', 'ko-KR').optional(),
  timezone: Joi.string().max(50).optional(),
  theme: Joi.string().valid('light', 'dark', 'auto').optional(),
  avatar_style: Joi.string().valid('default', 'circle', 'square', 'rounded').optional(),
  date_format: Joi.string().max(20).optional(),
  time_format: Joi.string().max(20).optional()
}).min(1).messages({
  'object.min': '至少需要提供一个设置字段',
  'any.only': '设置值无效'
});

/**
 * 隐私设置更新验证
 */
const validatePrivacySettings = Joi.object({
  profile_visibility: Joi.string().valid('public', 'friends', 'private').optional(),
  show_email: Joi.boolean().optional(),
  show_phone: Joi.boolean().optional(),
  allow_search: Joi.boolean().optional(),
  allow_friend_requests: Joi.boolean().optional(),
  show_online_status: Joi.boolean().optional(),
  show_last_seen: Joi.boolean().optional()
}).min(1).messages({
  'object.min': '至少需要提供一个隐私设置字段',
  'any.only': '隐私设置值无效'
});

/**
 * 通知设置更新验证
 */
const validateNotificationSettings = Joi.object({
  email_notifications: Joi.boolean().optional(),
  sms_notifications: Joi.boolean().optional(),
  push_notifications: Joi.boolean().optional(),
  marketing_emails: Joi.boolean().optional(),
  security_alerts: Joi.boolean().optional(),
  system_notifications: Joi.boolean().optional(),
  friend_requests: Joi.boolean().optional(),
  comments: Joi.boolean().optional(),
  mentions: Joi.boolean().optional()
}).min(1).messages({
  'object.min': '至少需要提供一个通知设置字段'
});

/**
 * 密码修改验证
 */
const validatePasswordChange = Joi.object({
  current_password: Joi.string().required().messages({
    'string.empty': '当前密码不能为空',
    'any.required': '当前密码不能为空'
  }),
  new_password: Joi.string()
    .min(6)
    .max(100)
    .required()
    .messages({
      'string.empty': '新密码不能为空',
      'string.min': '新密码长度不能少于6位',
      'string.max': '新密码长度不能超过100位',
      'any.required': '新密码不能为空'
    }),
  new_password_confirm: Joi.string()
    .valid(Joi.ref('new_password'))
    .required()
    .messages({
      'any.only': '两次输入的新密码不一致',
      'any.required': '确认密码不能为空'
    })
});

/**
 * 头像上传验证
 */
const validateAvatarUpload = Joi.object({
  file: Joi.object({
    fieldname: Joi.string().required(),
    originalname: Joi.string().required(),
    encoding: Joi.string().required(),
    mimetype: Joi.string().valid('image/jpeg', 'image/png', 'image/gif', 'image/webp').required(),
    size: Joi.number().max(5 * 1024 * 1024).required(), // 5MB
    buffer: Joi.binary().required()
  }).required().messages({
    'any.required': '请选择要上传的头像文件',
    'any.only': '头像文件格式不支持，请上传jpg、png、gif或webp格式的图片',
    'number.max': '头像文件大小不能超过5MB'
  })
});

/**
 * 手机绑定验证
 */
const validatePhoneBind = Joi.object({
  phone: phoneSchema.required(),
  verification_code: Joi.string()
    .min(4)
    .max(6)
    .pattern(/^\d+$/)
    .required()
    .messages({
      'string.min': '验证码长度不能少于4位',
      'string.max': '验证码长度不能超过6位',
      'string.pattern.base': '验证码必须为数字',
      'any.required': '验证码不能为空'
    }),
  password: Joi.string().optional() // 某些情况下需要密码确认
});

/**
 * 邮箱绑定验证
 */
const validateEmailBind = Joi.object({
  email: emailSchema.required(),
  verification_code: Joi.string()
    .min(4)
    .max(6)
    .pattern(/^\d+$/)
    .required()
    .messages({
      'string.min': '验证码长度不能少于4位',
      'string.max': '验证码长度不能超过6位',
      'string.pattern.base': '验证码必须为数字',
      'any.required': '验证码不能为空'
    }),
  password: Joi.string().optional() // 某些情况下需要密码确认
});

/**
 * 微信绑定验证
 */
const validateWechatBind = Joi.object({
  code: Joi.string().required().messages({
    'string.empty': '微信授权码不能为空',
    'any.required': '微信授权码不能为空'
  }),
  encrypted_data: Joi.string().allow(''),
  iv: Joi.string().allow(''),
  signature: Joi.string().allow(''),
  raw_data: Joi.string().allow(''),
  password: Joi.string().optional() // 某些情况下需要密码确认
});

/**
 * 账户注销验证
 */
const validateAccountDeactivate = Joi.object({
  password: Joi.string().required().messages({
    'string.empty': '密码不能为空',
    'any.required': '密码不能为空'
  }),
  reason: Joi.string().max(500).allow('').optional(),
  feedback: Joi.string().max(1000).allow('').optional(),
  confirm: Joi.boolean().valid(true).required().messages({
    'any.only': '必须确认注销操作',
    'any.required': '必须确认注销操作'
  })
});

/**
 * 用户反馈验证
 */
const validateUserFeedback = Joi.object({
  type: Joi.string().valid('bug', 'suggestion', 'complaint', 'other').required(),
  title: Joi.string().min(5).max(200).required().messages({
    'string.min': '标题长度不能少于5位',
    'string.max': '标题长度不能超过200位',
    'any.required': '标题不能为空'
  }),
  content: Joi.string().min(10).max(2000).required().messages({
    'string.min': '内容长度不能少于10位',
    'string.max': '内容长度不能超过2000位',
    'any.required': '内容不能为空'
  }),
  contact_email: emailSchema.optional(),
  attachments: Joi.array().items(Joi.string().uri()).max(5).optional()
});

/**
 * 管理员用户操作验证
 */
const validateAdminUserUpdate = Joi.object({
  status: Joi.string().valid(...Object.values(USER_STATUS)).optional(),
  role_id: Joi.number().integer().min(1).optional(),
  email_verified: Joi.boolean().optional(),
  phone_verified: Joi.boolean().optional(),
  remarks: Joi.string().max(1000).allow('').optional(),
  tags: Joi.array().items(Joi.string().max(50)).max(10).optional()
}).min(1).messages({
  'object.min': '至少需要提供一个更新字段'
});

/**
 * 批量用户操作验证
 */
const validateBatchUserOperation = Joi.object({
  user_ids: Joi.array()
    .items(userIdSchema)
    .min(1)
    .max(100)
    .unique()
    .required()
    .messages({
      'array.min': '至少需要选择一个用户',
      'array.max': '最多只能选择100个用户',
      'array.unique': '用户ID不能重复',
      'any.required': '用户ID列表不能为空'
    }),
  operation: Joi.string()
    .valid('activate', 'deactivate', 'suspend', 'ban', 'delete', 'change_role')
    .required(),
  params: Joi.object().when('operation', {
    is: 'change_role',
    then: Joi.object({
      role_id: Joi.number().integer().min(1).required()
    }).required(),
    otherwise: Joi.object().optional()
  })
});

/**
 * 用户统计查询验证
 */
const validateUserStats = Joi.object({
  start_date: Joi.date().optional(),
  end_date: Joi.date().min(Joi.ref('start_date')).optional(),
  group_by: Joi.string().valid('day', 'week', 'month', 'year').default('day'),
  metrics: Joi.array()
    .items(Joi.string().valid('registrations', 'logins', 'active_users', 'retention'))
    .min(1)
    .unique()
    .default(['registrations'])
}).messages({
  'date.min': '结束日期不能早于开始日期'
});

/**
 * 验证中间件生成器
 * @param {Object} schema - Joi验证模式
 * @param {string} source - 数据源 ('body', 'query', 'params')
 * @returns {Function} Express中间件
 */
function createValidator(schema, source = 'body') {
  return (req, res, next) => {
    const data = req[source];
    const { error, value } = schema.validate(data, {
      abortEarly: false,
      allowUnknown: false,
      stripUnknown: true
    });

    if (error) {
      const errors = error.details.map(detail => detail.message);
      return res.validationError('数据验证失败', errors);
    }

    // 将验证后的数据替换原始数据
    req[source] = value;
    next();
  };
}

/**
 * 参数验证中间件（用于路径参数）
 */
const validateUserId = createValidator(
  Joi.object({
    id: userIdSchema
  }),
  'params'
);

// 导出验证中间件
module.exports = {
  // 验证模式
  schemas: {
    userIdSchema,
    nicknameSchema,
    emailSchema,
    phoneSchema,
    avatarSchema,
    genderSchema,
    birthdaySchema,
    bioSchema,
    locationSchema,
    websiteSchema,
    validateUserUpdate,
    validateUserQuery,
    validateUserSettings,
    validatePrivacySettings,
    validateNotificationSettings,
    validatePasswordChange,
    validateAvatarUpload,
    validatePhoneBind,
    validateEmailBind,
    validateWechatBind,
    validateAccountDeactivate,
    validateUserFeedback,
    validateAdminUserUpdate,
    validateBatchUserOperation,
    validateUserStats
  },

  // 验证中间件生成器
  createValidator,

  // 常用验证中间件
  validateUserId,
  validateUserUpdate: createValidator(validateUserUpdate),
  validateUserQuery: createValidator(validateUserQuery, 'query'),
  validateUserSettings: createValidator(validateUserSettings),
  validatePrivacySettings: createValidator(validatePrivacySettings),
  validateNotificationSettings: createValidator(validateNotificationSettings),
  validatePasswordChange: createValidator(validatePasswordChange),
  validateAvatarUpload: createValidator(validateAvatarUpload),
  validatePhoneBind: createValidator(validatePhoneBind),
  validateEmailBind: createValidator(validateEmailBind),
  validateWechatBind: createValidator(validateWechatBind),
  validateAccountDeactivate: createValidator(validateAccountDeactivate),
  validateUserFeedback: createValidator(validateUserFeedback),
  validateAdminUserUpdate: createValidator(validateAdminUserUpdate),
  validateBatchUserOperation: createValidator(validateBatchUserOperation),
  validateUserStats: createValidator(validateUserStats, 'query')
}; 