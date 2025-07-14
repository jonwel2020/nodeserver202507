/**
 * 小程序端认证路由配置
 * 路径前缀: /api/auth
 */

const express = require('express');
const router = express.Router();
const { apiAuth } = require('../../middleware/apiAuth');
const { validateAuth } = require('../../validators/auth');
const authController = require('../../controllers/api/AuthController');

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: 用户注册
 *     tags: [小程序端认证]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *                 description: 用户名
 *               email:
 *                 type: string
 *                 description: 邮箱地址
 *               password:
 *                 type: string
 *                 description: 密码
 *               phone:
 *                 type: string
 *                 description: 手机号码（可选）
 *               nickname:
 *                 type: string
 *                 description: 昵称（可选）
 *     responses:
 *       201:
 *         description: 注册成功
 *       400:
 *         description: 参数错误
 *       409:
 *         description: 用户已存在
 */
router.post('/register', validateAuth.register, authController.register);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: 用户登录
 *     tags: [小程序端认证]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               identifier:
 *                 type: string
 *                 description: 用户名/邮箱/手机号
 *               password:
 *                 type: string
 *                 description: 密码
 *               remember_me:
 *                 type: boolean
 *                 description: 是否记住登录状态
 *     responses:
 *       200:
 *         description: 登录成功
 *       401:
 *         description: 用户名或密码错误
 *       423:
 *         description: 账户被锁定
 */
router.post('/login', validateAuth.login, authController.login);

/**
 * @swagger
 * /api/auth/wechat-login:
 *   post:
 *     summary: 微信登录
 *     tags: [小程序端认证]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               code:
 *                 type: string
 *                 description: 微信授权code
 *               user_info:
 *                 type: object
 *                 description: 微信用户信息
 *     responses:
 *       200:
 *         description: 登录成功
 *       400:
 *         description: 微信授权失败
 */
router.post('/wechat-login', validateAuth.wechatLogin, authController.wechatLogin);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: 用户登出
 *     tags: [小程序端认证]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 登出成功
 *       401:
 *         description: 未登录
 */
router.post('/logout', apiAuth, authController.logout);

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: 刷新Token
 *     tags: [小程序端认证]
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
 *       401:
 *         description: 刷新令牌无效
 */
router.post('/refresh', validateAuth.refreshToken, authController.refreshToken);

/**
 * @swagger
 * /api/auth/profile:
 *   get:
 *     summary: 获取用户信息
 *     tags: [小程序端认证]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 获取成功
 *       401:
 *         description: 未登录
 */
router.get('/profile', apiAuth, authController.getProfile);

/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     summary: 忘记密码
 *     tags: [小程序端认证]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 description: 邮箱地址
 *     responses:
 *       200:
 *         description: 重置邮件已发送
 *       404:
 *         description: 邮箱不存在
 */
router.post('/forgot-password', validateAuth.forgotPassword, authController.forgotPassword);

/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     summary: 重置密码
 *     tags: [小程序端认证]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               token:
 *                 type: string
 *                 description: 重置令牌
 *               password:
 *                 type: string
 *                 description: 新密码
 *     responses:
 *       200:
 *         description: 密码重置成功
 *       400:
 *         description: 令牌无效或已过期
 */
router.post('/reset-password', validateAuth.resetPassword, authController.resetPassword);

/**
 * @swagger
 * /api/auth/verify-email:
 *   post:
 *     summary: 验证邮箱
 *     tags: [小程序端认证]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               token:
 *                 type: string
 *                 description: 验证令牌
 *     responses:
 *       200:
 *         description: 邮箱验证成功
 *       400:
 *         description: 验证令牌无效
 */
router.post('/verify-email', validateAuth.verifyEmail, authController.verifyEmail);

module.exports = router; 