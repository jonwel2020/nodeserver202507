const cors = require('cors');
const { logger } = require('../config/logger');

/**
 * 允许的域名配置
 */
const getAllowedOrigins = () => {
  const env = process.env.NODE_ENV || 'development';
  
  switch (env) {
    case 'production':
      // 生产环境：严格控制允许的域名
      return [
        'https://your-domain.com',
        'https://www.your-domain.com',
        'https://admin.your-domain.com',
        'https://api.your-domain.com'
      ];
      
    case 'staging':
      // 预发布环境
      return [
        'https://staging.your-domain.com',
        'https://staging-admin.your-domain.com',
        'http://localhost:3000',
        'http://localhost:3001'
      ];
      
    case 'development':
    default:
      // 开发环境：允许所有本地域名
      return [
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:8080',
        'http://localhost:8081',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:3001',
        'http://127.0.0.1:8080',
        'http://127.0.0.1:8081'
      ];
  }
};

/**
 * 动态域名验证函数
 * @param {string} origin - 请求来源域名
 * @param {Function} callback - 回调函数
 */
const dynamicOriginCheck = (origin, callback) => {
  const allowedOrigins = getAllowedOrigins();
  const env = process.env.NODE_ENV || 'development';
  
  // 记录CORS请求
  logger.debug('CORS请求验证', {
    origin,
    allowedOrigins,
    environment: env
  });

  // 如果没有origin（同源请求或服务器到服务器请求），允许访问
  if (!origin) {
    return callback(null, true);
  }

  // 开发环境：允许localhost的任意端口
  if (env === 'development') {
    if (origin.startsWith('http://localhost:') || 
        origin.startsWith('http://127.0.0.1:') ||
        origin.startsWith('https://localhost:') || 
        origin.startsWith('https://127.0.0.1:')) {
      return callback(null, true);
    }
  }

  // 检查是否在允许列表中
  if (allowedOrigins.includes(origin)) {
    return callback(null, true);
  }

  // 生产环境：支持通配符子域名
  if (env === 'production') {
    const allowedDomains = [
      'your-domain.com',
      'yourdomain.com'
    ];
    
    for (const domain of allowedDomains) {
      if (origin.endsWith(`.${domain}`) || origin === `https://${domain}`) {
        return callback(null, true);
      }
    }
  }

  // 记录被拒绝的CORS请求
  logger.warn('CORS请求被拒绝', {
    origin,
    allowedOrigins,
    environment: env,
    timestamp: new Date().toISOString()
  });

  const error = new Error(`CORS策略阻止了来自 ${origin} 的跨域请求`);
  error.status = 403;
  callback(error, false);
};

/**
 * 基础CORS配置
 */
const corsOptions = {
  origin: dynamicOriginCheck,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With', 
    'Content-Type', 
    'Accept',
    'Authorization',
    'X-Access-Token',
    'X-Refresh-Token',
    'X-API-Key',
    'X-Client-Version',
    'X-Request-ID',
    'Cache-Control',
    'Pragma'
  ],
  exposedHeaders: [
    'X-Total-Count',
    'X-Page-Count', 
    'X-Current-Page',
    'X-Per-Page',
    'X-Rate-Limit-Limit',
    'X-Rate-Limit-Remaining',
    'X-Rate-Limit-Reset',
    'X-Response-Time',
    'X-Request-ID',
    'X-Error-ID'
  ],
  credentials: true, // 允许携带认证信息
  maxAge: 86400, // 预检请求缓存时间（24小时）
  preflightContinue: false,
  optionsSuccessStatus: 204 // 某些遗留浏览器的OPTIONS响应码
};

/**
 * 小程序端CORS配置（更宽松）
 */
const apiCorsOptions = {
  ...corsOptions,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    ...corsOptions.allowedHeaders,
    'X-Mini-Program-ID',
    'X-User-Agent'
  ]
};

/**
 * 管理端CORS配置（更严格）
 */
const adminCorsOptions = {
  ...corsOptions,
  origin: (origin, callback) => {
    const allowedOrigins = getAllowedOrigins().filter(url => 
      url.includes('admin') || url.includes('localhost')
    );
    
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      logger.warn('管理端CORS请求被拒绝', { origin, allowedOrigins });
      callback(new Error('管理端CORS策略阻止了此请求'), false);
    }
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    ...corsOptions.allowedHeaders,
    'X-Admin-Token',
    'X-Admin-Permission'
  ]
};

/**
 * 创建CORS中间件
 * @param {string} type - CORS类型：'default', 'api', 'admin'
 * @returns {Function} CORS中间件
 */
const createCorsMiddleware = (type = 'default') => {
  let options;
  
  switch (type) {
    case 'api':
      options = apiCorsOptions;
      break;
    case 'admin':
      options = adminCorsOptions;
      break;
    default:
      options = corsOptions;
  }

  const corsMiddleware = cors(options);

  // 包装中间件以添加额外的日志记录
  return (req, res, next) => {
    // 记录CORS相关信息
    if (req.method === 'OPTIONS') {
      logger.debug('预检请求处理', {
        origin: req.get('Origin'),
        method: req.get('Access-Control-Request-Method'),
        headers: req.get('Access-Control-Request-Headers'),
        type
      });
    }

    corsMiddleware(req, res, (err) => {
      if (err) {
        logger.error('CORS错误', {
          error: err.message,
          origin: req.get('Origin'),
          method: req.method,
          url: req.originalUrl,
          type
        });
      }
      next(err);
    });
  };
};

/**
 * 自定义安全头中间件
 */
const securityHeaders = (req, res, next) => {
  // 设置安全相关的响应头
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-Download-Options': 'noopen',
    'X-Permitted-Cross-Domain-Policies': 'none'
  });

  // 在生产环境设置更严格的安全头
  if (process.env.NODE_ENV === 'production') {
    res.set({
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:;"
    });
  }

  next();
};

/**
 * 预检请求处理中间件
 */
const handlePreflight = (req, res, next) => {
  if (req.method === 'OPTIONS') {
    // 设置预检响应头
    res.set({
      'Access-Control-Max-Age': '86400',
      'Content-Length': '0'
    });
    
    // 记录预检请求
    logger.debug('处理预检请求', {
      origin: req.get('Origin'),
      method: req.get('Access-Control-Request-Method'),
      headers: req.get('Access-Control-Request-Headers'),
      url: req.originalUrl
    });
    
    return res.status(204).end();
  }
  next();
};

// 默认CORS中间件
const defaultCors = createCorsMiddleware('default');

// API端CORS中间件
const apiCors = createCorsMiddleware('api');

// 管理端CORS中间件  
const adminCors = createCorsMiddleware('admin');

module.exports = {
  // CORS中间件
  defaultCors,
  apiCors,
  adminCors,
  createCorsMiddleware,
  
  // 工具中间件
  securityHeaders,
  handlePreflight,
  
  // 配置选项
  corsOptions,
  apiCorsOptions,
  adminCorsOptions,
  
  // 工具函数
  getAllowedOrigins,
  dynamicOriginCheck
}; 