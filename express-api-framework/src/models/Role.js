const BaseModel = require('./base/BaseModel');
const { PERMISSIONS } = require('../constants/roles');

/**
 * 角色模型类
 * 管理用户角色和权限分配
 */
class Role extends BaseModel {
  /**
   * 构造函数
   * @param {Object} data - 角色数据
   */
  constructor(data = {}) {
    super(data);
    
    // 基本信息
    this.name = data.name || null;              // 角色名称
    this.code = data.code || null;              // 角色代码（英文标识）
    this.description = data.description || null; // 角色描述
    this.type = data.type || 'api';             // 角色类型（api: 小程序端, admin: 管理端）
    
    // 权限信息
    this.permissions = data.permissions || [];  // 权限列表（JSON数组）
    this.inherit_from = data.inherit_from || null; // 继承的父角色ID
    
    // 状态信息
    this.is_active = data.is_active !== undefined ? data.is_active : true;
    this.is_default = data.is_default || false; // 是否为默认角色
    this.is_system = data.is_system || false;   // 是否为系统角色（不可删除）
    
    // 配置信息
    this.config = data.config || {};            // 角色配置（JSON）
    this.sort_order = data.sort_order || 0;     // 排序顺序
    this.remarks = data.remarks || null;        // 备注
  }

  /**
   * 获取数据库表名
   * @returns {string} 表名
   */
  static getTableName() {
    return 'roles';
  }

  /**
   * 获取字段映射
   * @returns {Object} 字段映射
   */
  static getFieldMapping() {
    return {
      id: 'id',
      name: 'name',
      code: 'code',
      description: 'description',
      type: 'type',
      permissions: 'permissions',
      inherit_from: 'inherit_from',
      is_active: 'is_active',
      is_default: 'is_default',
      is_system: 'is_system',
      config: 'config',
      sort_order: 'sort_order',
      remarks: 'remarks',
      created_at: 'created_at',
      updated_at: 'updated_at',
      deleted_at: 'deleted_at',
      version: 'version'
    };
  }

  /**
   * 获取验证规则
   * @returns {Object} 验证规则
   */
  static getValidationRules() {
    return {
      name: {
        required: true,
        type: 'string',
        min: 2,
        max: 50,
        message: '角色名称长度2-50位'
      },
      code: {
        required: true,
        type: 'string',
        min: 2,
        max: 50,
        pattern: /^[A-Z_]+$/,
        message: '角色代码长度2-50位，只能包含大写字母和下划线'
      },
      description: {
        required: false,
        type: 'string',
        max: 500,
        message: '角色描述最大500位'
      },
      type: {
        required: true,
        type: 'string',
        enum: ['api', 'admin'],
        message: '角色类型必须为api或admin'
      },
      permissions: {
        required: false,
        type: 'array',
        message: '权限列表必须为数组'
      },
      inherit_from: {
        required: false,
        type: 'number',
        min: 1,
        message: '继承角色ID必须为正整数'
      }
    };
  }

  /**
   * 检查角色是否激活
   * @returns {boolean} 激活状态
   */
  isActive() {
    return this.is_active === true;
  }

  /**
   * 检查角色是否为默认角色
   * @returns {boolean} 默认角色状态
   */
  isDefault() {
    return this.is_default === true;
  }

  /**
   * 检查角色是否为系统角色
   * @returns {boolean} 系统角色状态
   */
  isSystem() {
    return this.is_system === true;
  }

  /**
   * 检查是否为小程序端角色
   * @returns {boolean} 小程序端角色状态
   */
  isApiRole() {
    return this.type === 'api';
  }

  /**
   * 检查是否为管理端角色
   * @returns {boolean} 管理端角色状态
   */
  isAdminRole() {
    return this.type === 'admin';
  }

  /**
   * 添加权限
   * @param {string|Array} permissions - 权限代码或权限数组
   */
  addPermissions(permissions) {
    const perms = Array.isArray(permissions) ? permissions : [permissions];
    const currentPerms = this.permissions || [];
    
    perms.forEach(perm => {
      if (!currentPerms.includes(perm)) {
        currentPerms.push(perm);
      }
    });
    
    this.permissions = currentPerms;
  }

  /**
   * 移除权限
   * @param {string|Array} permissions - 权限代码或权限数组
   */
  removePermissions(permissions) {
    const perms = Array.isArray(permissions) ? permissions : [permissions];
    this.permissions = (this.permissions || []).filter(perm => !perms.includes(perm));
  }

  /**
   * 检查是否拥有权限
   * @param {string} permission - 权限代码
   * @returns {boolean} 权限状态
   */
  hasPermission(permission) {
    return (this.permissions || []).includes(permission);
  }

  /**
   * 检查是否拥有任一权限
   * @param {Array} permissions - 权限数组
   * @returns {boolean} 权限状态
   */
  hasAnyPermission(permissions) {
    return permissions.some(perm => this.hasPermission(perm));
  }

  /**
   * 检查是否拥有所有权限
   * @param {Array} permissions - 权限数组
   * @returns {boolean} 权限状态
   */
  hasAllPermissions(permissions) {
    return permissions.every(perm => this.hasPermission(perm));
  }

  /**
   * 获取所有权限（包括继承的权限）
   * @param {Array} allRoles - 所有角色列表（用于查找父角色）
   * @returns {Array} 权限列表
   */
  getAllPermissions(allRoles = []) {
    let permissions = [...(this.permissions || [])];
    
    // 如果有继承的角色，递归获取父角色权限
    if (this.inherit_from) {
      const parentRole = allRoles.find(role => role.id === this.inherit_from);
      if (parentRole) {
        const parentPermissions = parentRole.getAllPermissions(allRoles);
        parentPermissions.forEach(perm => {
          if (!permissions.includes(perm)) {
            permissions.push(perm);
          }
        });
      }
    }
    
    return permissions;
  }

  /**
   * 设置为默认角色
   */
  setAsDefault() {
    this.is_default = true;
  }

  /**
   * 取消默认角色
   */
  unsetAsDefault() {
    this.is_default = false;
  }

  /**
   * 激活角色
   */
  activate() {
    this.is_active = true;
  }

  /**
   * 停用角色
   */
  deactivate() {
    this.is_active = false;
  }

  /**
   * 更新角色配置
   * @param {Object} config - 配置对象
   */
  updateConfig(config) {
    this.config = { ...this.config, ...config };
  }

  /**
   * 获取权限详情列表
   * @returns {Array} 权限详情列表
   */
  getPermissionDetails() {
    const permissions = this.permissions || [];
    return permissions.map(permCode => {
      // 查找权限定义
      const permDef = this.findPermissionDefinition(permCode);
      return {
        code: permCode,
        name: permDef ? permDef.name : permCode,
        description: permDef ? permDef.description : '未知权限',
        category: permDef ? permDef.category : 'unknown'
      };
    });
  }

  /**
   * 查找权限定义
   * @param {string} permissionCode - 权限代码
   * @returns {Object|null} 权限定义
   */
  findPermissionDefinition(permissionCode) {
    for (const category in PERMISSIONS) {
      const categoryPerms = PERMISSIONS[category];
      for (const permKey in categoryPerms) {
        if (categoryPerms[permKey].code === permissionCode) {
          return {
            ...categoryPerms[permKey],
            category: category
          };
        }
      }
    }
    return null;
  }

  /**
   * 验证权限代码是否有效
   * @param {Array} permissions - 权限代码数组
   * @returns {Object} 验证结果
   */
  static validatePermissions(permissions) {
    const validPermissions = [];
    const invalidPermissions = [];
    
    // 获取所有有效权限代码
    const allValidPermissions = [];
    for (const category in PERMISSIONS) {
      for (const permKey in PERMISSIONS[category]) {
        allValidPermissions.push(PERMISSIONS[category][permKey].code);
      }
    }
    
    permissions.forEach(perm => {
      if (allValidPermissions.includes(perm)) {
        validPermissions.push(perm);
      } else {
        invalidPermissions.push(perm);
      }
    });
    
    return {
      valid: validPermissions,
      invalid: invalidPermissions,
      isAllValid: invalidPermissions.length === 0
    };
  }

  /**
   * 获取角色层级路径
   * @param {Array} allRoles - 所有角色列表
   * @returns {Array} 角色层级路径
   */
  getHierarchyPath(allRoles = []) {
    const path = [this];
    let currentRole = this;
    
    // 防止循环继承
    const visited = new Set([this.id]);
    
    while (currentRole.inherit_from && !visited.has(currentRole.inherit_from)) {
      const parentRole = allRoles.find(role => role.id === currentRole.inherit_from);
      if (parentRole) {
        path.unshift(parentRole);
        visited.add(parentRole.id);
        currentRole = parentRole;
      } else {
        break;
      }
    }
    
    return path;
  }

  /**
   * 检查角色继承关系是否会造成循环
   * @param {number} parentRoleId - 父角色ID
   * @param {Array} allRoles - 所有角色列表
   * @returns {boolean} 是否造成循环
   */
  wouldCreateCircularInheritance(parentRoleId, allRoles = []) {
    if (parentRoleId === this.id) {
      return true;
    }
    
    const parentRole = allRoles.find(role => role.id === parentRoleId);
    if (!parentRole) {
      return false;
    }
    
    // 检查父角色的继承路径是否包含当前角色
    const visited = new Set();
    let currentRole = parentRole;
    
    while (currentRole && currentRole.inherit_from && !visited.has(currentRole.id)) {
      if (currentRole.inherit_from === this.id) {
        return true;
      }
      visited.add(currentRole.id);
      currentRole = allRoles.find(role => role.id === currentRole.inherit_from);
    }
    
    return false;
  }

  /**
   * 转换为JSON（包含权限详情）
   * @param {boolean} includePermissionDetails - 是否包含权限详情
   * @returns {Object} JSON对象
   */
  toJSON(includePermissionDetails = false) {
    const data = super.toJSON();
    
    if (includePermissionDetails) {
      data.permission_details = this.getPermissionDetails();
    }
    
    return data;
  }

  /**
   * 转换为简要信息
   * @returns {Object} 简要信息对象
   */
  toSummaryJSON() {
    return {
      id: this.id,
      name: this.name,
      code: this.code,
      type: this.type,
      is_active: this.is_active,
      is_default: this.is_default,
      is_system: this.is_system,
      permission_count: (this.permissions || []).length
    };
  }
}

module.exports = Role; 