/**
 * 管理端用户管理路由配置
 * 路径前缀: /admin/users
 */

const express = require('express');
const router = express.Router();
const { adminAuth } = require('../../middleware/adminAuth');
const { validateUser } = require('../../validators/user');
const userController = require('../../controllers/admin/UserController');

/**
 * @swagger
 * /admin/users:
 *   get:
 *     summary: 获取用户列表（分页、搜索、排序）
 *     tags: [管理端用户管理]
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
 *       - in: query
 *         name: keyword
 *         schema:
 *           type: string
 *         description: 搜索关键词（用户名、邮箱、手机号）
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive, locked, deleted]
 *         description: 用户状态筛选
 *       - in: query
 *         name: role_id
 *         schema:
 *           type: integer
 *         description: 角色ID筛选
 *       - in: query
 *         name: sort_by
 *         schema:
 *           type: string
 *           enum: [created_at, updated_at, username, email]
 *           default: created_at
 *         description: 排序字段
 *       - in: query
 *         name: sort_order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: 排序方向
 *       - in: query
 *         name: start_date
 *         schema:
 *           type: string
 *           format: date
 *         description: 注册开始日期
 *       - in: query
 *         name: end_date
 *         schema:
 *           type: string
 *           format: date
 *         description: 注册结束日期
 *     responses:
 *       200:
 *         description: 获取成功
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
 *                   example: 获取用户列表成功
 *                 data:
 *                   type: object
 *                   properties:
 *                     items:
 *                       type: array
 *                       items:
 *                         type: object
 *                     pagination:
 *                       type: object
 *       403:
 *         description: 权限不足
 */
router.get('/', adminAuth, userController.getUsers);

/**
 * @swagger
 * /admin/users/{id}:
 *   get:
 *     summary: 获取单个用户详细信息
 *     tags: [管理端用户管理]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 用户ID
 *     responses:
 *       200:
 *         description: 获取成功
 *       404:
 *         description: 用户不存在
 *       403:
 *         description: 权限不足
 */
router.get('/:id', adminAuth, userController.getUserById);

/**
 * @swagger
 * /admin/users:
 *   post:
 *     summary: 创建新用户
 *     tags: [管理端用户管理]
 *     security:
 *       - bearerAuth: []
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
 *                 description: 手机号码
 *               nickname:
 *                 type: string
 *                 description: 昵称
 *               real_name:
 *                 type: string
 *                 description: 真实姓名
 *               role_id:
 *                 type: integer
 *                 description: 角色ID
 *               status:
 *                 type: string
 *                 enum: [active, inactive]
 *                 default: active
 *                 description: 用户状态
 *     responses:
 *       201:
 *         description: 创建成功
 *       400:
 *         description: 参数错误
 *       409:
 *         description: 用户名或邮箱已存在
 *       403:
 *         description: 权限不足
 */
router.post('/', adminAuth, validateUser.adminCreateUser, userController.createUser);

/**
 * @swagger
 * /admin/users/{id}:
 *   put:
 *     summary: 更新用户信息
 *     tags: [管理端用户管理]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 用户ID
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
 *               phone:
 *                 type: string
 *                 description: 手机号码
 *               nickname:
 *                 type: string
 *                 description: 昵称
 *               real_name:
 *                 type: string
 *                 description: 真实姓名
 *               role_id:
 *                 type: integer
 *                 description: 角色ID
 *               status:
 *                 type: string
 *                 enum: [active, inactive, locked]
 *                 description: 用户状态
 *     responses:
 *       200:
 *         description: 更新成功
 *       400:
 *         description: 参数错误
 *       404:
 *         description: 用户不存在
 *       409:
 *         description: 用户名或邮箱已存在
 *       403:
 *         description: 权限不足
 */
router.put('/:id', adminAuth, validateUser.adminUpdateUser, userController.updateUser);

/**
 * @swagger
 * /admin/users/{id}:
 *   delete:
 *     summary: 删除用户（软删除）
 *     tags: [管理端用户管理]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 用户ID
 *     responses:
 *       200:
 *         description: 删除成功
 *       404:
 *         description: 用户不存在
 *       403:
 *         description: 权限不足
 */
router.delete('/:id', adminAuth, userController.deleteUser);

/**
 * @swagger
 * /admin/users/batch:
 *   delete:
 *     summary: 批量删除用户
 *     tags: [管理端用户管理]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               user_ids:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 description: 用户ID数组
 *     responses:
 *       200:
 *         description: 批量删除成功
 *       400:
 *         description: 参数错误
 *       403:
 *         description: 权限不足
 */
router.delete('/batch', adminAuth, validateUser.batchDeleteUsers, userController.batchDeleteUsers);

/**
 * @swagger
 * /admin/users/stats:
 *   get:
 *     summary: 获取用户统计数据
 *     tags: [管理端用户管理]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [day, week, month, year]
 *           default: month
 *         description: 统计周期
 *       - in: query
 *         name: start_date
 *         schema:
 *           type: string
 *           format: date
 *         description: 开始日期
 *       - in: query
 *         name: end_date
 *         schema:
 *           type: string
 *           format: date
 *         description: 结束日期
 *     responses:
 *       200:
 *         description: 获取成功
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
 *                   example: 获取用户统计成功
 *                 data:
 *                   type: object
 *                   properties:
 *                     total_users:
 *                       type: integer
 *                       description: 总用户数
 *                     active_users:
 *                       type: integer
 *                       description: 活跃用户数
 *                     new_users_today:
 *                       type: integer
 *                       description: 今日新增用户
 *                     growth_trend:
 *                       type: array
 *                       description: 增长趋势数据
 *                     status_distribution:
 *                       type: object
 *                       description: 状态分布
 *       403:
 *         description: 权限不足
 */
router.get('/stats', adminAuth, userController.getUserStats);

/**
 * @swagger
 * /admin/users/{id}/reset-password:
 *   post:
 *     summary: 重置用户密码
 *     tags: [管理端用户管理]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 用户ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               new_password:
 *                 type: string
 *                 description: 新密码（可选，不提供则自动生成）
 *               send_email:
 *                 type: boolean
 *                 default: true
 *                 description: 是否发送邮件通知
 *     responses:
 *       200:
 *         description: 密码重置成功
 *       404:
 *         description: 用户不存在
 *       403:
 *         description: 权限不足
 */
router.post('/:id/reset-password', adminAuth, validateUser.resetUserPassword, userController.resetUserPassword);

/**
 * @swagger
 * /admin/users/{id}/lock:
 *   post:
 *     summary: 锁定用户账户
 *     tags: [管理端用户管理]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 用户ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 description: 锁定原因
 *               duration:
 *                 type: integer
 *                 description: 锁定时长（小时），0表示永久锁定
 *     responses:
 *       200:
 *         description: 账户已锁定
 *       404:
 *         description: 用户不存在
 *       403:
 *         description: 权限不足
 */
router.post('/:id/lock', adminAuth, validateUser.lockUser, userController.lockUser);

/**
 * @swagger
 * /admin/users/{id}/unlock:
 *   post:
 *     summary: 解锁用户账户
 *     tags: [管理端用户管理]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 用户ID
 *     responses:
 *       200:
 *         description: 账户已解锁
 *       404:
 *         description: 用户不存在
 *       403:
 *         description: 权限不足
 */
router.post('/:id/unlock', adminAuth, userController.unlockUser);

/**
 * @swagger
 * /admin/users/{id}/login-history:
 *   get:
 *     summary: 获取用户登录历史
 *     tags: [管理端用户管理]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 用户ID
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
 *       404:
 *         description: 用户不存在
 *       403:
 *         description: 权限不足
 */
router.get('/:id/login-history', adminAuth, userController.getUserLoginHistory);

/**
 * @swagger
 * /admin/users/export:
 *   get:
 *     summary: 导出用户数据
 *     tags: [管理端用户管理]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [csv, excel]
 *           default: excel
 *         description: 导出格式
 *       - in: query
 *         name: fields
 *         schema:
 *           type: string
 *         description: 导出字段（逗号分隔）
 *       - in: query
 *         name: filter
 *         schema:
 *           type: string
 *         description: 筛选条件（JSON格式）
 *     responses:
 *       200:
 *         description: 导出成功
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 *           text/csv:
 *             schema:
 *               type: string
 *       403:
 *         description: 权限不足
 */
router.get('/export', adminAuth, userController.exportUsers);

/**
 * @swagger
 * /admin/users/import:
 *   post:
 *     summary: 批量导入用户
 *     tags: [管理端用户管理]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: 用户数据文件（CSV或Excel）
 *               update_existing:
 *                 type: boolean
 *                 default: false
 *                 description: 是否更新已存在的用户
 *     responses:
 *       200:
 *         description: 导入成功
 *       400:
 *         description: 文件格式错误或数据有误
 *       403:
 *         description: 权限不足
 */
router.post('/import', adminAuth, userController.importUsers);

module.exports = router; 