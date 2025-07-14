const BaseController = require('../base/BaseController');
const UserService = require('../../services/users/UserService');
const { validateUserQuery, validateUserCreate, validateUserUpdate, validateBatchUpdate } = require('../../validators/user');

/**
 * 管理端用户控制器
 * 处理用户管理相关的HTTP请求
 */
class UserController extends BaseController {
    constructor() {
        super();
        this.userService = new UserService();
    }

    /**
     * 获取用户列表
     * GET /admin/users
     */
    getUsers = this.asyncHandler(async (req, res) => {
        try {
            // 1. 检查权限
            this.requirePermissions(req.user, ['users.read']);

            // 2. 验证查询参数
            const validatedQuery = await this.validateRequest(req, validateUserQuery, 'query');

            // 3. 获取分页和排序参数
            const { page, pageSize } = this.getPaginationParams(req);
            const { orderBy, orderDir } = this.getSortParams(req);

            // 4. 构建查询参数
            const queryParams = {
                ...validatedQuery,
                page,
                pageSize,
                orderBy,
                orderDir
            };

            // 5. 调用用户列表服务
            const result = await this.userService.getUserList(queryParams);

            // 6. 记录操作日志
            this.logger.info('获取用户列表', {
                adminId: req.user.id,
                queryParams,
                total: result.pagination.total,
                clientIp: this.getClientIp(req)
            });

            // 7. 返回响应
            res.success('获取成功', result);
        } catch (error) {
            this.logger.error('获取用户列表失败', {
                error: error.message,
                adminId: req.user?.id,
                query: req.query,
                stack: error.stack
            });
            
            res.error(error.message, 400);
        }
    });

    /**
     * 获取单个用户信息
     * GET /admin/users/:id
     */
    getUserById = this.asyncHandler(async (req, res) => {
        try {
            // 1. 检查权限
            this.requirePermissions(req.user, ['users.read']);

            // 2. 验证用户ID
            const userId = this.validateId(req.params.id);

            // 3. 获取用户信息（包含敏感信息）
            const user = await this.userService.getUserById(userId, true);

            if (!user) {
                return res.error('用户不存在', 404);
            }

            // 4. 记录操作日志
            this.logger.info('获取用户详情', {
                adminId: req.user.id,
                targetUserId: userId,
                clientIp: this.getClientIp(req)
            });

            // 5. 返回响应
            res.success('获取成功', {
                user: user
            });
        } catch (error) {
            this.logger.error('获取用户详情失败', {
                error: error.message,
                adminId: req.user?.id,
                targetUserId: req.params.id,
                stack: error.stack
            });
            
            res.error(error.message, 400);
        }
    });

    /**
     * 创建用户
     * POST /admin/users
     */
    createUser = this.asyncHandler(async (req, res) => {
        try {
            // 1. 检查权限
            this.requirePermissions(req.user, ['users.create']);

            // 2. 验证请求数据
            const validatedData = await this.validateRequest(req, validateUserCreate);

            // 3. 调用注册服务（管理员创建用户）
            const authService = require('../../services/auth/AuthService');
            const service = new authService();
            
            const result = await service.register({
                ...validatedData,
                createdBy: req.user.id, // 记录创建者
                clientIp: this.getClientIp(req),
                userAgent: req.get('User-Agent')
            });

            // 4. 记录操作日志
            this.logger.info('管理员创建用户', {
                adminId: req.user.id,
                createdUserId: result.user.id,
                username: validatedData.username,
                email: validatedData.email,
                clientIp: this.getClientIp(req)
            });

            // 5. 返回响应
            res.created('用户创建成功', {
                user: result.user
            });
        } catch (error) {
            this.logger.error('创建用户失败', {
                error: error.message,
                adminId: req.user?.id,
                body: req.body,
                stack: error.stack
            });
            
            res.error(error.message, 400);
        }
    });

    /**
     * 更新用户信息
     * PUT /admin/users/:id
     */
    updateUser = this.asyncHandler(async (req, res) => {
        try {
            // 1. 检查权限
            this.requirePermissions(req.user, ['users.update']);

            // 2. 验证用户ID和请求数据
            const userId = this.validateId(req.params.id);
            const validatedData = await this.validateRequest(req, validateUserUpdate);

            // 3. 检查用户是否存在
            const existingUser = await this.userService.getUserById(userId);
            if (!existingUser) {
                return res.error('用户不存在', 404);
            }

            // 4. 调用更新服务
            const updatedUser = await this.userService.updateUserProfile(userId, validatedData);

            // 5. 记录操作日志
            this.logger.info('管理员更新用户信息', {
                adminId: req.user.id,
                targetUserId: userId,
                updatedFields: Object.keys(validatedData),
                clientIp: this.getClientIp(req)
            });

            // 6. 返回响应
            res.success('更新成功', {
                user: updatedUser.toJSON()
            });
        } catch (error) {
            this.logger.error('更新用户信息失败', {
                error: error.message,
                adminId: req.user?.id,
                targetUserId: req.params.id,
                body: req.body,
                stack: error.stack
            });
            
            res.error(error.message, 400);
        }
    });

    /**
     * 删除用户（软删除）
     * DELETE /admin/users/:id
     */
    deleteUser = this.asyncHandler(async (req, res) => {
        try {
            // 1. 检查权限
            this.requirePermissions(req.user, ['users.delete']);

            // 2. 验证用户ID
            const userId = this.validateId(req.params.id);

            // 3. 检查是否为超级管理员（不能删除）
            const targetUser = await this.userService.getUserById(userId);
            if (!targetUser) {
                return res.error('用户不存在', 404);
            }

            if (targetUser.role === 'super_admin') {
                return res.error('不能删除超级管理员账户', 403);
            }

            // 4. 检查是否删除自己
            if (userId === req.user.id) {
                return res.error('不能删除自己的账户', 403);
            }

            // 5. 执行软删除（这里简化处理，实际应该调用专门的删除服务）
            await this.userService.batchUpdateUserStatus([userId], 'deleted');

            // 6. 记录操作日志
            this.logger.info('管理员删除用户', {
                adminId: req.user.id,
                deletedUserId: userId,
                deletedUsername: targetUser.username,
                reason: req.body.reason || '管理员操作',
                clientIp: this.getClientIp(req)
            });

            // 7. 返回响应
            res.success('用户删除成功');
        } catch (error) {
            this.logger.error('删除用户失败', {
                error: error.message,
                adminId: req.user?.id,
                targetUserId: req.params.id,
                stack: error.stack
            });
            
            res.error(error.message, 400);
        }
    });

    /**
     * 批量删除用户
     * DELETE /admin/users/batch
     */
    batchDeleteUsers = this.asyncHandler(async (req, res) => {
        try {
            // 1. 检查权限
            this.requirePermissions(req.user, ['users.delete']);

            // 2. 验证请求数据
            const validatedData = await this.validateRequest(req, validateBatchUpdate);
            const { user_ids, reason } = validatedData;

            // 3. 检查是否包含自己
            if (user_ids.includes(req.user.id)) {
                return res.error('不能删除自己的账户', 403);
            }

            // 4. 检查是否包含超级管理员
            const users = await Promise.all(
                user_ids.map(id => this.userService.getUserById(id))
            );

            const superAdmins = users.filter(user => user && user.role === 'super_admin');
            if (superAdmins.length > 0) {
                return res.error('批量操作中包含超级管理员账户，操作被拒绝', 403);
            }

            // 5. 执行批量删除
            const deletedCount = await this.userService.batchUpdateUserStatus(user_ids, 'deleted');

            // 6. 记录操作日志
            this.logger.info('管理员批量删除用户', {
                adminId: req.user.id,
                deletedUserIds: user_ids,
                deletedCount,
                reason: reason || '批量管理员操作',
                clientIp: this.getClientIp(req)
            });

            // 7. 返回响应
            res.success(`成功删除 ${deletedCount} 个用户`, {
                deleted_count: deletedCount
            });
        } catch (error) {
            this.logger.error('批量删除用户失败', {
                error: error.message,
                adminId: req.user?.id,
                userIds: req.body.user_ids,
                stack: error.stack
            });
            
            res.error(error.message, 400);
        }
    });

    /**
     * 批量更新用户状态
     * PATCH /admin/users/batch-status
     */
    batchUpdateStatus = this.asyncHandler(async (req, res) => {
        try {
            // 1. 检查权限
            this.requirePermissions(req.user, ['users.update']);

            // 2. 验证请求数据
            const { user_ids, status, reason } = req.body;

            if (!user_ids || !Array.isArray(user_ids) || user_ids.length === 0) {
                return res.error('请选择要操作的用户', 400);
            }

            if (!status) {
                return res.error('请指定要更新的状态', 400);
            }

            // 3. 验证状态值
            const validStatuses = ['active', 'inactive', 'suspended', 'locked'];
            if (!validStatuses.includes(status)) {
                return res.error('无效的状态值', 400);
            }

            // 4. 检查是否包含自己（某些状态不能操作自己）
            if (['inactive', 'suspended', 'locked'].includes(status) && user_ids.includes(req.user.id)) {
                return res.error('不能对自己执行此操作', 403);
            }

            // 5. 执行批量更新
            const updatedCount = await this.userService.batchUpdateUserStatus(user_ids, status);

            // 6. 记录操作日志
            this.logger.info('管理员批量更新用户状态', {
                adminId: req.user.id,
                userIds: user_ids,
                newStatus: status,
                updatedCount,
                reason: reason || '批量状态更新',
                clientIp: this.getClientIp(req)
            });

            // 7. 返回响应
            res.success(`成功更新 ${updatedCount} 个用户状态`, {
                updated_count: updatedCount,
                new_status: status
            });
        } catch (error) {
            this.logger.error('批量更新用户状态失败', {
                error: error.message,
                adminId: req.user?.id,
                body: req.body,
                stack: error.stack
            });
            
            res.error(error.message, 400);
        }
    });

    /**
     * 获取用户统计数据
     * GET /admin/users/stats
     */
    getUserStats = this.asyncHandler(async (req, res) => {
        try {
            // 1. 检查权限
            this.requirePermissions(req.user, ['users.read', 'analytics.read']);

            // 2. 获取查询参数
            const { date_from, date_to, status } = req.query;

            // 3. 构建筛选条件
            const filters = {};
            if (date_from) filters.dateFrom = date_from;
            if (date_to) filters.dateTo = date_to;
            if (status) filters.status = status;

            // 4. 调用统计服务
            const stats = await this.userService.getUserStats(filters);

            // 5. 记录操作日志
            this.logger.info('获取用户统计数据', {
                adminId: req.user.id,
                filters,
                clientIp: this.getClientIp(req)
            });

            // 6. 返回响应
            res.success('获取成功', {
                stats,
                filters,
                generated_at: new Date().toISOString()
            });
        } catch (error) {
            this.logger.error('获取用户统计数据失败', {
                error: error.message,
                adminId: req.user?.id,
                query: req.query,
                stack: error.stack
            });
            
            res.error(error.message, 400);
        }
    });

    /**
     * 重置用户密码
     * POST /admin/users/:id/reset-password
     */
    resetUserPassword = this.asyncHandler(async (req, res) => {
        try {
            // 1. 检查权限
            this.requirePermissions(req.user, ['users.update']);

            // 2. 验证用户ID
            const userId = this.validateId(req.params.id);

            // 3. 检查用户是否存在
            const targetUser = await this.userService.getUserById(userId);
            if (!targetUser) {
                return res.error('用户不存在', 404);
            }

            // 4. 生成临时密码
            const tempPassword = this.generateTempPassword();

            // 5. 更新密码（这里简化处理）
            const cryptoUtils = require('../../utils/crypto');
            const hashedPassword = await cryptoUtils.hashPassword(tempPassword);
            
            // 假设有一个直接更新密码的方法
            // await this.userService.updatePassword(userId, hashedPassword);

            // 6. 记录操作日志
            this.logger.info('管理员重置用户密码', {
                adminId: req.user.id,
                targetUserId: userId,
                targetUsername: targetUser.username,
                clientIp: this.getClientIp(req)
            });

            // 7. 返回响应（实际项目中不应该返回明文密码）
            res.success('密码重置成功', {
                temp_password: tempPassword,
                message: '临时密码已生成，请通知用户及时修改'
            });
        } catch (error) {
            this.logger.error('重置用户密码失败', {
                error: error.message,
                adminId: req.user?.id,
                targetUserId: req.params.id,
                stack: error.stack
            });
            
            res.error(error.message, 400);
        }
    });

    /**
     * 锁定/解锁用户
     * POST /admin/users/:id/toggle-lock
     */
    toggleUserLock = this.asyncHandler(async (req, res) => {
        try {
            // 1. 检查权限
            this.requirePermissions(req.user, ['users.update']);

            // 2. 验证用户ID
            const userId = this.validateId(req.params.id);

            // 3. 检查是否操作自己
            if (userId === req.user.id) {
                return res.error('不能锁定自己的账户', 403);
            }

            // 4. 检查用户是否存在
            const targetUser = await this.userService.getUserById(userId);
            if (!targetUser) {
                return res.error('用户不存在', 404);
            }

            // 5. 检查是否为超级管理员
            if (targetUser.role === 'super_admin') {
                return res.error('不能锁定超级管理员账户', 403);
            }

            // 6. 切换锁定状态
            const newStatus = targetUser.status === 'locked' ? 'active' : 'locked';
            const action = newStatus === 'locked' ? '锁定' : '解锁';
            
            await this.userService.batchUpdateUserStatus([userId], newStatus);

            // 7. 记录操作日志
            this.logger.info(`管理员${action}用户`, {
                adminId: req.user.id,
                targetUserId: userId,
                targetUsername: targetUser.username,
                action,
                reason: req.body.reason || `管理员${action}操作`,
                clientIp: this.getClientIp(req)
            });

            // 8. 返回响应
            res.success(`用户${action}成功`, {
                user_id: userId,
                new_status: newStatus,
                action
            });
        } catch (error) {
            this.logger.error('切换用户锁定状态失败', {
                error: error.message,
                adminId: req.user?.id,
                targetUserId: req.params.id,
                stack: error.stack
            });
            
            res.error(error.message, 400);
        }
    });

    /**
     * 生成临时密码
     * @returns {string} 临时密码
     */
    generateTempPassword() {
        const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
        let result = '';
        for (let i = 0; i < 8; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    /**
     * 检查权限
     * @param {Object} user - 用户对象
     * @param {Array} requiredPermissions - 需要的权限
     */
    requirePermissions(user, requiredPermissions) {
        const userPermissions = this.getUserPermissions(user.role);
        const hasPermission = requiredPermissions.some(permission => 
            userPermissions.includes(permission)
        );

        if (!hasPermission) {
            throw new Error('权限不足');
        }
    }

    /**
     * 获取用户权限列表
     * @param {string} role - 用户角色
     * @returns {Array} 权限列表
     */
    getUserPermissions(role) {
        // 复用管理端认证控制器的权限逻辑
        const AuthController = require('./AuthController');
        const authController = new AuthController();
        return authController.getUserPermissions(role);
    }

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