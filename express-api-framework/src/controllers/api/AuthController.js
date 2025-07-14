const BaseController = require('../base/BaseController');
const AuthService = require('../../services/auth/AuthService');
const { validateRegister, validateLogin, validateRefreshToken, validateForgotPassword, validateResetPassword, validateVerifyEmail, validateWechatLogin } = require('../../validators/auth');

/**
 * 小程序端认证控制器
 * 处理用户认证相关的HTTP请求
 */
class AuthController extends BaseController {
    constructor() {
        super();
        this.authService = new AuthService();
    }

    /**
     * 用户注册
     * POST /api/auth/register
     */
    register = this.asyncHandler(async (req, res) => {
        try {
            // 1. 验证请求数据
            const validatedData = await this.validateRequest(req, validateRegister);

            // 2. 获取客户端信息
            const clientInfo = this.getClientInfo(req);

            // 3. 调用注册服务
            const result = await this.authService.register({
                ...validatedData,
                ...clientInfo
            });

            // 4. 记录操作日志
            this.logger.info('用户注册请求', {
                username: validatedData.username,
                email: validatedData.email,
                clientIp: clientInfo.clientIp,
                userAgent: clientInfo.userAgent
            });

            // 5. 返回响应
            res.created('注册成功', {
                user: result.user,
                message: result.message,
                verification_required: true
            });
        } catch (error) {
            this.logger.error('用户注册失败', {
                error: error.message,
                body: req.body,
                stack: error.stack
            });
            
            res.error(error.message, 400);
        }
    });

    /**
     * 用户登录
     * POST /api/auth/login
     */
    login = this.asyncHandler(async (req, res) => {
        try {
            // 1. 验证请求数据
            const validatedData = await this.validateRequest(req, validateLogin);

            // 2. 获取客户端信息
            const clientInfo = this.getClientInfo(req);

            // 3. 调用登录服务
            const result = await this.authService.login({
                identifier: validatedData.identifier,
                password: validatedData.password,
                loginIp: clientInfo.clientIp,
                userAgent: clientInfo.userAgent,
                loginType: 'api' // 小程序端登录
            });

            // 4. 记录操作日志
            this.logger.info('用户登录成功', {
                userId: result.user.id,
                username: result.user.username,
                clientIp: clientInfo.clientIp,
                userAgent: clientInfo.userAgent
            });

            // 5. 返回响应
            res.success('登录成功', {
                user: result.user,
                access_token: result.access_token,
                refresh_token: result.refresh_token,
                token_type: result.token_type,
                expires_in: result.expires_in
            });
        } catch (error) {
            this.logger.error('用户登录失败', {
                error: error.message,
                identifier: req.body.identifier,
                clientIp: this.getClientIp(req),
                stack: error.stack
            });
            
            res.error(error.message, 401);
        }
    });

    /**
     * 微信登录
     * POST /api/auth/wechat-login
     */
    wechatLogin = this.asyncHandler(async (req, res) => {
        try {
            // 1. 验证请求数据
            const validatedData = await this.validateRequest(req, validateWechatLogin);

            // 2. 获取客户端信息
            const clientInfo = this.getClientInfo(req);

            // 3. 调用微信登录服务
            const result = await this.authService.wechatLogin(
                validatedData,
                clientInfo.clientIp,
                clientInfo.userAgent
            );

            // 4. 记录操作日志
            this.logger.info('微信登录成功', {
                userId: result.user.id,
                username: result.user.username,
                clientIp: clientInfo.clientIp,
                userAgent: clientInfo.userAgent
            });

            // 5. 返回响应
            res.success('微信登录成功', {
                user: result.user,
                access_token: result.access_token,
                refresh_token: result.refresh_token,
                token_type: result.token_type,
                expires_in: result.expires_in
            });
        } catch (error) {
            this.logger.error('微信登录失败', {
                error: error.message,
                code: req.body.code,
                clientIp: this.getClientIp(req),
                stack: error.stack
            });
            
            res.error(error.message, 400);
        }
    });

    /**
     * 刷新Token
     * POST /api/auth/refresh
     */
    refreshToken = this.asyncHandler(async (req, res) => {
        try {
            // 1. 验证请求数据
            const validatedData = await this.validateRequest(req, validateRefreshToken);

            // 2. 调用刷新Token服务
            const result = await this.authService.refreshToken(
                validatedData.refresh_token,
                'api' // 小程序端
            );

            // 3. 记录操作日志
            this.logger.info('Token刷新成功', {
                clientIp: this.getClientIp(req),
                userAgent: req.get('User-Agent')
            });

            // 4. 返回响应
            res.success('Token刷新成功', {
                access_token: result.access_token,
                refresh_token: result.refresh_token,
                token_type: result.token_type,
                expires_in: result.expires_in
            });
        } catch (error) {
            this.logger.error('Token刷新失败', {
                error: error.message,
                clientIp: this.getClientIp(req),
                stack: error.stack
            });
            
            res.error(error.message, 401);
        }
    });

    /**
     * 用户登出
     * POST /api/auth/logout
     */
    logout = this.asyncHandler(async (req, res) => {
        try {
            // 1. 获取当前用户信息
            const currentUser = req.user;

            // 2. 调用登出服务
            await this.authService.logout(currentUser.id, 'api');

            // 3. 记录操作日志
            this.logger.info('用户登出成功', {
                userId: currentUser.id,
                username: currentUser.username,
                clientIp: this.getClientIp(req)
            });

            // 4. 返回响应
            res.success('登出成功');
        } catch (error) {
            this.logger.error('用户登出失败', {
                error: error.message,
                userId: req.user?.id,
                stack: error.stack
            });
            
            res.error(error.message, 400);
        }
    });

    /**
     * 获取当前用户信息
     * GET /api/auth/profile
     */
    getProfile = this.asyncHandler(async (req, res) => {
        try {
            // 当前用户信息已通过认证中间件注入到req.user
            const currentUser = req.user;

            // 记录操作日志
            this.logger.info('获取用户信息', {
                userId: currentUser.id,
                clientIp: this.getClientIp(req)
            });

            // 返回响应（敏感信息已在中间件中过滤）
            res.success('获取成功', {
                user: currentUser
            });
        } catch (error) {
            this.logger.error('获取用户信息失败', {
                error: error.message,
                userId: req.user?.id,
                stack: error.stack
            });
            
            res.error(error.message, 400);
        }
    });

    /**
     * 忘记密码
     * POST /api/auth/forgot-password
     */
    forgotPassword = this.asyncHandler(async (req, res) => {
        try {
            // 1. 验证请求数据
            const validatedData = await this.validateRequest(req, validateForgotPassword);

            // 2. 调用忘记密码服务
            const result = await this.authService.forgotPassword(validatedData.email);

            // 3. 记录操作日志
            this.logger.info('忘记密码请求', {
                email: validatedData.email,
                clientIp: this.getClientIp(req)
            });

            // 4. 返回响应
            res.success(result.message);
        } catch (error) {
            this.logger.error('忘记密码失败', {
                error: error.message,
                email: req.body.email,
                stack: error.stack
            });
            
            res.error(error.message, 400);
        }
    });

    /**
     * 重置密码
     * POST /api/auth/reset-password
     */
    resetPassword = this.asyncHandler(async (req, res) => {
        try {
            // 1. 验证请求数据
            const validatedData = await this.validateRequest(req, validateResetPassword);

            // 2. 调用重置密码服务
            const result = await this.authService.resetPassword(
                validatedData.email,
                validatedData.token,
                validatedData.password
            );

            // 3. 记录操作日志
            this.logger.info('密码重置成功', {
                email: validatedData.email,
                clientIp: this.getClientIp(req)
            });

            // 4. 返回响应
            res.success(result.message);
        } catch (error) {
            this.logger.error('密码重置失败', {
                error: error.message,
                email: req.body.email,
                stack: error.stack
            });
            
            res.error(error.message, 400);
        }
    });

    /**
     * 验证邮箱
     * POST /api/auth/verify-email
     */
    verifyEmail = this.asyncHandler(async (req, res) => {
        try {
            // 1. 验证请求数据
            const validatedData = await this.validateRequest(req, validateVerifyEmail);

            // 2. 调用邮箱验证服务
            const result = await this.authService.verifyEmail(
                validatedData.email,
                validatedData.code
            );

            // 3. 记录操作日志
            this.logger.info('邮箱验证成功', {
                email: validatedData.email,
                clientIp: this.getClientIp(req)
            });

            // 4. 返回响应
            res.success(result.message);
        } catch (error) {
            this.logger.error('邮箱验证失败', {
                error: error.message,
                email: req.body.email,
                stack: error.stack
            });
            
            res.error(error.message, 400);
        }
    });

    /**
     * 获取客户端信息
     * @param {Object} req - 请求对象
     * @returns {Object} 客户端信息
     */
    getClientInfo(req) {
        return {
            clientIp: this.getClientIp(req),
            userAgent: req.get('User-Agent') || 'Unknown',
            deviceId: req.get('X-Device-ID') || null,
            appVersion: req.get('X-App-Version') || null,
            platform: req.get('X-Platform') || 'unknown'
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