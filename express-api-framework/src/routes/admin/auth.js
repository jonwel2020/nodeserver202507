/**
 * 管理端认证路由配置
 * 路径前缀: /admin/auth
 */

const express = require('express');
const router = express.Router();
const { adminAuth } = require('../../middleware/adminAuth');
const { validateAuth } = require('../../validators/auth');
const authController = require('../../controllers/admin/AuthController');

/**
 * @swagger
 * /admin/auth/login:
 *   post:
 *     summary: 管理员登录
 *     tags: [管理端认证]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *                 description: 管理员用户名
 *               password:
 *                 type: string
 *                 description: 密码
 *               captcha:
 *                 type: string
 *                 description: 验证码
 *               remember_me:
 *                 type: boolean
 *                 description: 记住登录状态
 *     responses:
 *       200:
 *         description: 登录成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: integer
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: 登录成功
 *                 data:
 *                   type: object
 *                   properties:
 *                     access_token:
 *                       type: string
 *                       description: 访问令牌
 *                     refresh_token:
 *                       type: string
 *                       description: 刷新令牌
 *                     expires_in:
 *                       type: integer
 *                       description: 过期时间（秒）
 *                     admin_info:
 *                       type: object
 *                       description: 管理员信息
 *       401:
 *         description: 用户名或密码错误
 *       403:
 *         description: IP地址不在白名单
 *       423:
 *         description: 账户被锁定
 */
router.post('/login', validateAuth.adminLogin, authController.login);

/**
 * @swagger
 * /admin/auth/logout:
 *   post:
 *     summary: 管理员登出
 *     tags: [管理端认证]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 登出成功
 *       401:
 *         description: 未登录
 */
router.post('/logout', adminAuth, authController.logout);

/**
 * @swagger
 * /admin/auth/refresh:
 *   post:
 *     summary: 刷新管理员Token
 *     tags: [管理端认证]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refresh_token:
 *                 type: string
 *                 description: 刷新令牌
 *     responses:
 *       200:
 *         description: 刷新成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: integer
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: Token刷新成功
 *                 data:
 *                   type: object
 *                   properties:
 *                     access_token:
 *                       type: string
 *                       description: 新的访问令牌
 *                     expires_in:
 *                       type: integer
 *                       description: 过期时间（秒）
 *       401:
 *         description: 刷新令牌无效或已过期
 */
router.post('/refresh', validateAuth.refreshToken, authController.refreshToken);

/**
 * @swagger
 * /admin/auth/verify:
 *   get:
 *     summary: 验证管理员身份
 *     tags: [管理端认证]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 验证成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: integer
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: 身份验证成功
 *                 data:
 *                   type: object
 *                   properties:
 *                     admin_info:
 *                       type: object
 *                       description: 管理员信息
 *                     permissions:
 *                       type: array
 *                       description: 权限列表
 *                       items:
 *                         type: string
 *                     login_time:
 *                       type: string
 *                       description: 登录时间
 *       401:
 *         description: 身份验证失败
 */
router.get('/verify', adminAuth, authController.verifyAuth);

/**
 * @swagger
 * /admin/auth/change-password:
 *   put:
 *     summary: 修改管理员密码
 *     tags: [管理端认证]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               current_password:
 *                 type: string
 *                 description: 当前密码
 *               new_password:
 *                 type: string
 *                 description: 新密码
 *               confirm_password:
 *                 type: string
 *                 description: 确认新密码
 *     responses:
 *       200:
 *         description: 密码修改成功
 *       400:
 *         description: 当前密码错误或新密码不匹配
 */
router.put('/change-password', adminAuth, validateAuth.adminChangePassword, authController.changePassword);

/**
 * @swagger
 * /admin/auth/sessions:
 *   get:
 *     summary: 获取管理员登录会话列表
 *     tags: [管理端认证]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: 页码
 *       - in: query
 *         name: page_size
 *         schema:
 *           type: integer
 *           default: 20
 *         description: 每页条数
 *     responses:
 *       200:
 *         description: 获取成功
 */
router.get('/sessions', adminAuth, authController.getSessions);

/**
 * @swagger
 * /admin/auth/sessions/{sessionId}:
 *   delete:
 *     summary: 踢出指定会话
 *     tags: [管理端认证]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *         description: 会话ID
 *     responses:
 *       200:
 *         description: 会话已踢出
 *       404:
 *         description: 会话不存在
 */
router.delete('/sessions/:sessionId', adminAuth, authController.revokeSession);

/**
 * @swagger
 * /admin/auth/profile:
 *   get:
 *     summary: 获取管理员个人信息
 *     tags: [管理端认证]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 获取成功
 */
router.get('/profile', adminAuth, authController.getProfile);

/**
 * @swagger
 * /admin/auth/profile:
 *   put:
 *     summary: 更新管理员个人信息
 *     tags: [管理端认证]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               real_name:
 *                 type: string
 *                 description: 真实姓名
 *               email:
 *                 type: string
 *                 description: 邮箱地址
 *               phone:
 *                 type: string
 *                 description: 手机号码
 *               department:
 *                 type: string
 *                 description: 部门
 *     responses:
 *       200:
 *         description: 更新成功
 *       400:
 *         description: 参数错误
 */
router.put('/profile', adminAuth, validateAuth.updateAdminProfile, authController.updateProfile);

module.exports = router; 