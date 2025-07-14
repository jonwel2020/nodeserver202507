const BaseService = require('../base/BaseService');
const UserRepository = require('../../repositories/users/UserRepository');
const User = require('../../models/User');
const cryptoUtils = require('../../utils/crypto');
const cacheUtils = require('../../utils/cache');
const { ERRORS } = require('../../constants/errors');
const { USER_STATUS } = require('../../constants/status');

/**
 * 用户服务层
 * 处理用户管理相关的业务逻辑
 */
class UserService extends BaseService {
    constructor() {
        super();
        this.userRepository = new UserRepository();
    }

    /**
     * 获取用户信息
     * @param {number} userId - 用户ID
     * @param {boolean} includeSensitive - 是否包含敏感信息
     * @returns {Promise<User|null>} 用户信息
     */
    async getUserById(userId, includeSensitive = false) {
        try {
            // 1. 尝试从缓存获取
            const cacheKey = `user:${userId}:${includeSensitive ? 'full' : 'basic'}`;
            let user = await this.getFromCache(cacheKey);

            if (!user) {
                // 2. 从数据库获取
                user = await this.userRepository.findById(userId);
                if (user) {
                    // 3. 缓存用户信息（缓存5分钟）
                    await this.setToCache(cacheKey, user, 300);
                }
            }

            if (!user) {
                return null;
            }

            // 4. 处理敏感信息
            if (!includeSensitive) {
                user = user.toJSON();
                delete user.password;
                delete user.failed_login_attempts;
                delete user.locked_at;
                delete user.lock_reason;
            }

            return user;
        } catch (error) {
            this.logger.error('获取用户信息失败', {
                error: error.message,
                userId,
                includeSensitive,
                stack: error.stack
            });
            throw new Error(ERRORS.DB_QUERY_ERROR.message);
        }
    }

    /**
     * 更新用户基本信息
     * @param {number} userId - 用户ID
     * @param {Object} updateData - 更新数据
     * @returns {Promise<User>} 更新后的用户信息
     */
    async updateUserProfile(userId, updateData) {
        return await this.executeInTransaction(async (transaction) => {
            // 1. 验证用户是否存在
            const user = await this.userRepository.findById(userId);
            if (!user) {
                throw new Error(ERRORS.USER_NOT_FOUND.message);
            }

            // 2. 验证更新数据
            const allowedFields = ['nickname', 'avatar', 'gender', 'birthday', 'bio'];
            const filteredData = {};
            
            for (const field of allowedFields) {
                if (updateData[field] !== undefined) {
                    filteredData[field] = updateData[field];
                }
            }

            if (Object.keys(filteredData).length === 0) {
                throw new Error(ERRORS.VALIDATION_ERROR.message);
            }

            // 3. 检查昵称唯一性（如果更新昵称）
            if (filteredData.nickname && filteredData.nickname !== user.nickname) {
                const existingUser = await this.userRepository.findByUsername(filteredData.nickname);
                if (existingUser && existingUser.id !== userId) {
                    throw new Error(ERRORS.USERNAME_ALREADY_EXISTS.message);
                }
            }

            // 4. 更新数据
            filteredData.updated_at = new Date();
            await this.userRepository.update(userId, filteredData, transaction);

            // 5. 获取更新后的用户信息
            const updatedUser = await this.userRepository.findById(userId);

            // 6. 清除相关缓存
            await this.clearUserCache(userId);

            this.logger.info('用户信息更新成功', {
                userId,
                updatedFields: Object.keys(filteredData)
            });

            return updatedUser;
        });
    }

    /**
     * 修改密码
     * @param {number} userId - 用户ID
     * @param {string} oldPassword - 旧密码
     * @param {string} newPassword - 新密码
     * @returns {Promise<boolean>} 是否成功
     */
    async changePassword(userId, oldPassword, newPassword) {
        return await this.executeInTransaction(async (transaction) => {
            // 1. 获取用户信息
            const user = await this.userRepository.findById(userId);
            if (!user) {
                throw new Error(ERRORS.USER_NOT_FOUND.message);
            }

            // 2. 验证旧密码
            const isOldPasswordValid = await cryptoUtils.comparePassword(oldPassword, user.password);
            if (!isOldPasswordValid) {
                throw new Error(ERRORS.INVALID_CREDENTIALS.message);
            }

            // 3. 验证新密码强度
            if (!cryptoUtils.isPasswordStrong(newPassword)) {
                throw new Error(ERRORS.WEAK_PASSWORD.message);
            }

            // 4. 检查新密码是否与旧密码相同
            const isSamePassword = await cryptoUtils.comparePassword(newPassword, user.password);
            if (isSamePassword) {
                throw new Error(ERRORS.SAME_PASSWORD.message);
            }

            // 5. 加密新密码
            const hashedPassword = await cryptoUtils.hashPassword(newPassword);

            // 6. 更新密码
            await this.userRepository.updatePassword(userId, hashedPassword);

            // 7. 清除用户会话（强制重新登录）
            await cacheUtils.clearUserSession(userId);

            // 8. 清除用户缓存
            await this.clearUserCache(userId);

            this.logger.info('用户密码修改成功', {
                userId
            });

            return true;
        });
    }

    /**
     * 绑定手机号
     * @param {number} userId - 用户ID
     * @param {string} phone - 手机号
     * @param {string} verificationCode - 验证码
     * @returns {Promise<boolean>} 是否成功
     */
    async bindPhone(userId, phone, verificationCode) {
        return await this.executeInTransaction(async (transaction) => {
            // 1. 验证验证码
            const isValid = await cacheUtils.verifyCode(phone, verificationCode, 'phone_verification');
            if (!isValid) {
                throw new Error(ERRORS.INVALID_VERIFICATION_CODE.message);
            }

            // 2. 检查用户是否存在
            const user = await this.userRepository.findById(userId);
            if (!user) {
                throw new Error(ERRORS.USER_NOT_FOUND.message);
            }

            // 3. 检查手机号是否已被其他用户使用
            const existingUser = await this.userRepository.findByPhone(phone);
            if (existingUser && existingUser.id !== userId) {
                throw new Error(ERRORS.PHONE_ALREADY_EXISTS.message);
            }

            // 4. 更新手机号
            await this.userRepository.update(userId, {
                phone,
                is_phone_verified: true,
                phone_verified_at: new Date(),
                updated_at: new Date()
            }, transaction);

            // 5. 清除验证码
            await cacheUtils.clearVerificationCode(phone, 'phone_verification');

            // 6. 清除用户缓存
            await this.clearUserCache(userId);

            this.logger.info('手机号绑定成功', {
                userId,
                phone
            });

            return true;
        });
    }

    /**
     * 更新手机号
     * @param {number} userId - 用户ID
     * @param {string} newPhone - 新手机号
     * @param {string} verificationCode - 验证码
     * @returns {Promise<boolean>} 是否成功
     */
    async updatePhone(userId, newPhone, verificationCode) {
        return await this.bindPhone(userId, newPhone, verificationCode);
    }

    /**
     * 绑定微信
     * @param {number} userId - 用户ID
     * @param {Object} wechatInfo - 微信信息
     * @returns {Promise<boolean>} 是否成功
     */
    async bindWechat(userId, wechatInfo) {
        return await this.executeInTransaction(async (transaction) => {
            // 1. 检查用户是否存在
            const user = await this.userRepository.findById(userId);
            if (!user) {
                throw new Error(ERRORS.USER_NOT_FOUND.message);
            }

            // 2. 检查微信是否已被其他用户绑定
            const existingUser = await this.userRepository.findByWechatOpenId(wechatInfo.openid);
            if (existingUser && existingUser.id !== userId) {
                throw new Error(ERRORS.WECHAT_ALREADY_BOUND.message);
            }

            // 3. 绑定微信信息
            await this.userRepository.bindWechat(userId, wechatInfo);

            // 4. 清除用户缓存
            await this.clearUserCache(userId);

            this.logger.info('微信绑定成功', {
                userId,
                openid: wechatInfo.openid
            });

            return true;
        });
    }

    /**
     * 解绑微信
     * @param {number} userId - 用户ID
     * @returns {Promise<boolean>} 是否成功
     */
    async unbindWechat(userId) {
        return await this.executeInTransaction(async (transaction) => {
            // 1. 检查用户是否存在
            const user = await this.userRepository.findById(userId);
            if (!user) {
                throw new Error(ERRORS.USER_NOT_FOUND.message);
            }

            // 2. 检查是否已绑定微信
            if (!user.wechat_openid) {
                throw new Error(ERRORS.WECHAT_NOT_BOUND.message);
            }

            // 3. 解绑微信信息
            await this.userRepository.unbindWechat(userId);

            // 4. 清除用户缓存
            await this.clearUserCache(userId);

            this.logger.info('微信解绑成功', {
                userId
            });

            return true;
        });
    }

    /**
     * 更新用户设置
     * @param {number} userId - 用户ID
     * @param {Object} settings - 设置信息
     * @returns {Promise<boolean>} 是否成功
     */
    async updateSettings(userId, settings) {
        return await this.executeInTransaction(async (transaction) => {
            // 1. 检查用户是否存在
            const user = await this.userRepository.findById(userId);
            if (!user) {
                throw new Error(ERRORS.USER_NOT_FOUND.message);
            }

            // 2. 合并设置
            const currentSettings = user.settings ? JSON.parse(user.settings) : User.getDefaultSettings();
            const newSettings = { ...currentSettings, ...settings };

            // 3. 更新设置
            await this.userRepository.update(userId, {
                settings: JSON.stringify(newSettings),
                updated_at: new Date()
            }, transaction);

            // 4. 清除用户缓存
            await this.clearUserCache(userId);

            this.logger.info('用户设置更新成功', {
                userId,
                updatedSettings: Object.keys(settings)
            });

            return true;
        });
    }

    /**
     * 更新隐私设置
     * @param {number} userId - 用户ID
     * @param {Object} privacySettings - 隐私设置
     * @returns {Promise<boolean>} 是否成功
     */
    async updatePrivacySettings(userId, privacySettings) {
        return await this.executeInTransaction(async (transaction) => {
            // 1. 检查用户是否存在
            const user = await this.userRepository.findById(userId);
            if (!user) {
                throw new Error(ERRORS.USER_NOT_FOUND.message);
            }

            // 2. 合并隐私设置
            const currentSettings = user.privacy_settings ? 
                JSON.parse(user.privacy_settings) : User.getDefaultPrivacySettings();
            const newSettings = { ...currentSettings, ...privacySettings };

            // 3. 更新隐私设置
            await this.userRepository.update(userId, {
                privacy_settings: JSON.stringify(newSettings),
                updated_at: new Date()
            }, transaction);

            // 4. 清除用户缓存
            await this.clearUserCache(userId);

            this.logger.info('用户隐私设置更新成功', {
                userId,
                updatedSettings: Object.keys(privacySettings)
            });

            return true;
        });
    }

    /**
     * 更新通知设置
     * @param {number} userId - 用户ID
     * @param {Object} notificationSettings - 通知设置
     * @returns {Promise<boolean>} 是否成功
     */
    async updateNotificationSettings(userId, notificationSettings) {
        return await this.executeInTransaction(async (transaction) => {
            // 1. 检查用户是否存在
            const user = await this.userRepository.findById(userId);
            if (!user) {
                throw new Error(ERRORS.USER_NOT_FOUND.message);
            }

            // 2. 合并通知设置
            const currentSettings = user.notification_settings ? 
                JSON.parse(user.notification_settings) : User.getDefaultNotificationSettings();
            const newSettings = { ...currentSettings, ...notificationSettings };

            // 3. 更新通知设置
            await this.userRepository.update(userId, {
                notification_settings: JSON.stringify(newSettings),
                updated_at: new Date()
            }, transaction);

            // 4. 清除用户缓存
            await this.clearUserCache(userId);

            this.logger.info('用户通知设置更新成功', {
                userId,
                updatedSettings: Object.keys(notificationSettings)
            });

            return true;
        });
    }

    /**
     * 注销账户
     * @param {number} userId - 用户ID
     * @param {string} password - 密码确认
     * @param {string} reason - 注销原因
     * @returns {Promise<boolean>} 是否成功
     */
    async deactivateAccount(userId, password, reason = '用户主动注销') {
        return await this.executeInTransaction(async (transaction) => {
            // 1. 获取用户信息
            const user = await this.userRepository.findById(userId);
            if (!user) {
                throw new Error(ERRORS.USER_NOT_FOUND.message);
            }

            // 2. 验证密码
            const isPasswordValid = await cryptoUtils.comparePassword(password, user.password);
            if (!isPasswordValid) {
                throw new Error(ERRORS.INVALID_CREDENTIALS.message);
            }

            // 3. 更新用户状态
            await this.userRepository.update(userId, {
                status: USER_STATUS.INACTIVE,
                deactivated_at: new Date(),
                deactivation_reason: reason,
                updated_at: new Date()
            }, transaction);

            // 4. 清除用户会话
            await cacheUtils.clearUserSession(userId);

            // 5. 清除用户缓存
            await this.clearUserCache(userId);

            this.logger.info('用户账户注销成功', {
                userId,
                reason
            });

            return true;
        });
    }

    /**
     * 获取登录历史
     * @param {number} userId - 用户ID
     * @param {Object} options - 查询选项
     * @returns {Promise<Object>} 登录历史
     */
    async getLoginHistory(userId, options = {}) {
        try {
            // 1. 检查用户是否存在
            const user = await this.userRepository.findById(userId);
            if (!user) {
                throw new Error(ERRORS.USER_NOT_FOUND.message);
            }

            // 2. 获取登录历史
            const history = await this.userRepository.getLoginHistory(userId, options);

            return history;
        } catch (error) {
            this.logger.error('获取登录历史失败', {
                error: error.message,
                userId,
                options,
                stack: error.stack
            });
            throw error;
        }
    }

    /**
     * 上传头像
     * @param {number} userId - 用户ID
     * @param {string} avatarUrl - 头像URL
     * @returns {Promise<boolean>} 是否成功
     */
    async uploadAvatar(userId, avatarUrl) {
        return await this.executeInTransaction(async (transaction) => {
            // 1. 检查用户是否存在
            const user = await this.userRepository.findById(userId);
            if (!user) {
                throw new Error(ERRORS.USER_NOT_FOUND.message);
            }

            // 2. 更新头像
            await this.userRepository.update(userId, {
                avatar: avatarUrl,
                updated_at: new Date()
            }, transaction);

            // 3. 清除用户缓存
            await this.clearUserCache(userId);

            this.logger.info('用户头像上传成功', {
                userId,
                avatarUrl
            });

            return true;
        });
    }

    /**
     * 删除头像
     * @param {number} userId - 用户ID
     * @returns {Promise<boolean>} 是否成功
     */
    async deleteAvatar(userId) {
        return await this.executeInTransaction(async (transaction) => {
            // 1. 检查用户是否存在
            const user = await this.userRepository.findById(userId);
            if (!user) {
                throw new Error(ERRORS.USER_NOT_FOUND.message);
            }

            // 2. 删除头像
            await this.userRepository.update(userId, {
                avatar: null,
                updated_at: new Date()
            }, transaction);

            // 3. 清除用户缓存
            await this.clearUserCache(userId);

            this.logger.info('用户头像删除成功', {
                userId
            });

            return true;
        });
    }

    /**
     * 获取用户列表（管理端）
     * @param {Object} query - 查询参数
     * @returns {Promise<Object>} 分页结果
     */
    async getUserList(query = {}) {
        try {
            const result = await this.userRepository.searchUsers(query);
            
            // 脱敏处理
            result.items = result.items.map(user => {
                const userData = user.toJSON ? user.toJSON() : user;
                delete userData.password;
                return userData;
            });

            return result;
        } catch (error) {
            this.logger.error('获取用户列表失败', {
                error: error.message,
                query,
                stack: error.stack
            });
            throw error;
        }
    }

    /**
     * 获取用户统计信息（管理端）
     * @param {Object} filters - 筛选条件
     * @returns {Promise<Object>} 统计信息
     */
    async getUserStats(filters = {}) {
        try {
            const stats = await this.userRepository.getStats(filters);
            return stats;
        } catch (error) {
            this.logger.error('获取用户统计失败', {
                error: error.message,
                filters,
                stack: error.stack
            });
            throw error;
        }
    }

    /**
     * 批量更新用户状态（管理端）
     * @param {Array<number>} userIds - 用户ID数组
     * @param {string} status - 新状态
     * @returns {Promise<number>} 更新数量
     */
    async batchUpdateUserStatus(userIds, status) {
        try {
            const count = await this.userRepository.batchUpdateStatus(userIds, status);
            
            // 清除相关用户的缓存
            for (const userId of userIds) {
                await this.clearUserCache(userId);
                await cacheUtils.clearUserSession(userId);
            }

            this.logger.info('批量更新用户状态成功', {
                userIds,
                status,
                count
            });

            return count;
        } catch (error) {
            this.logger.error('批量更新用户状态失败', {
                error: error.message,
                userIds,
                status,
                stack: error.stack
            });
            throw error;
        }
    }

    /**
     * 清除用户缓存
     * @param {number} userId - 用户ID
     * @returns {Promise<void>}
     */
    async clearUserCache(userId) {
        const cacheKeys = [
            `user:${userId}:basic`,
            `user:${userId}:full`,
            `user:${userId}:profile`
        ];

        for (const key of cacheKeys) {
            await this.clearFromCache(key);
        }
    }
}

module.exports = UserService; 