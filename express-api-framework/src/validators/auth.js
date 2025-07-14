/**
 * 认证相关的数据验证器
 * 使用Joi库进行数据验证
 */

const Joi = require('joi');

/**
 * 用户名验证规则
 */
const usernameSchema = Joi.string()
  .min(3)
  .max(50)
  .pattern(/^[a-zA-Z0-9_]+$/)
  .required()
  .messages({
    'string.empty': '用户名不能为空',
    'string.min': '用户名长度不能少于3位',
    'string.max': '用户名长度不能超过50位',
    'string.pattern.base': '用户名只能包含字母、数字和下划线',
    'any.required': '用户名不能为空'
  });

/**
 * 密码验证规则
 */
const passwordSchema = Joi.string()
  .min(6)
  .max(100)
  .required()
  .messages({
    'string.empty': '密码不能为空',
    'string.min': '密码长度不能少于6位',
    'string.max': '密码长度不能超过100位',
    'any.required': '密码不能为空'
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
 * 验证码验证规则
 */
const captchaSchema = Joi.string()
  .length(4)
  .pattern(/^[a-zA-Z0-9]+$/)
  .messages({
    'string.length': '验证码长度必须为4位',
    'string.pattern.base': '验证码格式不正确'
  });

/**
 * 短信验证码规则
 */
const smsCodeSchema = Joi.string()
  .min(4)
  .max(6)
  .pattern(/^\d+$/)
  .messages({
    'string.min': '验证码长度不能少于4位',
    'string.max': '验证码长度不能超过6位',
    'string.pattern.base': '验证码必须为数字'
  });

/**
 * 设备信息验证规则
 */
const deviceInfoSchema = Joi.object({
  device_id: Joi.string().max(100).allow(''),
  device_type: Joi.string().valid('web', 'mobile', 'tablet', 'desktop').default('web'),
  os: Joi.string().max(50).allow(''),
  browser: Joi.string().max(50).allow(''),
  version: Joi.string().max(20).allow(''),
  user_agent: Joi.string().max(500).allow('')
}).unknown(true);

/**
 * 登录验证
 */
const validateLogin = Joi.object({
  username: Joi.alternatives()
    .try(
      usernameSchema,
      emailSchema.required(),
      phoneSchema.required()
    )
    .required()
    .messages({
      'alternatives.match': '请输入有效的用户名、邮箱或手机号',
      'any.required': '登录账号不能为空'
    }),
  password: passwordSchema,
  remember_me: Joi.boolean().default(false),
  captcha: captchaSchema.when('captcha_key', {
    is: Joi.exist(),
    then: Joi.required(),
    otherwise: Joi.optional()
  }),
  captcha_key: Joi.string().max(100),
  device_info: deviceInfoSchema.default({}),
  client_type: Joi.string().valid('web', 'mobile', 'wechat', 'admin').default('web')
});

/**
 * 用户注册验证
 */
const validateRegister = Joi.object({
  username: usernameSchema,
  password: passwordSchema,
  password_confirm: Joi.string()
    .valid(Joi.ref('password'))
    .required()
    .messages({
      'any.only': '两次输入的密码不一致',
      'any.required': '确认密码不能为空'
    }),
  email: emailSchema.when('phone', {
    is: Joi.exist(),
    then: Joi.optional(),
    otherwise: Joi.required()
  }),
  phone: phoneSchema.when('email', {
    is: Joi.exist(),
    then: Joi.optional(),
    otherwise: Joi.required()
  }),
  nickname: Joi.string().max(100).allow(''),
  captcha: captchaSchema.when('captcha_key', {
    is: Joi.exist(),
    then: Joi.required(),
    otherwise: Joi.optional()
  }),
  captcha_key: Joi.string().max(100),
  verification_code: smsCodeSchema.when('verification_type', {
    is: Joi.valid('sms', 'email'),
    then: Joi.required(),
    otherwise: Joi.optional()
  }),
  verification_type: Joi.string().valid('none', 'sms', 'email').default('none'),
  invite_code: Joi.string().max(50),
  agree_terms: Joi.boolean().valid(true).required().messages({
    'any.only': '必须同意用户协议和隐私政策',
    'any.required': '必须同意用户协议和隐私政策'
  }),
  device_info: deviceInfoSchema.default({}),
  referrer: Joi.string().max(100).allow('')
});

/**
 * 邮箱注册验证
 */
const validateEmailRegister = validateRegister.keys({
  email: emailSchema.required(),
  verification_type: Joi.string().valid('email').default('email'),
  verification_code: smsCodeSchema.required()
});

/**
 * 手机注册验证
 */
const validatePhoneRegister = validateRegister.keys({
  phone: phoneSchema.required(),
  verification_type: Joi.string().valid('sms').default('sms'),
  verification_code: smsCodeSchema.required()
});

/**
 * 微信登录验证
 */
const validateWechatLogin = Joi.object({
  code: Joi.string().required().messages({
    'string.empty': '微信授权码不能为空',
    'any.required': '微信授权码不能为空'
  }),
  encrypted_data: Joi.string().allow(''),
  iv: Joi.string().allow(''),
  signature: Joi.string().allow(''),
  raw_data: Joi.string().allow(''),
  device_info: deviceInfoSchema.default({})
});

/**
 * 微信注册验证
 */
const validateWechatRegister = Joi.object({
  code: Joi.string().required().messages({
    'string.empty': '微信授权码不能为空',
    'any.required': '微信授权码不能为空'
  }),
  encrypted_data: Joi.string().allow(''),
  iv: Joi.string().allow(''),
  signature: Joi.string().allow(''),
  raw_data: Joi.string().allow(''),
  username: usernameSchema.optional(),
  phone: phoneSchema.optional(),
  email: emailSchema.optional(),
  verification_code: smsCodeSchema.optional(),
  agree_terms: Joi.boolean().valid(true).required().messages({
    'any.only': '必须同意用户协议和隐私政策',
    'any.required': '必须同意用户协议和隐私政策'
  }),
  device_info: deviceInfoSchema.default({})
});

/**
 * 刷新Token验证
 */
const validateRefreshToken = Joi.object({
  refresh_token: Joi.string().required().messages({
    'string.empty': '刷新令牌不能为空',
    'any.required': '刷新令牌不能为空'
  }),
  client_type: Joi.string().valid('web', 'mobile', 'wechat', 'admin').default('web')
});

/**
 * 登出验证
 */
const validateLogout = Joi.object({
  all_devices: Joi.boolean().default(false),
  device_id: Joi.string().max(100).allow('')
});

/**
 * 忘记密码验证
 */
const validateForgotPassword = Joi.object({
  identifier: Joi.alternatives()
    .try(
      emailSchema.required(),
      phoneSchema.required()
    )
    .required()
    .messages({
      'alternatives.match': '请输入有效的邮箱或手机号',
      'any.required': '邮箱或手机号不能为空'
    }),
  type: Joi.string().valid('email', 'sms').required(),
  captcha: captchaSchema.when('captcha_key', {
    is: Joi.exist(),
    then: Joi.required(),
    otherwise: Joi.optional()
  }),
  captcha_key: Joi.string().max(100)
});

/**
 * 重置密码验证
 */
const validateResetPassword = Joi.object({
  identifier: Joi.alternatives()
    .try(
      emailSchema.required(),
      phoneSchema.required()
    )
    .required()
    .messages({
      'alternatives.match': '请输入有效的邮箱或手机号',
      'any.required': '邮箱或手机号不能为空'
    }),
  verification_code: smsCodeSchema.required(),
  new_password: passwordSchema,
  new_password_confirm: Joi.string()
    .valid(Joi.ref('new_password'))
    .required()
    .messages({
      'any.only': '两次输入的新密码不一致',
      'any.required': '确认密码不能为空'
    }),
  reset_token: Joi.string().required().messages({
    'string.empty': '重置令牌不能为空',
    'any.required': '重置令牌不能为空'
  })
});

/**
 * 验证码验证
 */
const validateVerificationCode = Joi.object({
  type: Joi.string().valid('email', 'sms').required(),
  target: Joi.alternatives()
    .conditional('type', {
      is: 'email',
      then: emailSchema.required(),
      otherwise: phoneSchema.required()
    })
    .required(),
  code: smsCodeSchema.required(),
  token: Joi.string().max(200).allow('')
});

/**
 * 发送验证码验证
 */
const validateSendVerificationCode = Joi.object({
  type: Joi.string().valid('email', 'sms').required(),
  target: Joi.alternatives()
    .conditional('type', {
      is: 'email',
      then: emailSchema.required(),
      otherwise: phoneSchema.required()
    })
    .required(),
  purpose: Joi.string().valid('register', 'login', 'reset_password', 'bind', 'verify').default('register'),
  captcha: captchaSchema.when('captcha_key', {
    is: Joi.exist(),
    then: Joi.required(),
    otherwise: Joi.optional()
  }),
  captcha_key: Joi.string().max(100)
});

/**
 * 修改密码验证
 */
const validateChangePassword = Joi.object({
  current_password: passwordSchema,
  new_password: passwordSchema,
  new_password_confirm: Joi.string()
    .valid(Joi.ref('new_password'))
    .required()
    .messages({
      'any.only': '两次输入的新密码不一致',
      'any.required': '确认密码不能为空'
    })
});

/**
 * 绑定手机号验证
 */
const validateBindPhone = Joi.object({
  phone: phoneSchema.required(),
  verification_code: smsCodeSchema.required(),
  password: passwordSchema.optional()
});

/**
 * 绑定邮箱验证
 */
const validateBindEmail = Joi.object({
  email: emailSchema.required(),
  verification_code: smsCodeSchema.required(),
  password: passwordSchema.optional()
});

/**
 * 绑定微信验证
 */
const validateBindWechat = Joi.object({
  code: Joi.string().required().messages({
    'string.empty': '微信授权码不能为空',
    'any.required': '微信授权码不能为空'
  }),
  encrypted_data: Joi.string().allow(''),
  iv: Joi.string().allow(''),
  signature: Joi.string().allow(''),
  raw_data: Joi.string().allow(''),
  password: passwordSchema.optional()
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
 * 组合验证器（支持多个数据源）
 * @param {Object} validators - 验证器配置
 * @returns {Function} Express中间件
 */
function createCombinedValidator(validators) {
  return (req, res, next) => {
    const errors = [];

    for (const [source, schema] of Object.entries(validators)) {
      const data = req[source];
      const { error, value } = schema.validate(data, {
        abortEarly: false,
        allowUnknown: false,
        stripUnknown: true
      });

      if (error) {
        errors.push(...error.details.map(detail => detail.message));
      } else {
        req[source] = value;
      }
    }

    if (errors.length > 0) {
      return res.validationError('数据验证失败', errors);
    }

    next();
  };
}

// 导出验证中间件
module.exports = {
  // 验证模式
  schemas: {
    usernameSchema,
    passwordSchema,
    emailSchema,
    phoneSchema,
    captchaSchema,
    smsCodeSchema,
    deviceInfoSchema,
    validateLogin,
    validateRegister,
    validateEmailRegister,
    validatePhoneRegister,
    validateWechatLogin,
    validateWechatRegister,
    validateRefreshToken,
    validateLogout,
    validateForgotPassword,
    validateResetPassword,
    validateVerificationCode,
    validateSendVerificationCode,
    validateChangePassword,
    validateBindPhone,
    validateBindEmail,
    validateBindWechat
  },

  // 验证中间件生成器
  createValidator,
  createCombinedValidator,

  // 常用验证中间件
  validateLogin: createValidator(validateLogin),
  validateRegister: createValidator(validateRegister),
  validateEmailRegister: createValidator(validateEmailRegister),
  validatePhoneRegister: createValidator(validatePhoneRegister),
  validateWechatLogin: createValidator(validateWechatLogin),
  validateWechatRegister: createValidator(validateWechatRegister),
  validateRefreshToken: createValidator(validateRefreshToken),
  validateLogout: createValidator(validateLogout),
  validateForgotPassword: createValidator(validateForgotPassword),
  validateResetPassword: createValidator(validateResetPassword),
  validateVerificationCode: createValidator(validateVerificationCode),
  validateSendVerificationCode: createValidator(validateSendVerificationCode),
  validateChangePassword: createValidator(validateChangePassword),
  validateBindPhone: createValidator(validateBindPhone),
  validateBindEmail: createValidator(validateBindEmail),
  validateBindWechat: createValidator(validateBindWechat)
}; 