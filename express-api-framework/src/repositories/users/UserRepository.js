const BaseRepository = require('../base/BaseRepository');
const User = require('../../models/User');
const { ERRORS } = require('../../constants/errors');

/**
 * 用户数据访问层
 * 专门处理用户相关的数据库操作
 */
class UserRepository extends BaseRepository {
    constructor() {
        super('users', User);
    }

    /**
     * 根据用户名查找用户
     * @param {string} username - 用户名
     * @returns {Promise<User|null>} 用户对象或null
     */
    async findByUsername(username) {
        try {
            const query = this.buildQuery()
                .where('username', username)
                .where('is_deleted', false)
                .limit(1);

            const [users] = await this.executeQuery(query);
            return users.length > 0 ? new User(users[0]) : null;
        } catch (error) {
            this.logger.error('根据用户名查找用户失败', {
                error: error.message,
                username,
                stack: error.stack
            });
            throw new Error(ERRORS.DB_QUERY_ERROR.message);
        }
    }

    /**
     * 根据邮箱查找用户
     * @param {string} email - 邮箱地址
     * @returns {Promise<User|null>} 用户对象或null
     */
    async findByEmail(email) {
        try {
            const query = this.buildQuery()
                .where('email', email)
                .where('is_deleted', false)
                .limit(1);

            const [users] = await this.executeQuery(query);
            return users.length > 0 ? new User(users[0]) : null;
        } catch (error) {
            this.logger.error('根据邮箱查找用户失败', {
                error: error.message,
                email,
                stack: error.stack
            });
            throw new Error(ERRORS.DB_QUERY_ERROR.message);
        }
    }

    /**
     * 根据手机号查找用户
     * @param {string} phone - 手机号
     * @returns {Promise<User|null>} 用户对象或null
     */
    async findByPhone(phone) {
        try {
            const query = this.buildQuery()
                .where('phone', phone)
                .where('is_deleted', false)
                .limit(1);

            const [users] = await this.executeQuery(query);
            return users.length > 0 ? new User(users[0]) : null;
        } catch (error) {
            this.logger.error('根据手机号查找用户失败', {
                error: error.message,
                phone,
                stack: error.stack
            });
            throw new Error(ERRORS.DB_QUERY_ERROR.message);
        }
    }

    /**
     * 根据微信OpenID查找用户
     * @param {string} openId - 微信OpenID
     * @returns {Promise<User|null>} 用户对象或null
     */
    async findByWechatOpenId(openId) {
        try {
            const query = this.buildQuery()
                .where('wechat_openid', openId)
                .where('is_deleted', false)
                .limit(1);

            const [users] = await this.executeQuery(query);
            return users.length > 0 ? new User(users[0]) : null;
        } catch (error) {
            this.logger.error('根据微信OpenID查找用户失败', {
                error: error.message,
                openId,
                stack: error.stack
            });
            throw new Error(ERRORS.DB_QUERY_ERROR.message);
        }
    }

    /**
     * 检查用户名是否已存在
     * @param {string} username - 用户名
     * @param {number} excludeId - 排除的用户ID（用于更新时的检查）
     * @returns {Promise<boolean>} 是否存在
     */
    async existsByUsername(username, excludeId = null) {
        try {
            const query = this.buildQuery()
                .select('COUNT(*) as count')
                .where('username', username)
                .where('is_deleted', false);

            if (excludeId) {
                query.where('id', '!=', excludeId);
            }

            const [result] = await this.executeQuery(query);
            return result[0].count > 0;
        } catch (error) {
            this.logger.error('检查用户名是否存在失败', {
                error: error.message,
                username,
                excludeId,
                stack: error.stack
            });
            throw new Error(ERRORS.DB_QUERY_ERROR.message);
        }
    }

    /**
     * 检查邮箱是否已存在
     * @param {string} email - 邮箱地址
     * @param {number} excludeId - 排除的用户ID
     * @returns {Promise<boolean>} 是否存在
     */
    async existsByEmail(email, excludeId = null) {
        try {
            const query = this.buildQuery()
                .select('COUNT(*) as count')
                .where('email', email)
                .where('is_deleted', false);

            if (excludeId) {
                query.where('id', '!=', excludeId);
            }

            const [result] = await this.executeQuery(query);
            return result[0].count > 0;
        } catch (error) {
            this.logger.error('检查邮箱是否存在失败', {
                error: error.message,
                email,
                excludeId,
                stack: error.stack
            });
            throw new Error(ERRORS.DB_QUERY_ERROR.message);
        }
    }

    /**
     * 检查手机号是否已存在
     * @param {string} phone - 手机号
     * @param {number} excludeId - 排除的用户ID
     * @returns {Promise<boolean>} 是否存在
     */
    async existsByPhone(phone, excludeId = null) {
        try {
            const query = this.buildQuery()
                .select('COUNT(*) as count')
                .where('phone', phone)
                .where('is_deleted', false);

            if (excludeId) {
                query.where('id', '!=', excludeId);
            }

            const [result] = await this.executeQuery(query);
            return result[0].count > 0;
        } catch (error) {
            this.logger.error('检查手机号是否存在失败', {
                error: error.message,
                phone,
                excludeId,
                stack: error.stack
            });
            throw new Error(ERRORS.DB_QUERY_ERROR.message);
        }
    }

    /**
     * 获取用户统计信息
     * @param {Object} filters - 筛选条件
     * @returns {Promise<Object>} 统计信息
     */
    async getStats(filters = {}) {
        try {
            const statsQuery = this.buildQuery()
                .select(`
                    COUNT(*) as total_users,
                    COUNT(CASE WHEN status = 'active' THEN 1 END) as active_users,
                    COUNT(CASE WHEN status = 'inactive' THEN 1 END) as inactive_users,
                    COUNT(CASE WHEN status = 'suspended' THEN 1 END) as suspended_users,
                    COUNT(CASE WHEN is_email_verified = 1 THEN 1 END) as verified_users,
                    COUNT(CASE WHEN wechat_openid IS NOT NULL THEN 1 END) as wechat_users,
                    COUNT(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 END) as new_users_week,
                    COUNT(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 END) as new_users_month
                `)
                .where('is_deleted', false);

            // 应用筛选条件
            if (filters.dateFrom) {
                statsQuery.where('created_at', '>=', filters.dateFrom);
            }
            if (filters.dateTo) {
                statsQuery.where('created_at', '<=', filters.dateTo);
            }
            if (filters.status) {
                statsQuery.where('status', filters.status);
            }

            const [stats] = await this.executeQuery(statsQuery);
            return stats[0];
        } catch (error) {
            this.logger.error('获取用户统计信息失败', {
                error: error.message,
                filters,
                stack: error.stack
            });
            throw new Error(ERRORS.DB_QUERY_ERROR.message);
        }
    }

    /**
     * 更新用户最后登录时间
     * @param {number} userId - 用户ID
     * @param {string} loginIp - 登录IP
     * @returns {Promise<boolean>} 是否成功
     */
    async updateLastLogin(userId, loginIp) {
        try {
            const updateData = {
                last_login_at: new Date(),
                login_count: { raw: 'login_count + 1' },
                last_login_ip: loginIp,
                updated_at: new Date()
            };

            const result = await this.update(userId, updateData);
            return result;
        } catch (error) {
            this.logger.error('更新最后登录时间失败', {
                error: error.message,
                userId,
                loginIp,
                stack: error.stack
            });
            throw new Error(ERRORS.DB_UPDATE_ERROR.message);
        }
    }

    /**
     * 更新用户密码
     * @param {number} userId - 用户ID
     * @param {string} hashedPassword - 加密后的密码
     * @returns {Promise<boolean>} 是否成功
     */
    async updatePassword(userId, hashedPassword) {
        try {
            const updateData = {
                password: hashedPassword,
                password_changed_at: new Date(),
                updated_at: new Date()
            };

            const result = await this.update(userId, updateData);
            return result;
        } catch (error) {
            this.logger.error('更新用户密码失败', {
                error: error.message,
                userId,
                stack: error.stack
            });
            throw new Error(ERRORS.DB_UPDATE_ERROR.message);
        }
    }

    /**
     * 锁定用户账户
     * @param {number} userId - 用户ID
     * @param {string} reason - 锁定原因
     * @returns {Promise<boolean>} 是否成功
     */
    async lockUser(userId, reason = '账户安全') {
        try {
            const updateData = {
                status: 'locked',
                locked_at: new Date(),
                lock_reason: reason,
                updated_at: new Date()
            };

            const result = await this.update(userId, updateData);
            return result;
        } catch (error) {
            this.logger.error('锁定用户账户失败', {
                error: error.message,
                userId,
                reason,
                stack: error.stack
            });
            throw new Error(ERRORS.DB_UPDATE_ERROR.message);
        }
    }

    /**
     * 解锁用户账户
     * @param {number} userId - 用户ID
     * @returns {Promise<boolean>} 是否成功
     */
    async unlockUser(userId) {
        try {
            const updateData = {
                status: 'active',
                locked_at: null,
                lock_reason: null,
                failed_login_attempts: 0,
                updated_at: new Date()
            };

            const result = await this.update(userId, updateData);
            return result;
        } catch (error) {
            this.logger.error('解锁用户账户失败', {
                error: error.message,
                userId,
                stack: error.stack
            });
            throw new Error(ERRORS.DB_UPDATE_ERROR.message);
        }
    }

    /**
     * 更新失败登录次数
     * @param {number} userId - 用户ID
     * @returns {Promise<number>} 当前失败次数
     */
    async incrementFailedLoginAttempts(userId) {
        try {
            const updateData = {
                failed_login_attempts: { raw: 'failed_login_attempts + 1' },
                updated_at: new Date()
            };

            await this.update(userId, updateData);

            // 获取当前失败次数
            const user = await this.findById(userId);
            return user ? user.failed_login_attempts : 0;
        } catch (error) {
            this.logger.error('更新失败登录次数失败', {
                error: error.message,
                userId,
                stack: error.stack
            });
            throw new Error(ERRORS.DB_UPDATE_ERROR.message);
        }
    }

    /**
     * 重置失败登录次数
     * @param {number} userId - 用户ID
     * @returns {Promise<boolean>} 是否成功
     */
    async resetFailedLoginAttempts(userId) {
        try {
            const updateData = {
                failed_login_attempts: 0,
                updated_at: new Date()
            };

            const result = await this.update(userId, updateData);
            return result;
        } catch (error) {
            this.logger.error('重置失败登录次数失败', {
                error: error.message,
                userId,
                stack: error.stack
            });
            throw new Error(ERRORS.DB_UPDATE_ERROR.message);
        }
    }

    /**
     * 绑定微信信息
     * @param {number} userId - 用户ID
     * @param {Object} wechatInfo - 微信信息
     * @returns {Promise<boolean>} 是否成功
     */
    async bindWechat(userId, wechatInfo) {
        try {
            const updateData = {
                wechat_openid: wechatInfo.openid,
                wechat_unionid: wechatInfo.unionid,
                wechat_nickname: wechatInfo.nickname,
                wechat_avatar: wechatInfo.avatar,
                updated_at: new Date()
            };

            const result = await this.update(userId, updateData);
            return result;
        } catch (error) {
            this.logger.error('绑定微信信息失败', {
                error: error.message,
                userId,
                wechatInfo,
                stack: error.stack
            });
            throw new Error(ERRORS.DB_UPDATE_ERROR.message);
        }
    }

    /**
     * 解绑微信信息
     * @param {number} userId - 用户ID
     * @returns {Promise<boolean>} 是否成功
     */
    async unbindWechat(userId) {
        try {
            const updateData = {
                wechat_openid: null,
                wechat_unionid: null,
                wechat_nickname: null,
                wechat_avatar: null,
                updated_at: new Date()
            };

            const result = await this.update(userId, updateData);
            return result;
        } catch (error) {
            this.logger.error('解绑微信信息失败', {
                error: error.message,
                userId,
                stack: error.stack
            });
            throw new Error(ERRORS.DB_UPDATE_ERROR.message);
        }
    }

    /**
     * 获取用户登录历史
     * @param {number} userId - 用户ID
     * @param {Object} options - 查询选项
     * @returns {Promise<Object>} 分页结果
     */
    async getLoginHistory(userId, options = {}) {
        try {
            const {
                page = 1,
                pageSize = 20,
                orderBy = 'created_at',
                orderDir = 'desc'
            } = options;

            // 这里简化处理，实际应该有专门的登录历史表
            // 暂时返回用户的登录相关信息
            const user = await this.findById(userId);
            if (!user) {
                return {
                    items: [],
                    pagination: this.buildPagination(0, page, pageSize)
                };
            }

            const history = [{
                id: 1,
                user_id: userId,
                login_time: user.last_login_at,
                login_ip: user.last_login_ip,
                user_agent: 'Unknown',
                status: 'success'
            }];

            return {
                items: history,
                pagination: this.buildPagination(history.length, page, pageSize)
            };
        } catch (error) {
            this.logger.error('获取用户登录历史失败', {
                error: error.message,
                userId,
                options,
                stack: error.stack
            });
            throw new Error(ERRORS.DB_QUERY_ERROR.message);
        }
    }

    /**
     * 批量更新用户状态
     * @param {Array<number>} userIds - 用户ID数组
     * @param {string} status - 新状态
     * @returns {Promise<number>} 更新的数量
     */
    async batchUpdateStatus(userIds, status) {
        try {
            if (!userIds || userIds.length === 0) {
                return 0;
            }

            const query = this.buildQuery()
                .update({ 
                    status, 
                    updated_at: new Date() 
                })
                .whereIn('id', userIds)
                .where('is_deleted', false);

            const [result] = await this.executeQuery(query);
            return result.affectedRows;
        } catch (error) {
            this.logger.error('批量更新用户状态失败', {
                error: error.message,
                userIds,
                status,
                stack: error.stack
            });
            throw new Error(ERRORS.DB_UPDATE_ERROR.message);
        }
    }

    /**
     * 搜索用户
     * @param {Object} searchParams - 搜索参数
     * @returns {Promise<Object>} 分页结果
     */
    async searchUsers(searchParams = {}) {
        try {
            const {
                keyword = '',
                status = '',
                role = '',
                isEmailVerified = null,
                dateFrom = null,
                dateTo = null,
                page = 1,
                pageSize = 20,
                orderBy = 'created_at',
                orderDir = 'desc'
            } = searchParams;

            const query = this.buildQuery()
                .where('is_deleted', false);

            // 关键词搜索
            if (keyword) {
                query.where(function() {
                    this.where('username', 'LIKE', `%${keyword}%`)
                        .orWhere('nickname', 'LIKE', `%${keyword}%`)
                        .orWhere('email', 'LIKE', `%${keyword}%`)
                        .orWhere('phone', 'LIKE', `%${keyword}%`);
                });
            }

            // 状态筛选
            if (status) {
                query.where('status', status);
            }

            // 角色筛选
            if (role) {
                query.where('role', role);
            }

            // 邮箱验证状态
            if (isEmailVerified !== null) {
                query.where('is_email_verified', isEmailVerified);
            }

            // 日期范围
            if (dateFrom) {
                query.where('created_at', '>=', dateFrom);
            }
            if (dateTo) {
                query.where('created_at', '<=', dateTo);
            }

            return await this.paginate(query, page, pageSize, orderBy, orderDir);
        } catch (error) {
            this.logger.error('搜索用户失败', {
                error: error.message,
                searchParams,
                stack: error.stack
            });
            throw new Error(ERRORS.DB_QUERY_ERROR.message);
        }
    }
}

module.exports = UserRepository; 