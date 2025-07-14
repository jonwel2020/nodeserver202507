/**
 * 状态码常量定义
 * 包含用户状态、系统状态、业务状态等各种状态定义
 */

/**
 * 用户状态枚举
 */
const USER_STATUS = {
  ACTIVE: 'active',           // 正常激活状态
  INACTIVE: 'inactive',       // 未激活状态
  SUSPENDED: 'suspended',     // 暂停状态
  BANNED: 'banned',          // 封禁状态
  DELETED: 'deleted',        // 已删除状态
  PENDING: 'pending'         // 待审核状态
};

/**
 * 用户状态描述
 */
const USER_STATUS_NAMES = {
  [USER_STATUS.ACTIVE]: '正常',
  [USER_STATUS.INACTIVE]: '未激活',
  [USER_STATUS.SUSPENDED]: '暂停',
  [USER_STATUS.BANNED]: '封禁',
  [USER_STATUS.DELETED]: '已删除',
  [USER_STATUS.PENDING]: '待审核'
};

/**
 * 角色状态枚举
 */
const ROLE_STATUS = {
  ACTIVE: 'active',          // 激活状态
  INACTIVE: 'inactive'       // 停用状态
};

/**
 * 角色状态描述
 */
const ROLE_STATUS_NAMES = {
  [ROLE_STATUS.ACTIVE]: '激活',
  [ROLE_STATUS.INACTIVE]: '停用'
};

/**
 * 性别枚举
 */
const GENDER = {
  UNKNOWN: 0,                // 未知
  MALE: 1,                   // 男性
  FEMALE: 2                  // 女性
};

/**
 * 性别描述
 */
const GENDER_NAMES = {
  [GENDER.UNKNOWN]: '未知',
  [GENDER.MALE]: '男',
  [GENDER.FEMALE]: '女'
};

/**
 * 验证状态枚举
 */
const VERIFICATION_STATUS = {
  UNVERIFIED: 'unverified',  // 未验证
  PENDING: 'pending',        // 验证中
  VERIFIED: 'verified',      // 已验证
  FAILED: 'failed'           // 验证失败
};

/**
 * 验证状态描述
 */
const VERIFICATION_STATUS_NAMES = {
  [VERIFICATION_STATUS.UNVERIFIED]: '未验证',
  [VERIFICATION_STATUS.PENDING]: '验证中',
  [VERIFICATION_STATUS.VERIFIED]: '已验证',
  [VERIFICATION_STATUS.FAILED]: '验证失败'
};

/**
 * 登录状态枚举
 */
const LOGIN_STATUS = {
  SUCCESS: 'success',        // 登录成功
  FAILED: 'failed',          // 登录失败
  LOCKED: 'locked',          // 账户锁定
  EXPIRED: 'expired'         // 会话过期
};

/**
 * 登录状态描述
 */
const LOGIN_STATUS_NAMES = {
  [LOGIN_STATUS.SUCCESS]: '成功',
  [LOGIN_STATUS.FAILED]: '失败',
  [LOGIN_STATUS.LOCKED]: '锁定',
  [LOGIN_STATUS.EXPIRED]: '过期'
};

/**
 * 操作状态枚举
 */
const OPERATION_STATUS = {
  PENDING: 'pending',        // 待处理
  PROCESSING: 'processing',  // 处理中
  SUCCESS: 'success',        // 成功
  FAILED: 'failed',          // 失败
  CANCELLED: 'cancelled'     // 已取消
};

/**
 * 操作状态描述
 */
const OPERATION_STATUS_NAMES = {
  [OPERATION_STATUS.PENDING]: '待处理',
  [OPERATION_STATUS.PROCESSING]: '处理中',
  [OPERATION_STATUS.SUCCESS]: '成功',
  [OPERATION_STATUS.FAILED]: '失败',
  [OPERATION_STATUS.CANCELLED]: '已取消'
};

/**
 * 文件上传状态枚举
 */
const UPLOAD_STATUS = {
  UPLOADING: 'uploading',    // 上传中
  SUCCESS: 'success',        // 上传成功
  FAILED: 'failed',          // 上传失败
  CANCELLED: 'cancelled'     // 已取消
};

/**
 * 文件上传状态描述
 */
const UPLOAD_STATUS_NAMES = {
  [UPLOAD_STATUS.UPLOADING]: '上传中',
  [UPLOAD_STATUS.SUCCESS]: '上传成功',
  [UPLOAD_STATUS.FAILED]: '上传失败',
  [UPLOAD_STATUS.CANCELLED]: '已取消'
};

/**
 * 审核状态枚举
 */
const AUDIT_STATUS = {
  PENDING: 'pending',        // 待审核
  APPROVED: 'approved',      // 已通过
  REJECTED: 'rejected'       // 已拒绝
};

/**
 * 审核状态描述
 */
const AUDIT_STATUS_NAMES = {
  [AUDIT_STATUS.PENDING]: '待审核',
  [AUDIT_STATUS.APPROVED]: '已通过',
  [AUDIT_STATUS.REJECTED]: '已拒绝'
};

/**
 * 通知状态枚举
 */
const NOTIFICATION_STATUS = {
  UNREAD: 'unread',          // 未读
  READ: 'read',              // 已读
  ARCHIVED: 'archived'       // 已归档
};

/**
 * 通知状态描述
 */
const NOTIFICATION_STATUS_NAMES = {
  [NOTIFICATION_STATUS.UNREAD]: '未读',
  [NOTIFICATION_STATUS.READ]: '已读',
  [NOTIFICATION_STATUS.ARCHIVED]: '已归档'
};

/**
 * 支付状态枚举
 */
const PAYMENT_STATUS = {
  PENDING: 'pending',        // 待支付
  PROCESSING: 'processing',  // 支付中
  SUCCESS: 'success',        // 支付成功
  FAILED: 'failed',          // 支付失败
  CANCELLED: 'cancelled',    // 已取消
  REFUNDED: 'refunded'       // 已退款
};

/**
 * 支付状态描述
 */
const PAYMENT_STATUS_NAMES = {
  [PAYMENT_STATUS.PENDING]: '待支付',
  [PAYMENT_STATUS.PROCESSING]: '支付中',
  [PAYMENT_STATUS.SUCCESS]: '支付成功',
  [PAYMENT_STATUS.FAILED]: '支付失败',
  [PAYMENT_STATUS.CANCELLED]: '已取消',
  [PAYMENT_STATUS.REFUNDED]: '已退款'
};

/**
 * 订单状态枚举
 */
const ORDER_STATUS = {
  CREATED: 'created',        // 已创建
  PAID: 'paid',              // 已支付
  CONFIRMED: 'confirmed',    // 已确认
  SHIPPED: 'shipped',        // 已发货
  DELIVERED: 'delivered',    // 已送达
  COMPLETED: 'completed',    // 已完成
  CANCELLED: 'cancelled',    // 已取消
  REFUNDED: 'refunded'       // 已退款
};

/**
 * 订单状态描述
 */
const ORDER_STATUS_NAMES = {
  [ORDER_STATUS.CREATED]: '已创建',
  [ORDER_STATUS.PAID]: '已支付',
  [ORDER_STATUS.CONFIRMED]: '已确认',
  [ORDER_STATUS.SHIPPED]: '已发货',
  [ORDER_STATUS.DELIVERED]: '已送达',
  [ORDER_STATUS.COMPLETED]: '已完成',
  [ORDER_STATUS.CANCELLED]: '已取消',
  [ORDER_STATUS.REFUNDED]: '已退款'
};

/**
 * 系统健康状态枚举
 */
const HEALTH_STATUS = {
  HEALTHY: 'healthy',        // 健康
  WARNING: 'warning',        // 警告
  CRITICAL: 'critical',      // 严重
  DOWN: 'down'               // 宕机
};

/**
 * 系统健康状态描述
 */
const HEALTH_STATUS_NAMES = {
  [HEALTH_STATUS.HEALTHY]: '健康',
  [HEALTH_STATUS.WARNING]: '警告',
  [HEALTH_STATUS.CRITICAL]: '严重',
  [HEALTH_STATUS.DOWN]: '宕机'
};

/**
 * 日志级别枚举
 */
const LOG_LEVEL = {
  ERROR: 'error',            // 错误
  WARN: 'warn',              // 警告
  INFO: 'info',              // 信息
  DEBUG: 'debug'             // 调试
};

/**
 * 日志级别描述
 */
const LOG_LEVEL_NAMES = {
  [LOG_LEVEL.ERROR]: '错误',
  [LOG_LEVEL.WARN]: '警告',
  [LOG_LEVEL.INFO]: '信息',
  [LOG_LEVEL.DEBUG]: '调试'
};

/**
 * 获取状态名称的工具函数
 * @param {string} status - 状态值
 * @param {Object} statusNames - 状态名称映射
 * @returns {string} 状态名称
 */
function getStatusName(status, statusNames) {
  return statusNames[status] || status;
}

/**
 * 检查状态是否有效的工具函数
 * @param {string} status - 状态值
 * @param {Object} statusEnum - 状态枚举
 * @returns {boolean} 是否有效
 */
function isValidStatus(status, statusEnum) {
  return Object.values(statusEnum).includes(status);
}

/**
 * 获取所有状态选项的工具函数
 * @param {Object} statusEnum - 状态枚举
 * @param {Object} statusNames - 状态名称映射
 * @returns {Array} 状态选项数组
 */
function getStatusOptions(statusEnum, statusNames) {
  return Object.values(statusEnum).map(status => ({
    value: status,
    label: getStatusName(status, statusNames)
  }));
}

/**
 * 状态转换规则（可扩展）
 */
const STATUS_TRANSITIONS = {
  // 用户状态转换规则
  USER: {
    [USER_STATUS.PENDING]: [USER_STATUS.ACTIVE, USER_STATUS.BANNED],
    [USER_STATUS.ACTIVE]: [USER_STATUS.SUSPENDED, USER_STATUS.BANNED, USER_STATUS.DELETED],
    [USER_STATUS.INACTIVE]: [USER_STATUS.ACTIVE, USER_STATUS.DELETED],
    [USER_STATUS.SUSPENDED]: [USER_STATUS.ACTIVE, USER_STATUS.BANNED],
    [USER_STATUS.BANNED]: [USER_STATUS.ACTIVE],
    [USER_STATUS.DELETED]: [] // 删除后不能转换到其他状态
  },
  
  // 订单状态转换规则
  ORDER: {
    [ORDER_STATUS.CREATED]: [ORDER_STATUS.PAID, ORDER_STATUS.CANCELLED],
    [ORDER_STATUS.PAID]: [ORDER_STATUS.CONFIRMED, ORDER_STATUS.REFUNDED],
    [ORDER_STATUS.CONFIRMED]: [ORDER_STATUS.SHIPPED, ORDER_STATUS.CANCELLED],
    [ORDER_STATUS.SHIPPED]: [ORDER_STATUS.DELIVERED],
    [ORDER_STATUS.DELIVERED]: [ORDER_STATUS.COMPLETED],
    [ORDER_STATUS.COMPLETED]: [],
    [ORDER_STATUS.CANCELLED]: [],
    [ORDER_STATUS.REFUNDED]: []
  }
};

/**
 * 检查状态转换是否允许
 * @param {string} fromStatus - 源状态
 * @param {string} toStatus - 目标状态
 * @param {string} type - 状态类型 (USER, ORDER等)
 * @returns {boolean} 是否允许转换
 */
function canTransitionStatus(fromStatus, toStatus, type) {
  const transitions = STATUS_TRANSITIONS[type];
  if (!transitions || !transitions[fromStatus]) {
    return false;
  }
  return transitions[fromStatus].includes(toStatus);
}

module.exports = {
  // 用户相关状态
  USER_STATUS,
  USER_STATUS_NAMES,
  
  // 角色相关状态
  ROLE_STATUS,
  ROLE_STATUS_NAMES,
  
  // 基础状态
  GENDER,
  GENDER_NAMES,
  VERIFICATION_STATUS,
  VERIFICATION_STATUS_NAMES,
  LOGIN_STATUS,
  LOGIN_STATUS_NAMES,
  OPERATION_STATUS,
  OPERATION_STATUS_NAMES,
  
  // 文件相关状态
  UPLOAD_STATUS,
  UPLOAD_STATUS_NAMES,
  
  // 审核相关状态
  AUDIT_STATUS,
  AUDIT_STATUS_NAMES,
  
  // 通知相关状态
  NOTIFICATION_STATUS,
  NOTIFICATION_STATUS_NAMES,
  
  // 支付相关状态
  PAYMENT_STATUS,
  PAYMENT_STATUS_NAMES,
  
  // 订单相关状态
  ORDER_STATUS,
  ORDER_STATUS_NAMES,
  
  // 系统相关状态
  HEALTH_STATUS,
  HEALTH_STATUS_NAMES,
  LOG_LEVEL,
  LOG_LEVEL_NAMES,
  
  // 状态转换规则
  STATUS_TRANSITIONS,
  
  // 工具函数
  getStatusName,
  isValidStatus,
  getStatusOptions,
  canTransitionStatus
}; 