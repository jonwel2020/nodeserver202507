/**
 * 小程序端用户管理路由配置
 * 路径前缀: /api/users
 */

const express = require('express');
const router = express.Router();
const { apiAuth } = require('../../middleware/apiAuth');
const { validateUser } = require('../../validators/user');
const userController = require('../../controllers/api/UserController');

/**
 * @swagger
 * /api/users/profile:
 *   get:
 *     summary: 获取个人信息
 *     tags: [小程序端用户管理]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 获取成功
 *       401:
 *         description: 未登录
 */
router.get('/profile', apiAuth, userController.getProfile);

/**
 * @swagger
 * /api/users/profile:
 *   put:
 *     summary: 更新个人信息
 *     tags: [小程序端用户管理]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nickname:
 *                 type: string
 *                 description: 昵称
 *               real_name:
 *                 type: string
 *                 description: 真实姓名
 *               gender:
 *                 type: string
 *                 enum: [male, female, other]
 *                 description: 性别
 *               birth_date:
 *                 type: string
 *                 format: date
 *                 description: 出生日期
 *               bio:
 *                 type: string
 *                 description: 个人简介
 *     responses:
 *       200:
 *         description: 更新成功
 *       400:
 *         description: 参数错误
 */
router.put('/profile', apiAuth, validateUser.updateProfile, userController.updateProfile);

/**
 * @swagger
 * /api/users/upload-avatar:
 *   post:
 *     summary: 上传头像
 *     tags: [小程序端用户管理]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               avatar:
 *                 type: string
 *                 format: binary
 *                 description: 头像文件
 *     responses:
 *       200:
 *         description: 上传成功
 *       400:
 *         description: 文件格式错误
 */
router.post('/upload-avatar', apiAuth, userController.uploadAvatar);

/**
 * @swagger
 * /api/users/avatar:
 *   delete:
 *     summary: 删除头像
 *     tags: [小程序端用户管理]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 删除成功
 *       404:
 *         description: 头像不存在
 */
router.delete('/avatar', apiAuth, userController.deleteAvatar);

/**
 * @swagger
 * /api/users/change-password:
 *   put:
 *     summary: 修改密码
 *     tags: [小程序端用户管理]
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
 *     responses:
 *       200:
 *         description: 密码修改成功
 *       400:
 *         description: 当前密码错误
 */
router.put('/change-password', apiAuth, validateUser.changePassword, userController.changePassword);

/**
 * @swagger
 * /api/users/bind-phone:
 *   post:
 *     summary: 绑定手机号
 *     tags: [小程序端用户管理]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               phone:
 *                 type: string
 *                 description: 手机号码
 *               verification_code:
 *                 type: string
 *                 description: 验证码
 *     responses:
 *       200:
 *         description: 绑定成功
 *       400:
 *         description: 验证码错误
 *       409:
 *         description: 手机号已被使用
 */
router.post('/bind-phone', apiAuth, validateUser.bindPhone, userController.bindPhone);

/**
 * @swagger
 * /api/users/verify-phone:
 *   post:
 *     summary: 验证手机号
 *     tags: [小程序端用户管理]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               phone:
 *                 type: string
 *                 description: 手机号码
 *     responses:
 *       200:
 *         description: 验证码已发送
 *       400:
 *         description: 手机号格式错误
 */
router.post('/verify-phone', apiAuth, validateUser.verifyPhone, userController.verifyPhone);

/**
 * @swagger
 * /api/users/update-phone:
 *   put:
 *     summary: 更新手机号
 *     tags: [小程序端用户管理]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               new_phone:
 *                 type: string
 *                 description: 新手机号码
 *               verification_code:
 *                 type: string
 *                 description: 验证码
 *     responses:
 *       200:
 *         description: 更新成功
 *       400:
 *         description: 验证码错误
 */
router.put('/update-phone', apiAuth, validateUser.updatePhone, userController.updatePhone);

/**
 * @swagger
 * /api/users/bind-wechat:
 *   post:
 *     summary: 绑定微信
 *     tags: [小程序端用户管理]
 *     security:
 *       - bearerAuth: []
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
 *     responses:
 *       200:
 *         description: 绑定成功
 *       400:
 *         description: 微信授权失败
 *       409:
 *         description: 微信已被其他账户绑定
 */
router.post('/bind-wechat', apiAuth, validateUser.bindWechat, userController.bindWechat);

/**
 * @swagger
 * /api/users/unbind-wechat:
 *   delete:
 *     summary: 解绑微信
 *     tags: [小程序端用户管理]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 解绑成功
 *       400:
 *         description: 未绑定微信
 */
router.delete('/unbind-wechat', apiAuth, userController.unbindWechat);

/**
 * @swagger
 * /api/users/settings:
 *   get:
 *     summary: 获取用户设置
 *     tags: [小程序端用户管理]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 获取成功
 */
router.get('/settings', apiAuth, userController.getSettings);

/**
 * @swagger
 * /api/users/settings:
 *   put:
 *     summary: 更新用户设置
 *     tags: [小程序端用户管理]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               language:
 *                 type: string
 *                 description: 语言设置
 *               theme:
 *                 type: string
 *                 description: 主题设置
 *               timezone:
 *                 type: string
 *                 description: 时区设置
 *     responses:
 *       200:
 *         description: 更新成功
 */
router.put('/settings', apiAuth, validateUser.updateSettings, userController.updateSettings);

/**
 * @swagger
 * /api/users/privacy-settings:
 *   put:
 *     summary: 隐私设置
 *     tags: [小程序端用户管理]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               profile_visibility:
 *                 type: string
 *                 enum: [public, friends, private]
 *                 description: 个人资料可见性
 *               allow_search:
 *                 type: boolean
 *                 description: 允许被搜索
 *               show_online_status:
 *                 type: boolean
 *                 description: 显示在线状态
 *     responses:
 *       200:
 *         description: 设置成功
 */
router.put('/privacy-settings', apiAuth, validateUser.updatePrivacySettings, userController.updatePrivacySettings);

/**
 * @swagger
 * /api/users/notification-settings:
 *   put:
 *     summary: 通知设置
 *     tags: [小程序端用户管理]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email_notifications:
 *                 type: boolean
 *                 description: 邮件通知
 *               push_notifications:
 *                 type: boolean
 *                 description: 推送通知
 *               sms_notifications:
 *                 type: boolean
 *                 description: 短信通知
 *     responses:
 *       200:
 *         description: 设置成功
 */
router.put('/notification-settings', apiAuth, validateUser.updateNotificationSettings, userController.updateNotificationSettings);

/**
 * @swagger
 * /api/users/deactivate:
 *   post:
 *     summary: 注销/停用账户
 *     tags: [小程序端用户管理]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               password:
 *                 type: string
 *                 description: 密码确认
 *               reason:
 *                 type: string
 *                 description: 注销原因
 *     responses:
 *       200:
 *         description: 账户已注销
 *       400:
 *         description: 密码错误
 */
router.post('/deactivate', apiAuth, validateUser.deactivateAccount, userController.deactivateAccount);

/**
 * @swagger
 * /api/users/login-history:
 *   get:
 *     summary: 登录历史记录
 *     tags: [小程序端用户管理]
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
router.get('/login-history', apiAuth, userController.getLoginHistory);

/**
 * @swagger
 * /api/users/feedback:
 *   post:
 *     summary: 用户反馈
 *     tags: [小程序端用户管理]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [bug, feature, complaint, suggestion]
 *                 description: 反馈类型
 *               title:
 *                 type: string
 *                 description: 反馈标题
 *               content:
 *                 type: string
 *                 description: 反馈内容
 *               contact_email:
 *                 type: string
 *                 description: 联系邮箱
 *     responses:
 *       201:
 *         description: 反馈提交成功
 */
router.post('/feedback', apiAuth, validateUser.feedback, userController.submitFeedback);

/**
 * @swagger
 * /api/users/delete-data:
 *   delete:
 *     summary: 删除个人数据（GDPR合规）
 *     tags: [小程序端用户管理]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               password:
 *                 type: string
 *                 description: 密码确认
 *               confirmation:
 *                 type: string
 *                 description: 确认删除（必须为"DELETE_MY_DATA"）
 *     responses:
 *       200:
 *         description: 数据删除请求已提交
 *       400:
 *         description: 确认信息错误
 */
router.delete('/delete-data', apiAuth, validateUser.deleteData, userController.deleteUserData);

module.exports = router; 