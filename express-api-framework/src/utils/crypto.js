/**
 * 加密工具类
 * 提供密码加密、JWT令牌生成验证、数据加密等功能
 */
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const logger = require('../config/logger');

// 加密配置
const SALT_ROUNDS = 12;
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

// 管理端JWT配置
const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'your-admin-secret-key';
const ADMIN_JWT_EXPIRES_IN = process.env.ADMIN_JWT_EXPIRES_IN || '2h';

/**
 * 密码相关工具
 */
const password = {
  /**
   * 加密密码
   * @param {string} plainPassword - 明文密码
   * @returns {Promise<string>} 加密后的密码
   */
  async hash(plainPassword) {
    try {
      if (!plainPassword) {
        throw new Error('密码不能为空');
      }
      
      const salt = await bcrypt.genSalt(SALT_ROUNDS);
      return await bcrypt.hash(plainPassword, salt);
    } catch (error) {
      logger.error('密码加密失败:', error);
      throw new Error('密码加密失败');
    }
  },

  /**
   * 验证密码
   * @param {string} plainPassword - 明文密码
   * @param {string} hashedPassword - 加密密码
   * @returns {Promise<boolean>} 验证结果
   */
  async verify(plainPassword, hashedPassword) {
    try {
      if (!plainPassword || !hashedPassword) {
        return false;
      }
      
      return await bcrypt.compare(plainPassword, hashedPassword);
    } catch (error) {
      logger.error('密码验证失败:', error);
      return false;
    }
  },

  /**
   * 生成随机密码
   * @param {number} length - 密码长度
   * @param {boolean} includeSpecial - 是否包含特殊字符
   * @returns {string} 随机密码
   */
  generateRandom(length = 12, includeSpecial = true) {
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const special = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    
    let chars = lowercase + uppercase + numbers;
    if (includeSpecial) {
      chars += special;
    }
    
    let password = '';
    for (let i = 0; i < length; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    return password;
  },

  /**
   * 验证密码强度
   * @param {string} password - 密码
   * @returns {Object} 强度评估结果
   */
  checkStrength(password) {
    const result = {
      score: 0,
      level: 'weak',
      issues: []
    };

    if (!password) {
      result.issues.push('密码不能为空');
      return result;
    }

    // 长度检查
    if (password.length < 8) {
      result.issues.push('密码长度至少8位');
    } else if (password.length >= 12) {
      result.score += 2;
    } else {
      result.score += 1;
    }

    // 复杂度检查
    if (/[a-z]/.test(password)) result.score += 1;
    if (/[A-Z]/.test(password)) result.score += 1;
    if (/[0-9]/.test(password)) result.score += 1;
    if (/[^A-Za-z0-9]/.test(password)) result.score += 2;

    // 评级
    if (result.score >= 6) {
      result.level = 'strong';
    } else if (result.score >= 4) {
      result.level = 'medium';
    } else {
      result.level = 'weak';
    }

    if (!/[a-z]/.test(password)) result.issues.push('缺少小写字母');
    if (!/[A-Z]/.test(password)) result.issues.push('缺少大写字母');
    if (!/[0-9]/.test(password)) result.issues.push('缺少数字');
    if (!/[^A-Za-z0-9]/.test(password)) result.issues.push('缺少特殊字符');

    return result;
  }
};

/**
 * JWT令牌工具（小程序端）
 */
const token = {
  /**
   * 生成访问令牌
   * @param {Object} payload - 令牌载荷
   * @param {string} expiresIn - 过期时间
   * @returns {string} JWT令牌
   */
  generateAccessToken(payload, expiresIn = JWT_EXPIRES_IN) {
    try {
      return jwt.sign(payload, JWT_SECRET, {
        expiresIn,
        issuer: 'express-api-framework',
        audience: 'api-client'
      });
    } catch (error) {
      logger.error('生成访问令牌失败:', error);
      throw new Error('令牌生成失败');
    }
  },

  /**
   * 生成刷新令牌
   * @param {Object} payload - 令牌载荷
   * @param {string} expiresIn - 过期时间
   * @returns {string} 刷新令牌
   */
  generateRefreshToken(payload, expiresIn = JWT_REFRESH_EXPIRES_IN) {
    try {
      return jwt.sign(payload, JWT_REFRESH_SECRET, {
        expiresIn,
        issuer: 'express-api-framework',
        audience: 'api-client'
      });
    } catch (error) {
      logger.error('生成刷新令牌失败:', error);
      throw new Error('刷新令牌生成失败');
    }
  },

  /**
   * 验证访问令牌
   * @param {string} token - JWT令牌
   * @returns {Object} 解码后的载荷
   */
  verifyAccessToken(token) {
    try {
      return jwt.verify(token, JWT_SECRET, {
        issuer: 'express-api-framework',
        audience: 'api-client'
      });
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('令牌已过期');
      } else if (error.name === 'JsonWebTokenError') {
        throw new Error('无效的令牌');
      } else {
        throw new Error('令牌验证失败');
      }
    }
  },

  /**
   * 验证刷新令牌
   * @param {string} token - 刷新令牌
   * @returns {Object} 解码后的载荷
   */
  verifyRefreshToken(token) {
    try {
      return jwt.verify(token, JWT_REFRESH_SECRET, {
        issuer: 'express-api-framework',
        audience: 'api-client'
      });
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('刷新令牌已过期');
      } else if (error.name === 'JsonWebTokenError') {
        throw new Error('无效的刷新令牌');
      } else {
        throw new Error('刷新令牌验证失败');
      }
    }
  },

  /**
   * 生成令牌对（访问令牌 + 刷新令牌）
   * @param {Object} payload - 用户信息
   * @returns {Object} 令牌对
   */
  generateTokenPair(payload) {
    return {
      accessToken: this.generateAccessToken(payload),
      refreshToken: this.generateRefreshToken({ userId: payload.id }),
      expiresIn: JWT_EXPIRES_IN
    };
  }
};

/**
 * 管理端JWT令牌工具
 */
const adminToken = {
  /**
   * 生成管理端访问令牌
   * @param {Object} payload - 令牌载荷
   * @param {string} expiresIn - 过期时间
   * @returns {string} JWT令牌
   */
  generateAccessToken(payload, expiresIn = ADMIN_JWT_EXPIRES_IN) {
    try {
      return jwt.sign(payload, ADMIN_JWT_SECRET, {
        expiresIn,
        issuer: 'express-api-framework',
        audience: 'admin-client'
      });
    } catch (error) {
      logger.error('生成管理端令牌失败:', error);
      throw new Error('管理端令牌生成失败');
    }
  },

  /**
   * 验证管理端访问令牌
   * @param {string} token - JWT令牌
   * @returns {Object} 解码后的载荷
   */
  verifyAccessToken(token) {
    try {
      return jwt.verify(token, ADMIN_JWT_SECRET, {
        issuer: 'express-api-framework',
        audience: 'admin-client'
      });
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('管理端令牌已过期');
      } else if (error.name === 'JsonWebTokenError') {
        throw new Error('无效的管理端令牌');
      } else {
        throw new Error('管理端令牌验证失败');
      }
    }
  }
};

/**
 * 数据加密工具
 */
const encryption = {
  /**
   * AES加密
   * @param {string} text - 明文
   * @param {string} key - 密钥
   * @returns {string} 加密后的文本
   */
  encrypt(text, key = JWT_SECRET) {
    try {
      const algorithm = 'aes-256-cbc';
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipher(algorithm, key);
      
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      return iv.toString('hex') + ':' + encrypted;
    } catch (error) {
      logger.error('数据加密失败:', error);
      throw new Error('数据加密失败');
    }
  },

  /**
   * AES解密
   * @param {string} encryptedText - 密文
   * @param {string} key - 密钥
   * @returns {string} 解密后的文本
   */
  decrypt(encryptedText, key = JWT_SECRET) {
    try {
      const algorithm = 'aes-256-cbc';
      const parts = encryptedText.split(':');
      const iv = Buffer.from(parts[0], 'hex');
      const encrypted = parts[1];
      
      const decipher = crypto.createDecipher(algorithm, key);
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      logger.error('数据解密失败:', error);
      throw new Error('数据解密失败');
    }
  },

  /**
   * 生成随机字符串
   * @param {number} length - 长度
   * @returns {string} 随机字符串
   */
  generateRandomString(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  },

  /**
   * 生成哈希值
   * @param {string} data - 数据
   * @param {string} algorithm - 算法（默认sha256）
   * @returns {string} 哈希值
   */
  generateHash(data, algorithm = 'sha256') {
    return crypto.createHash(algorithm).update(data).digest('hex');
  },

  /**
   * 生成HMAC
   * @param {string} data - 数据
   * @param {string} key - 密钥
   * @param {string} algorithm - 算法（默认sha256）
   * @returns {string} HMAC值
   */
  generateHMAC(data, key, algorithm = 'sha256') {
    return crypto.createHmac(algorithm, key).update(data).digest('hex');
  }
};

/**
 * 通用工具函数
 */
const utils = {
  /**
   * 生成唯一ID
   * @returns {string} 唯一ID
   */
  generateUUID() {
    return crypto.randomUUID();
  },

  /**
   * 生成验证码
   * @param {number} length - 长度
   * @param {boolean} onlyNumbers - 是否只包含数字
   * @returns {string} 验证码
   */
  generateCode(length = 6, onlyNumbers = true) {
    const chars = onlyNumbers ? '0123456789' : '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let code = '';
    
    for (let i = 0; i < length; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    return code;
  },

  /**
   * 脱敏处理
   * @param {string} data - 原始数据
   * @param {string} type - 脱敏类型（phone, email, idcard）
   * @returns {string} 脱敏后的数据
   */
  maskSensitiveData(data, type) {
    if (!data) return '';
    
    switch (type) {
      case 'phone':
        return data.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
      case 'email':
        return data.replace(/(.{2}).*(@.*)/, '$1***$2');
      case 'idcard':
        return data.replace(/(\d{4})\d{10}(\d{4})/, '$1**********$2');
      case 'bankcard':
        return data.replace(/(\d{4})\d*(\d{4})/, '$1****$2');
      default:
        return data.replace(/./g, '*');
    }
  }
};

module.exports = {
  password,
  token,
  adminToken,
  encryption,
  utils
}; 