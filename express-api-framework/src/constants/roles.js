/**
 * 角色权限定义
 * 定义系统中的角色类型和权限常量
 */

// 用户角色定义
const USER_ROLES = {
  // 小程序端角色
  USER: {
    id: 1,
    name: 'user',
    display_name: '普通用户',
    description: '小程序端普通用户',
    level: 1
  },
  VIP_USER: {
    id: 2,
    name: 'vip_user',
    display_name: 'VIP用户',
    description: '小程序端VIP用户',
    level: 2
  },
  PREMIUM_USER: {
    id: 3,
    name: 'premium_user',
    display_name: '高级用户',
    description: '小程序端高级用户',
    level: 3
  },

  // 管理端角色
  ADMIN: {
    id: 10,
    name: 'admin',
    display_name: '管理员',
    description: '系统管理员',
    level: 10
  },
  SUPER_ADMIN: {
    id: 11,
    name: 'super_admin',
    display_name: '超级管理员',
    description: '系统超级管理员',
    level: 11
  },
  OPERATOR: {
    id: 12,
    name: 'operator',
    display_name: '运营人员',
    description: '运营管理人员',
    level: 8
  },
  CUSTOMER_SERVICE: {
    id: 13,
    name: 'customer_service',
    display_name: '客服人员',
    description: '客户服务人员',
    level: 5
  },
  AUDITOR: {
    id: 14,
    name: 'auditor',
    display_name: '审核员',
    description: '内容审核人员',
    level: 6
  }
};

// 权限定义
const PERMISSIONS = {
  // 用户管理权限
  USER_MANAGEMENT: {
    VIEW_USER: 'user:view',
    CREATE_USER: 'user:create',
    UPDATE_USER: 'user:update',
    DELETE_USER: 'user:delete',
    BATCH_DELETE_USER: 'user:batch_delete',
    EXPORT_USER: 'user:export',
    IMPORT_USER: 'user:import',
    RESET_PASSWORD: 'user:reset_password',
    DISABLE_USER: 'user:disable',
    ENABLE_USER: 'user:enable'
  },

  // 角色管理权限
  ROLE_MANAGEMENT: {
    VIEW_ROLE: 'role:view',
    CREATE_ROLE: 'role:create',
    UPDATE_ROLE: 'role:update',
    DELETE_ROLE: 'role:delete',
    ASSIGN_PERMISSION: 'role:assign_permission'
  },

  // 系统管理权限
  SYSTEM_MANAGEMENT: {
    VIEW_SYSTEM_INFO: 'system:view_info',
    VIEW_LOGS: 'system:view_logs',
    CLEAR_CACHE: 'system:clear_cache',
    BACKUP_DATABASE: 'system:backup_db',
    RESTORE_DATABASE: 'system:restore_db',
    SYSTEM_CONFIG: 'system:config',
    MAINTENANCE_MODE: 'system:maintenance'
  },

  // 内容管理权限
  CONTENT_MANAGEMENT: {
    VIEW_CONTENT: 'content:view',
    CREATE_CONTENT: 'content:create',
    UPDATE_CONTENT: 'content:update',
    DELETE_CONTENT: 'content:delete',
    PUBLISH_CONTENT: 'content:publish',
    AUDIT_CONTENT: 'content:audit'
  },

  // 订单管理权限
  ORDER_MANAGEMENT: {
    VIEW_ORDER: 'order:view',
    UPDATE_ORDER: 'order:update',
    CANCEL_ORDER: 'order:cancel',
    REFUND_ORDER: 'order:refund',
    EXPORT_ORDER: 'order:export'
  },

  // 财务管理权限
  FINANCE_MANAGEMENT: {
    VIEW_FINANCE: 'finance:view',
    VIEW_REVENUE: 'finance:view_revenue',
    EXPORT_FINANCE: 'finance:export',
    SETTLEMENT: 'finance:settlement'
  },

  // 统计分析权限
  ANALYTICS: {
    VIEW_USER_STATS: 'analytics:user_stats',
    VIEW_ORDER_STATS: 'analytics:order_stats',
    VIEW_REVENUE_STATS: 'analytics:revenue_stats',
    VIEW_SYSTEM_STATS: 'analytics:system_stats',
    EXPORT_REPORTS: 'analytics:export_reports'
  },

  // 通知管理权限
  NOTIFICATION_MANAGEMENT: {
    SEND_NOTIFICATION: 'notification:send',
    VIEW_NOTIFICATION: 'notification:view',
    DELETE_NOTIFICATION: 'notification:delete',
    BROADCAST_MESSAGE: 'notification:broadcast'
  }
};

// 角色权限映射
const ROLE_PERMISSIONS = {
  [USER_ROLES.USER.name]: [
    // 普通用户只有基本的查看权限
  ],

  [USER_ROLES.VIP_USER.name]: [
    // VIP用户权限（继承普通用户）
  ],

  [USER_ROLES.PREMIUM_USER.name]: [
    // 高级用户权限（继承VIP用户）
  ],

  [USER_ROLES.CUSTOMER_SERVICE.name]: [
    // 客服人员权限
    PERMISSIONS.USER_MANAGEMENT.VIEW_USER,
    PERMISSIONS.USER_MANAGEMENT.UPDATE_USER,
    PERMISSIONS.ORDER_MANAGEMENT.VIEW_ORDER,
    PERMISSIONS.ORDER_MANAGEMENT.UPDATE_ORDER,
    PERMISSIONS.NOTIFICATION_MANAGEMENT.SEND_NOTIFICATION,
    PERMISSIONS.NOTIFICATION_MANAGEMENT.VIEW_NOTIFICATION
  ],

  [USER_ROLES.AUDITOR.name]: [
    // 审核员权限
    PERMISSIONS.CONTENT_MANAGEMENT.VIEW_CONTENT,
    PERMISSIONS.CONTENT_MANAGEMENT.AUDIT_CONTENT,
    PERMISSIONS.USER_MANAGEMENT.VIEW_USER,
    PERMISSIONS.ORDER_MANAGEMENT.VIEW_ORDER
  ],

  [USER_ROLES.OPERATOR.name]: [
    // 运营人员权限
    ...ROLE_PERMISSIONS[USER_ROLES.CUSTOMER_SERVICE.name],
    ...ROLE_PERMISSIONS[USER_ROLES.AUDITOR.name],
    PERMISSIONS.CONTENT_MANAGEMENT.CREATE_CONTENT,
    PERMISSIONS.CONTENT_MANAGEMENT.UPDATE_CONTENT,
    PERMISSIONS.CONTENT_MANAGEMENT.PUBLISH_CONTENT,
    PERMISSIONS.ANALYTICS.VIEW_USER_STATS,
    PERMISSIONS.ANALYTICS.VIEW_ORDER_STATS,
    PERMISSIONS.NOTIFICATION_MANAGEMENT.BROADCAST_MESSAGE
  ],

  [USER_ROLES.ADMIN.name]: [
    // 管理员权限（大部分权限）
    ...Object.values(PERMISSIONS.USER_MANAGEMENT),
    ...Object.values(PERMISSIONS.ROLE_MANAGEMENT),
    ...Object.values(PERMISSIONS.CONTENT_MANAGEMENT),
    ...Object.values(PERMISSIONS.ORDER_MANAGEMENT),
    ...Object.values(PERMISSIONS.ANALYTICS),
    ...Object.values(PERMISSIONS.NOTIFICATION_MANAGEMENT),
    PERMISSIONS.SYSTEM_MANAGEMENT.VIEW_SYSTEM_INFO,
    PERMISSIONS.SYSTEM_MANAGEMENT.VIEW_LOGS,
    PERMISSIONS.SYSTEM_MANAGEMENT.CLEAR_CACHE,
    PERMISSIONS.FINANCE_MANAGEMENT.VIEW_FINANCE,
    PERMISSIONS.FINANCE_MANAGEMENT.VIEW_REVENUE
  ],

  [USER_ROLES.SUPER_ADMIN.name]: [
    // 超级管理员权限（所有权限）
    ...Object.values(PERMISSIONS.USER_MANAGEMENT),
    ...Object.values(PERMISSIONS.ROLE_MANAGEMENT),
    ...Object.values(PERMISSIONS.SYSTEM_MANAGEMENT),
    ...Object.values(PERMISSIONS.CONTENT_MANAGEMENT),
    ...Object.values(PERMISSIONS.ORDER_MANAGEMENT),
    ...Object.values(PERMISSIONS.FINANCE_MANAGEMENT),
    ...Object.values(PERMISSIONS.ANALYTICS),
    ...Object.values(PERMISSIONS.NOTIFICATION_MANAGEMENT)
  ]
};

// 角色层级关系（高级别角色自动拥有低级别角色的权限）
const ROLE_HIERARCHY = {
  [USER_ROLES.SUPER_ADMIN.name]: [
    USER_ROLES.ADMIN.name,
    USER_ROLES.OPERATOR.name,
    USER_ROLES.AUDITOR.name,
    USER_ROLES.CUSTOMER_SERVICE.name
  ],
  [USER_ROLES.ADMIN.name]: [
    USER_ROLES.OPERATOR.name,
    USER_ROLES.AUDITOR.name,
    USER_ROLES.CUSTOMER_SERVICE.name
  ],
  [USER_ROLES.OPERATOR.name]: [
    USER_ROLES.AUDITOR.name,
    USER_ROLES.CUSTOMER_SERVICE.name
  ],
  [USER_ROLES.PREMIUM_USER.name]: [
    USER_ROLES.VIP_USER.name,
    USER_ROLES.USER.name
  ],
  [USER_ROLES.VIP_USER.name]: [
    USER_ROLES.USER.name
  ]
};

// 默认角色
const DEFAULT_ROLES = {
  API_USER: USER_ROLES.USER.name,      // 小程序端默认角色
  ADMIN_USER: USER_ROLES.ADMIN.name    // 管理端默认角色
};

/**
 * 工具函数
 */

/**
 * 根据角色名获取角色信息
 * @param {string} roleName - 角色名
 * @returns {Object|null} 角色信息
 */
function getRoleByName(roleName) {
  for (const role of Object.values(USER_ROLES)) {
    if (role.name === roleName) {
      return role;
    }
  }
  return null;
}

/**
 * 根据角色ID获取角色信息
 * @param {number} roleId - 角色ID
 * @returns {Object|null} 角色信息
 */
function getRoleById(roleId) {
  for (const role of Object.values(USER_ROLES)) {
    if (role.id === roleId) {
      return role;
    }
  }
  return null;
}

/**
 * 获取角色的所有权限（包括继承的权限）
 * @param {string} roleName - 角色名
 * @returns {string[]} 权限列表
 */
function getRolePermissions(roleName) {
  let permissions = [...(ROLE_PERMISSIONS[roleName] || [])];
  
  // 添加继承的权限
  const inheritedRoles = ROLE_HIERARCHY[roleName] || [];
  for (const inheritedRole of inheritedRoles) {
    const inheritedPermissions = ROLE_PERMISSIONS[inheritedRole] || [];
    permissions = [...permissions, ...inheritedPermissions];
  }
  
  // 去重
  return [...new Set(permissions)];
}

/**
 * 检查角色是否拥有指定权限
 * @param {string} roleName - 角色名
 * @param {string} permission - 权限
 * @returns {boolean} 是否拥有权限
 */
function hasPermission(roleName, permission) {
  const permissions = getRolePermissions(roleName);
  return permissions.includes(permission);
}

/**
 * 检查角色是否拥有任意一个权限
 * @param {string} roleName - 角色名
 * @param {string[]} permissions - 权限列表
 * @returns {boolean} 是否拥有任意权限
 */
function hasAnyPermission(roleName, permissions) {
  const rolePermissions = getRolePermissions(roleName);
  return permissions.some(permission => rolePermissions.includes(permission));
}

/**
 * 检查角色是否拥有所有权限
 * @param {string} roleName - 角色名
 * @param {string[]} permissions - 权限列表
 * @returns {boolean} 是否拥有所有权限
 */
function hasAllPermissions(roleName, permissions) {
  const rolePermissions = getRolePermissions(roleName);
  return permissions.every(permission => rolePermissions.includes(permission));
}

/**
 * 检查是否为管理端角色
 * @param {string} roleName - 角色名
 * @returns {boolean} 是否为管理端角色
 */
function isAdminRole(roleName) {
  const adminRoles = [
    USER_ROLES.ADMIN.name,
    USER_ROLES.SUPER_ADMIN.name,
    USER_ROLES.OPERATOR.name,
    USER_ROLES.CUSTOMER_SERVICE.name,
    USER_ROLES.AUDITOR.name
  ];
  return adminRoles.includes(roleName);
}

/**
 * 检查是否为小程序端角色
 * @param {string} roleName - 角色名
 * @returns {boolean} 是否为小程序端角色
 */
function isApiRole(roleName) {
  const apiRoles = [
    USER_ROLES.USER.name,
    USER_ROLES.VIP_USER.name,
    USER_ROLES.PREMIUM_USER.name
  ];
  return apiRoles.includes(roleName);
}

/**
 * 获取角色层级
 * @param {string} roleName - 角色名
 * @returns {number} 角色层级
 */
function getRoleLevel(roleName) {
  const role = getRoleByName(roleName);
  return role ? role.level : 0;
}

/**
 * 比较两个角色的层级
 * @param {string} roleA - 角色A
 * @param {string} roleB - 角色B
 * @returns {number} 比较结果（>0: A>B, =0: A=B, <0: A<B）
 */
function compareRoleLevel(roleA, roleB) {
  const levelA = getRoleLevel(roleA);
  const levelB = getRoleLevel(roleB);
  return levelA - levelB;
}

module.exports = {
  USER_ROLES,
  PERMISSIONS,
  ROLE_PERMISSIONS,
  ROLE_HIERARCHY,
  DEFAULT_ROLES,
  getRoleByName,
  getRoleById,
  getRolePermissions,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  isAdminRole,
  isApiRole,
  getRoleLevel,
  compareRoleLevel
}; 