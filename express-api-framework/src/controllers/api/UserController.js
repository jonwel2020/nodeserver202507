const BaseController = require('../base/BaseController');
const UserService = require('../../services/users/UserService');
const { validateUserUpdate, validatePasswordChange, validateBindPhone, validateUserSettings, validatePrivacySettings, validateNotificationSettings } = require('../../validators/user');

/**
 * 小程序端用户控制器
 * 处理用户管理相关的HTTP请求
 */
class UserController extends BaseController {
    constructor() {
        super();
        this.userService = new UserService();
    }

    /**
     * 获取个人信息
     * GET /api/users/profile
     */
    getProfile = this.asyncHandler(async (req, res) => {
        try {
            // 当前用户信息已通过认证中间件注入
            const currentUser = req.user;

            // 获取完整的用户信息
            const userInfo = await this.userService.getUserById(currentUser.id, false);

            // 记录操作日志
            this.logger.info('获取个人信息', {
                userId: currentUser.id,
                clientIp: this.getClientIp(req)
            });

            // 返回响应
            res.success('获取成功', {
                user: userInfo
            });
        } catch (error) {
            this.logger.error('获取个人信息失败', {
                error: error.message,
                userId: req.user?.id,
                stack: error.stack
            });
            
            res.error(error.message, 400);
        }
    });

    /**
     * 更新个人信息
     * PUT /api/users/profile
     */
    updateProfile = this.asyncHandler(async (req, res) => {
        try {
            // 1. 验证请求数据
            const validatedData = await this.validateRequest(req, validateUserUpdate);

            // 2. 获取当前用户ID
            const currentUser = req.user;

            // 3. 调用更新服务
            const updatedUser = await this.userService.updateUserProfile(
                currentUser.id,
                validatedData
            );

            // 4. 记录操作日志
            this.logger.info('更新个人信息成功', {
                userId: currentUser.id,
                updatedFields: Object.keys(validatedData),
                clientIp: this.getClientIp(req)
            });

            // 5. 返回响应
            res.success('更新成功', {
                user: updatedUser.toJSON()
            });
        } catch (error) {
            this.logger.error('更新个人信息失败', {
                error: error.message,
                userId: req.user?.id,
                body: req.body,
                stack: error.stack
            });
            
            res.error(error.message, 400);
        }
    });

    /**
     * 上传头像
     * POST /api/users/upload-avatar
     */
    uploadAvatar = this.asyncHandler(async (req, res) => {
        try {
            // 1. 检查文件是否上传
            if (!req.file) {
                return res.error('请选择要上传的头像文件', 400);
            }

            // 2. 获取当前用户ID
            const currentUser = req.user;

            // 3. 构建头像URL（这里简化处理，实际应该上传到云存储）
            const avatarUrl = `/uploads/avatars/${req.file.filename}`;

            // 4. 调用上传头像服务
            await this.userService.uploadAvatar(currentUser.id, avatarUrl);

            // 5. 记录操作日志
            this.logger.info('头像上传成功', {
                userId: currentUser.id,
                avatarUrl,
                fileSize: req.file.size,
                clientIp: this.getClientIp(req)
            });

            // 6. 返回响应
            res.success('头像上传成功', {
                avatar_url: avatarUrl
            });
        } catch (error) {
            this.logger.error('头像上传失败', {
                error: error.message,
                userId: req.user?.id,
                stack: error.stack
            });
            
            res.error(error.message, 400);
        }
    });

    /**
     * 删除头像
     * DELETE /api/users/avatar
     */
    deleteAvatar = this.asyncHandler(async (req, res) => {
        try {
            // 1. 获取当前用户ID
            const currentUser = req.user;

            // 2. 调用删除头像服务
            await this.userService.deleteAvatar(currentUser.id);

            // 3. 记录操作日志
            this.logger.info('头像删除成功', {
                userId: currentUser.id,
                clientIp: this.getClientIp(req)
            });

            // 4. 返回响应
            res.success('头像删除成功');
        } catch (error) {
            this.logger.error('头像删除失败', {
                error: error.message,
                userId: req.user?.id,
                stack: error.stack
            });
            
            res.error(error.message, 400);
        }
    });

    /**
     * 修改密码
     * PUT /api/users/change-password
     */
    changePassword = this.asyncHandler(async (req, res) => {
        try {
            // 1. 验证请求数据
            const validatedData = await this.validateRequest(req, validatePasswordChange);

            // 2. 获取当前用户ID
            const currentUser = req.user;

            // 3. 调用修改密码服务
            await this.userService.changePassword(
                currentUser.id,
                validatedData.old_password,
                validatedData.new_password
            );

            // 4. 记录操作日志
            this.logger.info('密码修改成功', {
                userId: currentUser.id,
                clientIp: this.getClientIp(req)
            });

            // 5. 返回响应
            res.success('密码修改成功，请重新登录');
        } catch (error) {
            this.logger.error('密码修改失败', {
                error: error.message,
                userId: req.user?.id,
                stack: error.stack
            });
            
            res.error(error.message, 400);
        }
    });

    /**
     * 绑定手机号
     * POST /api/users/bind-phone
     */
    bindPhone = this.asyncHandler(async (req, res) => {
        try {
            // 1. 验证请求数据
            const validatedData = await this.validateRequest(req, validateBindPhone);

            // 2. 获取当前用户ID
            const currentUser = req.user;

            // 3. 调用绑定手机号服务
            await this.userService.bindPhone(
                currentUser.id,
                validatedData.phone,
                validatedData.verification_code
            );

            // 4. 记录操作日志
            this.logger.info('手机号绑定成功', {
                userId: currentUser.id,
                phone: validatedData.phone,
                clientIp: this.getClientIp(req)
            });

            // 5. 返回响应
            res.success('手机号绑定成功');
        } catch (error) {
            this.logger.error('手机号绑定失败', {
                error: error.message,
                userId: req.user?.id,
                phone: req.body.phone,
                stack: error.stack
            });
            
            res.error(error.message, 400);
        }
    });

    /**
     * 验证手机号
     * POST /api/users/verify-phone
     */
    verifyPhone = this.asyncHandler(async (req, res) => {
        try {
            // 1. 验证请求数据
            const validatedData = await this.validateRequest(req, validateBindPhone);

            // 2. 获取当前用户ID
            const currentUser = req.user;

            // 3. 调用验证手机号服务（这里复用绑定手机号的逻辑）
            await this.userService.bindPhone(
                currentUser.id,
                validatedData.phone,
                validatedData.verification_code
            );

            // 4. 记录操作日志
            this.logger.info('手机号验证成功', {
                userId: currentUser.id,
                phone: validatedData.phone,
                clientIp: this.getClientIp(req)
            });

            // 5. 返回响应
            res.success('手机号验证成功');
        } catch (error) {
            this.logger.error('手机号验证失败', {
                error: error.message,
                userId: req.user?.id,
                phone: req.body.phone,
                stack: error.stack
            });
            
            res.error(error.message, 400);
        }
    });

    /**
     * 更新手机号
     * PUT /api/users/update-phone
     */
    updatePhone = this.asyncHandler(async (req, res) => {
        try {
            // 1. 验证请求数据
            const validatedData = await this.validateRequest(req, validateBindPhone);

            // 2. 获取当前用户ID
            const currentUser = req.user;

            // 3. 调用更新手机号服务
            await this.userService.updatePhone(
                currentUser.id,
                validatedData.phone,
                validatedData.verification_code
            );

            // 4. 记录操作日志
            this.logger.info('手机号更新成功', {
                userId: currentUser.id,
                newPhone: validatedData.phone,
                clientIp: this.getClientIp(req)
            });

            // 5. 返回响应
            res.success('手机号更新成功');
        } catch (error) {
            this.logger.error('手机号更新失败', {
                error: error.message,
                userId: req.user?.id,
                phone: req.body.phone,
                stack: error.stack
            });
            
            res.error(error.message, 400);
        }
    });

    /**
     * 绑定微信
     * POST /api/users/bind-wechat
     */
    bindWechat = this.asyncHandler(async (req, res) => {
        try {
            // 1. 获取当前用户ID
            const currentUser = req.user;

            // 2. 获取微信信息（这里简化处理）
            const wechatInfo = {
                openid: req.body.openid || 'mock_openid',
                unionid: req.body.unionid || 'mock_unionid',
                nickname: req.body.nickname || '微信用户',
                avatar: req.body.avatar || null
            };

            // 3. 调用绑定微信服务
            await this.userService.bindWechat(currentUser.id, wechatInfo);

            // 4. 记录操作日志
            this.logger.info('微信绑定成功', {
                userId: currentUser.id,
                openid: wechatInfo.openid,
                clientIp: this.getClientIp(req)
            });

            // 5. 返回响应
            res.success('微信绑定成功');
        } catch (error) {
            this.logger.error('微信绑定失败', {
                error: error.message,
                userId: req.user?.id,
                stack: error.stack
            });
            
            res.error(error.message, 400);
        }
    });

    /**
     * 解绑微信
     * DELETE /api/users/unbind-wechat
     */
    unbindWechat = this.asyncHandler(async (req, res) => {
        try {
            // 1. 获取当前用户ID
            const currentUser = req.user;

            // 2. 调用解绑微信服务
            await this.userService.unbindWechat(currentUser.id);

            // 3. 记录操作日志
            this.logger.info('微信解绑成功', {
                userId: currentUser.id,
                clientIp: this.getClientIp(req)
            });

            // 4. 返回响应
            res.success('微信解绑成功');
        } catch (error) {
            this.logger.error('微信解绑失败', {
                error: error.message,
                userId: req.user?.id,
                stack: error.stack
            });
            
            res.error(error.message, 400);
        }
    });

    /**
     * 获取用户设置
     * GET /api/users/settings
     */
    getSettings = this.asyncHandler(async (req, res) => {
        try {
            // 1. 获取当前用户信息
            const currentUser = req.user;
            const userInfo = await this.userService.getUserById(currentUser.id);

            // 2. 解析设置信息
            const settings = {
                personal_settings: userInfo.settings ? JSON.parse(userInfo.settings) : {},
                privacy_settings: userInfo.privacy_settings ? JSON.parse(userInfo.privacy_settings) : {},
                notification_settings: userInfo.notification_settings ? JSON.parse(userInfo.notification_settings) : {}
            };

            // 3. 记录操作日志
            this.logger.info('获取用户设置', {
                userId: currentUser.id,
                clientIp: this.getClientIp(req)
            });

            // 4. 返回响应
            res.success('获取成功', settings);
        } catch (error) {
            this.logger.error('获取用户设置失败', {
                error: error.message,
                userId: req.user?.id,
                stack: error.stack
            });
            
            res.error(error.message, 400);
        }
    });

    /**
     * 更新用户设置
     * PUT /api/users/settings
     */
    updateSettings = this.asyncHandler(async (req, res) => {
        try {
            // 1. 验证请求数据
            const validatedData = await this.validateRequest(req, validateUserSettings);

            // 2. 获取当前用户ID
            const currentUser = req.user;

            // 3. 调用更新设置服务
            await this.userService.updateSettings(currentUser.id, validatedData);

            // 4. 记录操作日志
            this.logger.info('用户设置更新成功', {
                userId: currentUser.id,
                updatedSettings: Object.keys(validatedData),
                clientIp: this.getClientIp(req)
            });

            // 5. 返回响应
            res.success('设置更新成功');
        } catch (error) {
            this.logger.error('用户设置更新失败', {
                error: error.message,
                userId: req.user?.id,
                body: req.body,
                stack: error.stack
            });
            
            res.error(error.message, 400);
        }
    });

    /**
     * 更新隐私设置
     * PUT /api/users/privacy-settings
     */
    updatePrivacySettings = this.asyncHandler(async (req, res) => {
        try {
            // 1. 验证请求数据
            const validatedData = await this.validateRequest(req, validatePrivacySettings);

            // 2. 获取当前用户ID
            const currentUser = req.user;

            // 3. 调用更新隐私设置服务
            await this.userService.updatePrivacySettings(currentUser.id, validatedData);

            // 4. 记录操作日志
            this.logger.info('隐私设置更新成功', {
                userId: currentUser.id,
                updatedSettings: Object.keys(validatedData),
                clientIp: this.getClientIp(req)
            });

            // 5. 返回响应
            res.success('隐私设置更新成功');
        } catch (error) {
            this.logger.error('隐私设置更新失败', {
                error: error.message,
                userId: req.user?.id,
                body: req.body,
                stack: error.stack
            });
            
            res.error(error.message, 400);
        }
    });

    /**
     * 更新通知设置
     * PUT /api/users/notification-settings
     */
    updateNotificationSettings = this.asyncHandler(async (req, res) => {
        try {
            // 1. 验证请求数据
            const validatedData = await this.validateRequest(req, validateNotificationSettings);

            // 2. 获取当前用户ID
            const currentUser = req.user;

            // 3. 调用更新通知设置服务
            await this.userService.updateNotificationSettings(currentUser.id, validatedData);

            // 4. 记录操作日志
            this.logger.info('通知设置更新成功', {
                userId: currentUser.id,
                updatedSettings: Object.keys(validatedData),
                clientIp: this.getClientIp(req)
            });

            // 5. 返回响应
            res.success('通知设置更新成功');
        } catch (error) {
            this.logger.error('通知设置更新失败', {
                error: error.message,
                userId: req.user?.id,
                body: req.body,
                stack: error.stack
            });
            
            res.error(error.message, 400);
        }
    });

    /**
     * 注销/停用账户
     * POST /api/users/deactivate
     */
    deactivateAccount = this.asyncHandler(async (req, res) => {
        try {
            // 1. 获取当前用户ID
            const currentUser = req.user;

            // 2. 验证密码
            if (!req.body.password) {
                return res.error('请输入密码确认', 400);
            }

            // 3. 调用注销账户服务
            await this.userService.deactivateAccount(
                currentUser.id,
                req.body.password,
                req.body.reason || '用户主动注销'
            );

            // 4. 记录操作日志
            this.logger.info('账户注销成功', {
                userId: currentUser.id,
                reason: req.body.reason,
                clientIp: this.getClientIp(req)
            });

            // 5. 返回响应
            res.success('账户注销成功');
        } catch (error) {
            this.logger.error('账户注销失败', {
                error: error.message,
                userId: req.user?.id,
                stack: error.stack
            });
            
            res.error(error.message, 400);
        }
    });

    /**
     * 获取登录历史
     * GET /api/users/login-history
     */
    getLoginHistory = this.asyncHandler(async (req, res) => {
        try {
            // 1. 获取当前用户ID
            const currentUser = req.user;

            // 2. 获取分页参数
            const { page, pageSize } = this.getPaginationParams(req);

            // 3. 调用获取登录历史服务
            const result = await this.userService.getLoginHistory(currentUser.id, {
                page,
                pageSize
            });

            // 4. 记录操作日志
            this.logger.info('获取登录历史', {
                userId: currentUser.id,
                page,
                pageSize,
                clientIp: this.getClientIp(req)
            });

            // 5. 返回响应
            res.success('获取成功', result);
        } catch (error) {
            this.logger.error('获取登录历史失败', {
                error: error.message,
                userId: req.user?.id,
                stack: error.stack
            });
            
            res.error(error.message, 400);
        }
    });

    /**
     * 用户反馈
     * POST /api/users/feedback
     */
    submitFeedback = this.asyncHandler(async (req, res) => {
        try {
            // 1. 获取当前用户ID
            const currentUser = req.user;

            // 2. 验证反馈内容
            if (!req.body.content || req.body.content.trim().length === 0) {
                return res.error('反馈内容不能为空', 400);
            }

            // 3. 构建反馈数据
            const feedbackData = {
                user_id: currentUser.id,
                type: req.body.type || 'general',
                content: req.body.content.trim(),
                contact: req.body.contact || null,
                client_ip: this.getClientIp(req),
                user_agent: req.get('User-Agent'),
                created_at: new Date()
            };

            // 4. 记录反馈（这里简化处理，实际应该保存到数据库）
            this.logger.info('用户反馈提交', {
                userId: currentUser.id,
                type: feedbackData.type,
                content: feedbackData.content.substring(0, 100),
                clientIp: this.getClientIp(req)
            });

            // 5. 返回响应
            res.success('反馈提交成功，感谢您的意见和建议');
        } catch (error) {
            this.logger.error('用户反馈提交失败', {
                error: error.message,
                userId: req.user?.id,
                stack: error.stack
            });
            
            res.error(error.message, 400);
        }
    });

    /**
     * 删除个人数据（GDPR合规）
     * DELETE /api/users/delete-data
     */
    deleteUserData = this.asyncHandler(async (req, res) => {
        try {
            // 1. 获取当前用户ID
            const currentUser = req.user;

            // 2. 验证密码
            if (!req.body.password) {
                return res.error('请输入密码确认', 400);
            }

            // 3. 记录数据删除请求
            this.logger.info('用户数据删除请求', {
                userId: currentUser.id,
                reason: req.body.reason || 'GDPR合规',
                clientIp: this.getClientIp(req)
            });

            // 4. 这里简化处理，实际应该：
            // - 验证密码
            // - 将用户数据标记为待删除
            // - 启动数据清理流程
            // - 发送确认邮件

            // 5. 返回响应
            res.success('数据删除请求已提交，我们将在7个工作日内处理');
        } catch (error) {
            this.logger.error('用户数据删除请求失败', {
                error: error.message,
                userId: req.user?.id,
                stack: error.stack
            });
            
            res.error(error.message, 400);
        }
    });

    /**
     * 获取客户端IP
     * @param {Object} req - 请求对象
     * @returns {string} IP地址
     */
    getClientIp(req) {
        return req.ip || 
               req.connection.remoteAddress || 
               req.socket.remoteAddress ||
               (req.connection.socket && req.connection.socket.remoteAddress) ||
               '127.0.0.1';
    }
}

module.exports = UserController; 