const BaseController = require('../base/BaseController');
const AuthService = require('../../services/auth/AuthService');
const { validateLogin, validateRefreshToken } = require('../../validators/auth');

/**
 * 管理端认证控制器
 * 处理管理员认证相关的HTTP请求
 */
class AuthController extends BaseController {
    constructor() {
        super();
        this.authService = new AuthService();
    }

    /**
     * 管理员登录
     * POST /admin/auth/login
     */
    login = this.asyncHandler(async (req, res) => {
        try {
            // 1. 验证请求数据
            const validatedData = await this.validateRequest(req, validateLogin);

            // 2. 获取客户端信息
            const clientInfo = this.getClientInfo(req);

            // 3. IP白名单检查（这里简化处理，实际应该从配置中读取）
            const allowedIPs = process.env.ADMIN_ALLOWED_IPS?.split(',') || ['127.0.0.1', '::1'];
            if (!allowedIPs.includes(clientInfo.clientIp)) {
                this.logger.warn('管理端登录IP受限', {
                    clientIp: clientInfo.clientIp,
                    identifier: validatedData.identifier
                });
                return res.error('访问受限：IP地址不在白名单中', 403);
            }

            // 4. 调用登录服务
            const result = await this.authService.login({
                identifier: validatedData.identifier,
                password: validatedData.password,
                loginIp: clientInfo.clientIp,
                userAgent: clientInfo.userAgent,
                loginType: 'admin' // 管理端登录
            });

            // 5. 记录管理员登录日志
            this.logger.info('管理员登录成功', {
                userId: result.user.id,
                username: result.user.username,
                role: result.user.role,
                clientIp: clientInfo.clientIp,
                userAgent: clientInfo.userAgent,
                loginType: 'admin'
            });

            // 6. 返回响应
            res.success('登录成功', {
                user: result.user,
                access_token: result.access_token,
                refresh_token: result.refresh_token,
                token_type: result.token_type,
                expires_in: result.expires_in,
                permissions: this.getUserPermissions(result.user.role)
            });
        } catch (error) {
            this.logger.error('管理员登录失败', {
                error: error.message,
                identifier: req.body.identifier,
                clientIp: this.getClientIp(req),
                loginType: 'admin',
                stack: error.stack
            });
            
            res.error(error.message, 401);
        }
    });

    /**
     * 管理员登出
     * POST /admin/auth/logout
     */
    logout = this.asyncHandler(async (req, res) => {
        try {
            // 1. 获取当前管理员信息
            const currentUser = req.user;

            // 2. 调用登出服务
            await this.authService.logout(currentUser.id, 'admin');

            // 3. 记录管理员登出日志
            this.logger.info('管理员登出成功', {
                userId: currentUser.id,
                username: currentUser.username,
                role: currentUser.role,
                clientIp: this.getClientIp(req),
                loginType: 'admin'
            });

            // 4. 返回响应
            res.success('登出成功');
        } catch (error) {
            this.logger.error('管理员登出失败', {
                error: error.message,
                userId: req.user?.id,
                loginType: 'admin',
                stack: error.stack
            });
            
            res.error(error.message, 400);
        }
    });

    /**
     * 刷新Token
     * POST /admin/auth/refresh
     */
    refreshToken = this.asyncHandler(async (req, res) => {
        try {
            // 1. 验证请求数据
            const validatedData = await this.validateRequest(req, validateRefreshToken);

            // 2. 调用刷新Token服务
            const result = await this.authService.refreshToken(
                validatedData.refresh_token,
                'admin' // 管理端
            );

            // 3. 记录操作日志
            this.logger.info('管理端Token刷新成功', {
                clientIp: this.getClientIp(req),
                userAgent: req.get('User-Agent'),
                loginType: 'admin'
            });

            // 4. 返回响应
            res.success('Token刷新成功', {
                access_token: result.access_token,
                refresh_token: result.refresh_token,
                token_type: result.token_type,
                expires_in: result.expires_in
            });
        } catch (error) {
            this.logger.error('管理端Token刷新失败', {
                error: error.message,
                clientIp: this.getClientIp(req),
                loginType: 'admin',
                stack: error.stack
            });
            
            res.error(error.message, 401);
        }
    });

    /**
     * 验证身份
     * GET /admin/auth/verify
     */
    verify = this.asyncHandler(async (req, res) => {
        try {
            // 当前管理员信息已通过认证中间件注入
            const currentUser = req.user;

            // 记录验证请求
            this.logger.info('管理员身份验证', {
                userId: currentUser.id,
                username: currentUser.username,
                role: currentUser.role,
                clientIp: this.getClientIp(req)
            });

            // 返回响应
            res.success('身份验证成功', {
                user: currentUser,
                permissions: this.getUserPermissions(currentUser.role),
                server_time: new Date().toISOString()
            });
        } catch (error) {
            this.logger.error('管理员身份验证失败', {
                error: error.message,
                userId: req.user?.id,
                stack: error.stack
            });
            
            res.error(error.message, 400);
        }
    });

    /**
     * 获取管理员信息
     * GET /admin/auth/profile
     */
    getProfile = this.asyncHandler(async (req, res) => {
        try {
            // 当前管理员信息已通过认证中间件注入
            const currentUser = req.user;

            // 记录操作日志
            this.logger.info('获取管理员信息', {
                userId: currentUser.id,
                clientIp: this.getClientIp(req)
            });

            // 返回响应
            res.success('获取成功', {
                user: currentUser,
                permissions: this.getUserPermissions(currentUser.role),
                last_login: currentUser.last_login_at,
                login_count: currentUser.login_count
            });
        } catch (error) {
            this.logger.error('获取管理员信息失败', {
                error: error.message,
                userId: req.user?.id,
                stack: error.stack
            });
            
            res.error(error.message, 400);
        }
    });

    /**
     * 获取用户权限列表
     * @param {string} role - 用户角色
     * @returns {Array} 权限列表
     */
    getUserPermissions(role) {
        // 这里简化处理，实际应该从角色权限表中查询
        const permissions = {
            'super_admin': [
                'users.read', 'users.create', 'users.update', 'users.delete',
                'roles.read', 'roles.create', 'roles.update', 'roles.delete',
                'system.read', 'system.update', 'system.admin',
                'content.read', 'content.create', 'content.update', 'content.delete',
                'analytics.read', 'settings.read', 'settings.update'
            ],
            'admin': [
                'users.read', 'users.create', 'users.update',
                'content.read', 'content.create', 'content.update', 'content.delete',
                'analytics.read', 'settings.read'
            ],
            'operator': [
                'users.read', 'users.update',
                'content.read', 'content.create', 'content.update',
                'analytics.read'
            ],
            'customer_service': [
                'users.read', 'content.read', 'analytics.read'
            ],
            'moderator': [
                'content.read', 'content.update', 'content.delete'
            ]
        };

        return permissions[role] || [];
    }

    /**
     * 获取客户端信息
     * @param {Object} req - 请求对象
     * @returns {Object} 客户端信息
     */
    getClientInfo(req) {
        return {
            clientIp: this.getClientIp(req),
            userAgent: req.get('User-Agent') || 'Unknown',
            adminPanel: req.get('X-Admin-Panel') || 'web',
            sessionId: req.get('X-Session-ID') || null
        };
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

module.exports = AuthController; 