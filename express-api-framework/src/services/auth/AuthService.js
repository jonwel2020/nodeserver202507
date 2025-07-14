const BaseService = require('../base/BaseService');
const UserRepository = require('../../repositories/users/UserRepository');
const User = require('../../models/User');
const cryptoUtils = require('../../utils/crypto');
const cacheUtils = require('../../utils/cache');
const { ERRORS } = require('../../constants/errors');
const { USER_STATUS, USER_ROLES } = require('../../constants/status');

/**
 * 认证服务层
 * 处理用户认证相关的业务逻辑
 */
class AuthService extends BaseService {
    constructor() {
        super();
        this.userRepository = new UserRepository();
    }

    /**
     * 用户注册
     * @param {Object} registerData - 注册数据
     * @param {string} registerData.username - 用户名
     * @param {string} registerData.email - 邮箱
     * @param {string} registerData.password - 密码
     * @param {string} registerData.phone - 手机号（可选）
     * @param {string} registerData.nickname - 昵称（可选）
     * @returns {Promise<Object>} 注册结果
     */
    async register(registerData) {
        return await this.executeInTransaction(async (transaction) => {
            const { username, email, password, phone, nickname } = registerData;

            // 1. 验证数据完整性
            if (!username || !email || !password) {
                throw new Error(ERRORS.VALIDATION_ERROR.message);
            }

            // 2. 检查用户名是否已存在
            const existingUser = await this.userRepository.findByUsername(username);
            if (existingUser) {
                throw new Error(ERRORS.USER_ALREADY_EXISTS.message);
            }

            // 3. 检查邮箱是否已存在
            const existingEmail = await this.userRepository.findByEmail(email);
            if (existingEmail) {
                throw new Error(ERRORS.EMAIL_ALREADY_EXISTS.message);
            }

            // 4. 检查手机号是否已存在（如果提供）
            if (phone) {
                const existingPhone = await this.userRepository.findByPhone(phone);
                if (existingPhone) {
                    throw new Error(ERRORS.PHONE_ALREADY_EXISTS.message);
                }
            }

            // 5. 验证密码强度
            if (!cryptoUtils.isPasswordStrong(password)) {
                throw new Error(ERRORS.WEAK_PASSWORD.message);
            }

            // 6. 加密密码
            const hashedPassword = await cryptoUtils.hashPassword(password);

            // 7. 创建用户数据
            const userData = new User({
                username,
                nickname: nickname || username,
                email,
                phone: phone || null,
                password: hashedPassword,
                role: USER_ROLES.USER,
                status: USER_STATUS.ACTIVE,
                is_email_verified: false,
                is_phone_verified: phone ? false : null,
                settings: JSON.stringify(User.getDefaultSettings()),
                privacy_settings: JSON.stringify(User.getDefaultPrivacySettings()),
                notification_settings: JSON.stringify(User.getDefaultNotificationSettings())
            });

            // 8. 保存用户
            const userId = await this.userRepository.create(userData.toInsertData(), transaction);
            const newUser = await this.userRepository.findById(userId);

            // 9. 生成验证码并发送邮件（这里暂时跳过邮件发送）
            const verificationCode = cryptoUtils.generateVerificationCode();
            await cacheUtils.setVerificationCode(email, verificationCode, 'email_verification');

            // 10. 记录操作日志
            this.logger.info('用户注册成功', {
                userId,
                username,
                email,
                phone
            });

            return {
                user: newUser.toJSON(),
                verification_code: verificationCode, // 实际项目中不应返回验证码
                message: '注册成功，请验证邮箱'
            };
        });
    }

    /**
     * 用户登录
     * @param {Object} loginData - 登录数据
     * @param {string} loginData.identifier - 用户标识（用户名/邮箱/手机号）
     * @param {string} loginData.password - 密码
     * @param {string} loginData.loginIp - 登录IP
     * @param {string} loginData.userAgent - 用户代理
     * @param {string} loginData.loginType - 登录类型（api/admin）
     * @returns {Promise<Object>} 登录结果
     */
    async login(loginData) {
        const { identifier, password, loginIp, userAgent, loginType = 'api' } = loginData;

        try {
            // 1. 查找用户
            let user = await this.userRepository.findByUsername(identifier) ||
                      await this.userRepository.findByEmail(identifier) ||
                      await this.userRepository.findByPhone(identifier);

            if (!user) {
                throw new Error(ERRORS.USER_NOT_FOUND.message);
            }

            // 2. 检查账户状态
            if (user.status === USER_STATUS.LOCKED) {
                throw new Error(ERRORS.ACCOUNT_LOCKED.message);
            }

            if (user.status === USER_STATUS.SUSPENDED) {
                throw new Error(ERRORS.ACCOUNT_SUSPENDED.message);
            }

            if (user.status === USER_STATUS.INACTIVE) {
                throw new Error(ERRORS.ACCOUNT_INACTIVE.message);
            }

            // 3. 检查登录失败次数
            if (user.failed_login_attempts >= 5) {
                // 锁定账户
                await this.userRepository.lockUser(user.id, '登录失败次数过多');
                throw new Error(ERRORS.ACCOUNT_LOCKED.message);
            }

            // 4. 验证密码
            const isPasswordValid = await cryptoUtils.comparePassword(password, user.password);
            if (!isPasswordValid) {
                // 增加失败次数
                await this.userRepository.incrementFailedLoginAttempts(user.id);
                throw new Error(ERRORS.INVALID_CREDENTIALS.message);
            }

            // 5. 检查权限（管理端登录需要管理员角色）
            if (loginType === 'admin' && !this.isAdminRole(user.role)) {
                throw new Error(ERRORS.INSUFFICIENT_PERMISSIONS.message);
            }

            // 6. 重置失败登录次数
            await this.userRepository.resetFailedLoginAttempts(user.id);

            // 7. 更新最后登录信息
            await this.userRepository.updateLastLogin(user.id, loginIp);

            // 8. 生成Token
            const tokenPayload = {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
                type: loginType
            };

            const accessToken = cryptoUtils.generateToken(tokenPayload, loginType);
            const refreshToken = cryptoUtils.generateRefreshToken(tokenPayload, loginType);

            // 9. 缓存Token信息
            await cacheUtils.setUserSession(user.id, {
                accessToken,
                refreshToken,
                loginIp,
                userAgent,
                loginType,
                loginTime: new Date()
            });

            // 10. 记录登录日志
            this.logger.info('用户登录成功', {
                userId: user.id,
                username: user.username,
                loginIp,
                userAgent,
                loginType
            });

            return {
                user: user.toJSON(),
                access_token: accessToken,
                refresh_token: refreshToken,
                token_type: 'Bearer',
                expires_in: loginType === 'admin' ? 7200 : 86400 // 2小时或24小时
            };
        } catch (error) {
            this.logger.error('用户登录失败', {
                error: error.message,
                identifier,
                loginIp,
                userAgent,
                loginType,
                stack: error.stack
            });
            throw error;
        }
    }

    /**
     * 刷新Token
     * @param {string} refreshToken - 刷新令牌
     * @param {string} loginType - 登录类型
     * @returns {Promise<Object>} 新的Token信息
     */
    async refreshToken(refreshToken, loginType = 'api') {
        try {
            // 1. 验证RefreshToken
            const payload = cryptoUtils.verifyRefreshToken(refreshToken, loginType);
            if (!payload) {
                throw new Error(ERRORS.INVALID_TOKEN.message);
            }

            // 2. 检查用户是否存在且状态正常
            const user = await this.userRepository.findById(payload.id);
            if (!user) {
                throw new Error(ERRORS.USER_NOT_FOUND.message);
            }

            if (user.status !== USER_STATUS.ACTIVE) {
                throw new Error(ERRORS.ACCOUNT_INACTIVE.message);
            }

            // 3. 检查会话是否有效
            const session = await cacheUtils.getUserSession(user.id);
            if (!session || session.refreshToken !== refreshToken) {
                throw new Error(ERRORS.INVALID_TOKEN.message);
            }

            // 4. 生成新的Token
            const tokenPayload = {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
                type: loginType
            };

            const newAccessToken = cryptoUtils.generateToken(tokenPayload, loginType);
            const newRefreshToken = cryptoUtils.generateRefreshToken(tokenPayload, loginType);

            // 5. 更新会话缓存
            await cacheUtils.setUserSession(user.id, {
                ...session,
                accessToken: newAccessToken,
                refreshToken: newRefreshToken,
                refreshTime: new Date()
            });

            this.logger.info('Token刷新成功', {
                userId: user.id,
                loginType
            });

            return {
                access_token: newAccessToken,
                refresh_token: newRefreshToken,
                token_type: 'Bearer',
                expires_in: loginType === 'admin' ? 7200 : 86400
            };
        } catch (error) {
            this.logger.error('Token刷新失败', {
                error: error.message,
                loginType,
                stack: error.stack
            });
            throw error;
        }
    }

    /**
     * 用户登出
     * @param {number} userId - 用户ID
     * @param {string} loginType - 登录类型
     * @returns {Promise<boolean>} 是否成功
     */
    async logout(userId, loginType = 'api') {
        try {
            // 1. 清除会话缓存
            await cacheUtils.clearUserSession(userId);

            // 2. 记录登出日志
            this.logger.info('用户登出成功', {
                userId,
                loginType
            });

            return true;
        } catch (error) {
            this.logger.error('用户登出失败', {
                error: error.message,
                userId,
                loginType,
                stack: error.stack
            });
            throw error;
        }
    }

    /**
     * 微信登录
     * @param {Object} wechatData - 微信登录数据
     * @param {string} wechatData.code - 授权码
     * @param {string} wechatData.encryptedData - 加密数据
     * @param {string} wechatData.iv - 初始向量
     * @param {string} loginIp - 登录IP
     * @param {string} userAgent - 用户代理
     * @returns {Promise<Object>} 登录结果
     */
    async wechatLogin(wechatData, loginIp, userAgent) {
        try {
            const { code, encryptedData, iv } = wechatData;

            // 1. 获取微信用户信息（这里简化处理）
            // 实际应该调用微信API获取用户信息
            const wechatUserInfo = {
                openid: 'mock_openid_' + Date.now(),
                unionid: 'mock_unionid_' + Date.now(),
                nickname: '微信用户',
                avatar: 'https://example.com/avatar.jpg'
            };

            // 2. 查找是否已绑定微信的用户
            let user = await this.userRepository.findByWechatOpenId(wechatUserInfo.openid);

            if (user) {
                // 已存在用户，直接登录
                return await this.generateLoginResponse(user, loginIp, userAgent, 'api');
            } else {
                // 新用户，自动注册
                const username = 'wx_' + wechatUserInfo.openid.substr(-8);
                const userData = new User({
                    username,
                    nickname: wechatUserInfo.nickname,
                    wechat_openid: wechatUserInfo.openid,
                    wechat_unionid: wechatUserInfo.unionid,
                    wechat_nickname: wechatUserInfo.nickname,
                    wechat_avatar: wechatUserInfo.avatar,
                    role: USER_ROLES.USER,
                    status: USER_STATUS.ACTIVE,
                    settings: JSON.stringify(User.getDefaultSettings()),
                    privacy_settings: JSON.stringify(User.getDefaultPrivacySettings()),
                    notification_settings: JSON.stringify(User.getDefaultNotificationSettings())
                });

                const userId = await this.userRepository.create(userData.toInsertData());
                const newUser = await this.userRepository.findById(userId);

                this.logger.info('微信用户自动注册成功', {
                    userId,
                    openid: wechatUserInfo.openid
                });

                return await this.generateLoginResponse(newUser, loginIp, userAgent, 'api');
            }
        } catch (error) {
            this.logger.error('微信登录失败', {
                error: error.message,
                wechatData,
                loginIp,
                userAgent,
                stack: error.stack
            });
            throw error;
        }
    }

    /**
     * 忘记密码
     * @param {string} email - 邮箱地址
     * @returns {Promise<Object>} 重置信息
     */
    async forgotPassword(email) {
        try {
            // 1. 查找用户
            const user = await this.userRepository.findByEmail(email);
            if (!user) {
                // 为了安全，不暴露用户是否存在的信息
                return {
                    message: '如果邮箱存在，重置密码链接已发送'
                };
            }

            // 2. 生成重置令牌
            const resetToken = cryptoUtils.generateResetToken();
            
            // 3. 缓存重置令牌（15分钟有效）
            await cacheUtils.setPasswordResetToken(email, resetToken);

            // 4. 发送重置邮件（这里暂时跳过实际发送）
            this.logger.info('密码重置邮件已发送', {
                userId: user.id,
                email,
                resetToken // 实际项目中不应记录重置令牌
            });

            return {
                message: '如果邮箱存在，重置密码链接已发送',
                reset_token: resetToken // 实际项目中不应返回重置令牌
            };
        } catch (error) {
            this.logger.error('忘记密码处理失败', {
                error: error.message,
                email,
                stack: error.stack
            });
            throw error;
        }
    }

    /**
     * 重置密码
     * @param {string} email - 邮箱地址
     * @param {string} resetToken - 重置令牌
     * @param {string} newPassword - 新密码
     * @returns {Promise<Object>} 重置结果
     */
    async resetPassword(email, resetToken, newPassword) {
        try {
            // 1. 验证重置令牌
            const cachedToken = await cacheUtils.getPasswordResetToken(email);
            if (!cachedToken || cachedToken !== resetToken) {
                throw new Error(ERRORS.INVALID_TOKEN.message);
            }

            // 2. 查找用户
            const user = await this.userRepository.findByEmail(email);
            if (!user) {
                throw new Error(ERRORS.USER_NOT_FOUND.message);
            }

            // 3. 验证新密码强度
            if (!cryptoUtils.isPasswordStrong(newPassword)) {
                throw new Error(ERRORS.WEAK_PASSWORD.message);
            }

            // 4. 加密新密码
            const hashedPassword = await cryptoUtils.hashPassword(newPassword);

            // 5. 更新密码
            await this.userRepository.updatePassword(user.id, hashedPassword);

            // 6. 清除重置令牌
            await cacheUtils.clearPasswordResetToken(email);

            // 7. 清除用户会话（强制重新登录）
            await cacheUtils.clearUserSession(user.id);

            this.logger.info('密码重置成功', {
                userId: user.id,
                email
            });

            return {
                message: '密码重置成功，请重新登录'
            };
        } catch (error) {
            this.logger.error('密码重置失败', {
                error: error.message,
                email,
                stack: error.stack
            });
            throw error;
        }
    }

    /**
     * 验证邮箱
     * @param {string} email - 邮箱地址
     * @param {string} verificationCode - 验证码
     * @returns {Promise<Object>} 验证结果
     */
    async verifyEmail(email, verificationCode) {
        try {
            // 1. 验证验证码
            const isValid = await cacheUtils.verifyCode(email, verificationCode, 'email_verification');
            if (!isValid) {
                throw new Error(ERRORS.INVALID_VERIFICATION_CODE.message);
            }

            // 2. 查找用户
            const user = await this.userRepository.findByEmail(email);
            if (!user) {
                throw new Error(ERRORS.USER_NOT_FOUND.message);
            }

            // 3. 更新邮箱验证状态
            await this.userRepository.update(user.id, {
                is_email_verified: true,
                email_verified_at: new Date()
            });

            // 4. 清除验证码
            await cacheUtils.clearVerificationCode(email, 'email_verification');

            this.logger.info('邮箱验证成功', {
                userId: user.id,
                email
            });

            return {
                message: '邮箱验证成功'
            };
        } catch (error) {
            this.logger.error('邮箱验证失败', {
                error: error.message,
                email,
                stack: error.stack
            });
            throw error;
        }
    }

    /**
     * 生成登录响应
     * @param {User} user - 用户对象
     * @param {string} loginIp - 登录IP
     * @param {string} userAgent - 用户代理
     * @param {string} loginType - 登录类型
     * @returns {Promise<Object>} 登录响应
     */
    async generateLoginResponse(user, loginIp, userAgent, loginType) {
        // 更新最后登录信息
        await this.userRepository.updateLastLogin(user.id, loginIp);

        // 生成Token
        const tokenPayload = {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            type: loginType
        };

        const accessToken = cryptoUtils.generateToken(tokenPayload, loginType);
        const refreshToken = cryptoUtils.generateRefreshToken(tokenPayload, loginType);

        // 缓存Token信息
        await cacheUtils.setUserSession(user.id, {
            accessToken,
            refreshToken,
            loginIp,
            userAgent,
            loginType,
            loginTime: new Date()
        });

        return {
            user: user.toJSON(),
            access_token: accessToken,
            refresh_token: refreshToken,
            token_type: 'Bearer',
            expires_in: loginType === 'admin' ? 7200 : 86400
        };
    }

    /**
     * 检查是否为管理员角色
     * @param {string} role - 用户角色
     * @returns {boolean} 是否为管理员
     */
    isAdminRole(role) {
        return [
            USER_ROLES.ADMIN,
            USER_ROLES.SUPER_ADMIN,
            USER_ROLES.OPERATOR,
            USER_ROLES.CUSTOMER_SERVICE,
            USER_ROLES.MODERATOR
        ].includes(role);
    }
}

module.exports = AuthService; 