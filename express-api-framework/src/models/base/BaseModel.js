/**
 * 基础模型类
 * 提供通用字段和基础方法，所有模型都应该继承此类
 */

class BaseModel {
  constructor(data = {}) {
    // 通用字段
    this.id = data.id || null;
    this.created_at = data.created_at || null;
    this.updated_at = data.updated_at || null;
    this.deleted_at = data.deleted_at || null; // 软删除标记
    this.created_by = data.created_by || null;
    this.updated_by = data.updated_by || null;
    this.version = data.version || 1; // 乐观锁版本号
    
    // 设置其他属性
    this.setAttributes(data);
  }

  /**
   * 设置模型属性
   * @param {Object} data - 数据对象
   */
  setAttributes(data) {
    // 子类可以重写此方法来设置特定属性
    Object.keys(data).forEach(key => {
      if (!this.hasOwnProperty(key) && !this.isReservedField(key)) {
        this[key] = data[key];
      }
    });
  }

  /**
   * 检查是否为保留字段
   * @param {string} field - 字段名
   * @returns {boolean}
   */
  isReservedField(field) {
    const reservedFields = [
      'id', 'created_at', 'updated_at', 'deleted_at',
      'created_by', 'updated_by', 'version'
    ];
    return reservedFields.includes(field);
  }

  /**
   * 获取所有属性（用于序列化）
   * @param {boolean} includeDeleted - 是否包含软删除字段
   * @returns {Object}
   */
  toJSON(includeDeleted = false) {
    const result = {};
    
    Object.keys(this).forEach(key => {
      if (typeof this[key] !== 'function') {
        // 软删除字段处理
        if (key === 'deleted_at' && !includeDeleted && this[key] !== null) {
          return;
        }
        result[key] = this[key];
      }
    });
    
    return result;
  }

  /**
   * 获取用于数据库插入的数据
   * @returns {Object}
   */
  toInsertData() {
    const data = this.toJSON(true);
    
    // 移除ID（由数据库自动生成）
    delete data.id;
    
    // 设置创建时间
    data.created_at = new Date();
    data.updated_at = new Date();
    
    return data;
  }

  /**
   * 获取用于数据库更新的数据
   * @returns {Object}
   */
  toUpdateData() {
    const data = this.toJSON(true);
    
    // 移除不应该更新的字段
    delete data.id;
    delete data.created_at;
    delete data.created_by;
    
    // 更新时间
    data.updated_at = new Date();
    
    // 版本号递增（乐观锁）
    if (data.version) {
      data.version += 1;
    }
    
    return data;
  }

  /**
   * 检查模型是否为新记录
   * @returns {boolean}
   */
  isNew() {
    return !this.id;
  }

  /**
   * 检查模型是否已被软删除
   * @returns {boolean}
   */
  isDeleted() {
    return this.deleted_at !== null;
  }

  /**
   * 标记为软删除
   * @param {number} deletedBy - 删除者ID
   */
  markAsDeleted(deletedBy = null) {
    this.deleted_at = new Date();
    this.updated_at = new Date();
    this.updated_by = deletedBy;
  }

  /**
   * 恢复软删除
   * @param {number} updatedBy - 更新者ID
   */
  restore(updatedBy = null) {
    this.deleted_at = null;
    this.updated_at = new Date();
    this.updated_by = updatedBy;
  }

  /**
   * 克隆模型实例
   * @returns {BaseModel}
   */
  clone() {
    const data = this.toJSON(true);
    delete data.id; // 新实例不应该有ID
    return new this.constructor(data);
  }

  /**
   * 验证模型数据
   * @returns {Object} 验证结果 {valid: boolean, errors: Array}
   */
  validate() {
    const errors = [];
    
    // 基础验证规则
    if (this.version && typeof this.version !== 'number') {
      errors.push('版本号必须是数字');
    }
    
    if (this.created_at && !(this.created_at instanceof Date)) {
      errors.push('创建时间格式不正确');
    }
    
    if (this.updated_at && !(this.updated_at instanceof Date)) {
      errors.push('更新时间格式不正确');
    }
    
    // 子类可以重写此方法添加特定验证
    const customValidation = this.customValidation();
    if (customValidation.errors.length > 0) {
      errors.push(...customValidation.errors);
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * 自定义验证方法（子类重写）
   * @returns {Object}
   */
  customValidation() {
    return { errors: [] };
  }

  /**
   * 比较两个模型实例是否相等
   * @param {BaseModel} other - 另一个模型实例
   * @returns {boolean}
   */
  equals(other) {
    if (!other || !(other instanceof BaseModel)) {
      return false;
    }
    
    return this.id === other.id && this.id !== null;
  }

  /**
   * 获取模型的哈希值（基于ID）
   * @returns {string}
   */
  getHashCode() {
    return `${this.constructor.name}_${this.id || 'new'}`;
  }

  /**
   * 获取模型的字符串表示
   * @returns {string}
   */
  toString() {
    return `${this.constructor.name}(id=${this.id})`;
  }

  /**
   * 获取模型变更的字段
   * @param {BaseModel} originalModel - 原始模型
   * @returns {Object} 变更的字段
   */
  getChanges(originalModel) {
    const changes = {};
    const currentData = this.toJSON(true);
    const originalData = originalModel.toJSON(true);
    
    Object.keys(currentData).forEach(key => {
      if (currentData[key] !== originalData[key]) {
        changes[key] = {
          old: originalData[key],
          new: currentData[key]
        };
      }
    });
    
    return changes;
  }

  /**
   * 检查指定字段是否有变更
   * @param {BaseModel} originalModel - 原始模型
   * @param {string[]} fields - 要检查的字段
   * @returns {boolean}
   */
  hasChanges(originalModel, fields = null) {
    const changes = this.getChanges(originalModel);
    
    if (fields === null) {
      return Object.keys(changes).length > 0;
    }
    
    return fields.some(field => changes.hasOwnProperty(field));
  }

  /**
   * 应用变更到当前模型
   * @param {Object} changes - 变更数据
   * @param {number} updatedBy - 更新者ID
   */
  applyChanges(changes, updatedBy = null) {
    Object.keys(changes).forEach(key => {
      if (!this.isReservedField(key) || key === 'updated_by') {
        this[key] = changes[key];
      }
    });
    
    this.updated_at = new Date();
    if (updatedBy) {
      this.updated_by = updatedBy;
    }
  }

  /**
   * 重置模型到初始状态
   */
  reset() {
    Object.keys(this).forEach(key => {
      if (typeof this[key] !== 'function') {
        this[key] = null;
      }
    });
    this.version = 1;
  }

  /**
   * 静态方法：从数据库行创建模型实例
   * @param {Object} row - 数据库行数据
   * @returns {BaseModel}
   */
  static fromDatabaseRow(row) {
    return new this(row);
  }

  /**
   * 静态方法：从数据库行数组创建模型实例数组
   * @param {Array} rows - 数据库行数据数组
   * @returns {Array}
   */
  static fromDatabaseRows(rows) {
    return rows.map(row => this.fromDatabaseRow(row));
  }

  /**
   * 静态方法：获取表名（子类必须重写）
   * @returns {string}
   */
  static getTableName() {
    throw new Error('子类必须实现 getTableName 方法');
  }

  /**
   * 静态方法：获取主键字段名
   * @returns {string}
   */
  static getPrimaryKey() {
    return 'id';
  }

  /**
   * 静态方法：获取可填充字段
   * @returns {Array}
   */
  static getFillableFields() {
    return [];
  }

  /**
   * 静态方法：获取隐藏字段（不在JSON中显示）
   * @returns {Array}
   */
  static getHiddenFields() {
    return [];
  }

  /**
   * 静态方法：获取默认查询条件（软删除过滤）
   * @returns {Object}
   */
  static getDefaultWhereClause() {
    return {
      deleted_at: null
    };
  }
}

module.exports = BaseModel; 