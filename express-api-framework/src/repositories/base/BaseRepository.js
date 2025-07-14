/**
 * 数据访问层基类
 * 提供通用的CRUD操作、查询构建器、事务处理等功能
 * 所有Repository类都应该继承此基类
 * 
 * @author 系统
 * @since 1.0.0
 */

const { database } = require('../../config');
const { logger } = require('../../config');
const { CustomError, DATABASE_ERRORS } = require('../../constants/errors');

class BaseRepository {
  /**
   * 构造函数
   * @param {string} tableName - 表名
   * @param {string} primaryKey - 主键字段名，默认为'id'
   */
  constructor(tableName, primaryKey = 'id') {
    this.tableName = tableName;
    this.primaryKey = primaryKey;
    this.connection = null;
    this.transaction = null;
  }

  /**
   * 获取数据库连接（读库）
   * @returns {Promise<Connection>}
   */
  async getReadConnection() {
    try {
      return await database.getReadConnection();
    } catch (error) {
      logger.error('获取读连接失败:', error);
      throw new CustomError(DATABASE_ERRORS.CONNECTION_ERROR.message, DATABASE_ERRORS.CONNECTION_ERROR.code);
    }
  }

  /**
   * 获取数据库连接（写库）
   * @returns {Promise<Connection>}
   */
  async getWriteConnection() {
    try {
      return await database.getWriteConnection();
    } catch (error) {
      logger.error('获取写连接失败:', error);
      throw new CustomError(DATABASE_ERRORS.CONNECTION_ERROR.message, DATABASE_ERRORS.CONNECTION_ERROR.code);
    }
  }

  /**
   * 开始事务
   * @returns {Promise<void>}
   */
  async beginTransaction() {
    try {
      this.connection = await this.getWriteConnection();
      await this.connection.beginTransaction();
      this.transaction = this.connection;
      logger.info(`事务开始 - 表: ${this.tableName}`);
    } catch (error) {
      logger.error('开始事务失败:', error);
      throw new CustomError(DATABASE_ERRORS.TRANSACTION_ERROR.message, DATABASE_ERRORS.TRANSACTION_ERROR.code);
    }
  }

  /**
   * 提交事务
   * @returns {Promise<void>}
   */
  async commitTransaction() {
    try {
      if (this.transaction) {
        await this.transaction.commit();
        logger.info(`事务提交成功 - 表: ${this.tableName}`);
      }
    } catch (error) {
      logger.error('提交事务失败:', error);
      throw new CustomError(DATABASE_ERRORS.TRANSACTION_ERROR.message, DATABASE_ERRORS.TRANSACTION_ERROR.code);
    } finally {
      this.transaction = null;
      this.connection = null;
    }
  }

  /**
   * 回滚事务
   * @returns {Promise<void>}
   */
  async rollbackTransaction() {
    try {
      if (this.transaction) {
        await this.transaction.rollback();
        logger.info(`事务回滚成功 - 表: ${this.tableName}`);
      }
    } catch (error) {
      logger.error('回滚事务失败:', error);
    } finally {
      this.transaction = null;
      this.connection = null;
    }
  }

  /**
   * 执行SQL查询
   * @param {string} sql - SQL语句
   * @param {Array} params - 参数数组
   * @param {boolean} useWrite - 是否使用写库连接
   * @returns {Promise<Array>}
   */
  async query(sql, params = [], useWrite = false) {
    let connection = this.transaction;
    
    try {
      if (!connection) {
        connection = useWrite ? await this.getWriteConnection() : await this.getReadConnection();
      }

      const startTime = Date.now();
      const [rows] = await connection.execute(sql, params);
      const duration = Date.now() - startTime;

      // 记录慢查询（超过1秒）
      if (duration > 1000) {
        logger.warn('慢查询检测:', {
          sql: sql.substring(0, 100) + '...',
          duration: `${duration}ms`,
          table: this.tableName
        });
      }

      logger.debug('SQL查询执行:', {
        sql: sql.substring(0, 100) + '...',
        params,
        rowCount: Array.isArray(rows) ? rows.length : 'N/A',
        duration: `${duration}ms`
      });

      return rows;
    } catch (error) {
      logger.error('SQL查询失败:', {
        sql,
        params,
        error: error.message,
        table: this.tableName
      });
      
      // 分析错误类型
      if (error.code === 'ER_NO_SUCH_TABLE') {
        throw new CustomError(`表不存在: ${this.tableName}`, DATABASE_ERRORS.TABLE_NOT_EXISTS.code);
      } else if (error.code === 'ER_DUP_ENTRY') {
        throw new CustomError('数据重复', DATABASE_ERRORS.DUPLICATE_ENTRY.code);
      } else if (error.code === 'ER_NO_REFERENCED_ROW_2') {
        throw new CustomError('外键约束失败', DATABASE_ERRORS.FOREIGN_KEY_ERROR.code);
      }
      
      throw new CustomError(DATABASE_ERRORS.QUERY_ERROR.message, DATABASE_ERRORS.QUERY_ERROR.code);
    } finally {
      // 如果不是事务连接，释放连接
      if (!this.transaction && connection) {
        connection.release();
      }
    }
  }

  /**
   * 查询构建器 - 构建SELECT语句
   * @param {Object} options - 查询选项
   * @returns {Object} 查询构建器对象
   */
  createQueryBuilder(options = {}) {
    return new QueryBuilder(this.tableName, options);
  }

  /**
   * 根据ID查找单条记录
   * @param {number|string} id - 主键ID
   * @param {Array<string>} fields - 要查询的字段
   * @returns {Promise<Object|null>}
   */
  async findById(id, fields = ['*']) {
    const fieldsStr = fields.join(', ');
    const sql = `SELECT ${fieldsStr} FROM ${this.tableName} WHERE ${this.primaryKey} = ? AND deleted_at IS NULL`;
    const rows = await this.query(sql, [id]);
    return rows.length > 0 ? rows[0] : null;
  }

  /**
   * 根据条件查找单条记录
   * @param {Object} conditions - 查询条件
   * @param {Array<string>} fields - 要查询的字段
   * @returns {Promise<Object|null>}
   */
  async findOne(conditions = {}, fields = ['*']) {
    const { whereClause, values } = this.buildWhereClause(conditions);
    const fieldsStr = fields.join(', ');
    const sql = `SELECT ${fieldsStr} FROM ${this.tableName} WHERE ${whereClause} AND deleted_at IS NULL LIMIT 1`;
    const rows = await this.query(sql, values);
    return rows.length > 0 ? rows[0] : null;
  }

  /**
   * 根据条件查找多条记录
   * @param {Object} options - 查询选项
   * @returns {Promise<Array>}
   */
  async findMany(options = {}) {
    const {
      conditions = {},
      fields = ['*'],
      orderBy = null,
      limit = null,
      offset = null,
      includeDeleted = false
    } = options;

    const { whereClause, values } = this.buildWhereClause(conditions, includeDeleted);
    const fieldsStr = fields.join(', ');
    
    let sql = `SELECT ${fieldsStr} FROM ${this.tableName} WHERE ${whereClause}`;
    
    if (orderBy) {
      sql += ` ORDER BY ${orderBy}`;
    }
    
    if (limit) {
      sql += ` LIMIT ${limit}`;
      if (offset) {
        sql += ` OFFSET ${offset}`;
      }
    }

    return await this.query(sql, values);
  }

  /**
   * 分页查询
   * @param {Object} options - 查询选项
   * @returns {Promise<Object>} 包含数据和分页信息
   */
  async paginate(options = {}) {
    const {
      conditions = {},
      fields = ['*'],
      page = 1,
      pageSize = 10,
      orderBy = `${this.primaryKey} DESC`,
      includeDeleted = false
    } = options;

    const offset = (page - 1) * pageSize;
    
    // 查询总数
    const { whereClause, values } = this.buildWhereClause(conditions, includeDeleted);
    const countSql = `SELECT COUNT(*) as total FROM ${this.tableName} WHERE ${whereClause}`;
    const countResult = await this.query(countSql, values);
    const total = countResult[0].total;

    // 查询数据
    const items = await this.findMany({
      conditions,
      fields,
      orderBy,
      limit: pageSize,
      offset,
      includeDeleted
    });

    // 计算分页信息
    const totalPages = Math.ceil(total / pageSize);
    const hasNext = page < totalPages;
    const hasPrevious = page > 1;

    return {
      items,
      pagination: {
        total,
        totalPages,
        currentPage: page,
        pageSize,
        hasNext,
        hasPrevious,
        isFirstPage: page === 1,
        isLastPage: page === totalPages || totalPages === 0
      }
    };
  }

  /**
   * 创建记录
   * @param {Object} data - 要插入的数据
   * @returns {Promise<Object>} 插入的记录（包含ID）
   */
  async create(data) {
    // 添加时间戳
    const now = new Date();
    const insertData = {
      ...data,
      created_at: now,
      updated_at: now
    };

    const { fields, placeholders, values } = this.buildInsertData(insertData);
    const sql = `INSERT INTO ${this.tableName} (${fields}) VALUES (${placeholders})`;
    
    const result = await this.query(sql, values, true);
    const insertId = result.insertId;

    logger.info(`记录创建成功 - 表: ${this.tableName}, ID: ${insertId}`);
    
    // 返回插入的记录
    return await this.findById(insertId);
  }

  /**
   * 批量创建记录
   * @param {Array<Object>} dataArray - 要插入的数据数组
   * @returns {Promise<Array>} 插入的记录数组
   */
  async createMany(dataArray) {
    if (!Array.isArray(dataArray) || dataArray.length === 0) {
      return [];
    }

    const now = new Date();
    const insertDataArray = dataArray.map(data => ({
      ...data,
      created_at: now,
      updated_at: now
    }));

    // 构建批量插入SQL
    const fields = Object.keys(insertDataArray[0]);
    const fieldsStr = fields.join(', ');
    const placeholders = fields.map(() => '?').join(', ');
    const valuesClause = insertDataArray.map(() => `(${placeholders})`).join(', ');
    
    const sql = `INSERT INTO ${this.tableName} (${fieldsStr}) VALUES ${valuesClause}`;
    const values = insertDataArray.flatMap(data => fields.map(field => data[field]));

    const result = await this.query(sql, values, true);
    
    logger.info(`批量创建记录成功 - 表: ${this.tableName}, 数量: ${dataArray.length}`);
    
    // 返回插入的记录（假设是连续的ID）
    const insertIds = [];
    for (let i = 0; i < dataArray.length; i++) {
      insertIds.push(result.insertId + i);
    }
    
    return await this.findMany({
      conditions: { [this.primaryKey]: insertIds }
    });
  }

  /**
   * 更新记录
   * @param {number|string} id - 主键ID
   * @param {Object} data - 要更新的数据
   * @returns {Promise<Object|null>} 更新后的记录
   */
  async update(id, data) {
    // 添加更新时间戳
    const updateData = {
      ...data,
      updated_at: new Date()
    };

    const { setClause, values } = this.buildUpdateData(updateData);
    const sql = `UPDATE ${this.tableName} SET ${setClause} WHERE ${this.primaryKey} = ? AND deleted_at IS NULL`;
    
    const result = await this.query(sql, [...values, id], true);
    
    if (result.affectedRows === 0) {
      logger.warn(`记录更新失败，记录不存在 - 表: ${this.tableName}, ID: ${id}`);
      return null;
    }

    logger.info(`记录更新成功 - 表: ${this.tableName}, ID: ${id}`);
    
    // 返回更新后的记录
    return await this.findById(id);
  }

  /**
   * 根据条件更新记录
   * @param {Object} conditions - 更新条件
   * @param {Object} data - 要更新的数据
   * @returns {Promise<number>} 受影响的行数
   */
  async updateMany(conditions, data) {
    const updateData = {
      ...data,
      updated_at: new Date()
    };

    const { setClause, values: updateValues } = this.buildUpdateData(updateData);
    const { whereClause, values: whereValues } = this.buildWhereClause(conditions);
    
    const sql = `UPDATE ${this.tableName} SET ${setClause} WHERE ${whereClause} AND deleted_at IS NULL`;
    const result = await this.query(sql, [...updateValues, ...whereValues], true);

    logger.info(`批量更新记录成功 - 表: ${this.tableName}, 受影响行数: ${result.affectedRows}`);
    
    return result.affectedRows;
  }

  /**
   * 软删除记录
   * @param {number|string} id - 主键ID
   * @returns {Promise<boolean>} 是否删除成功
   */
  async softDelete(id) {
    const now = new Date();
    const sql = `UPDATE ${this.tableName} SET deleted_at = ?, updated_at = ? WHERE ${this.primaryKey} = ? AND deleted_at IS NULL`;
    
    const result = await this.query(sql, [now, now, id], true);
    const success = result.affectedRows > 0;

    if (success) {
      logger.info(`记录软删除成功 - 表: ${this.tableName}, ID: ${id}`);
    } else {
      logger.warn(`记录软删除失败，记录不存在 - 表: ${this.tableName}, ID: ${id}`);
    }

    return success;
  }

  /**
   * 恢复软删除的记录
   * @param {number|string} id - 主键ID
   * @returns {Promise<boolean>} 是否恢复成功
   */
  async restore(id) {
    const now = new Date();
    const sql = `UPDATE ${this.tableName} SET deleted_at = NULL, updated_at = ? WHERE ${this.primaryKey} = ? AND deleted_at IS NOT NULL`;
    
    const result = await this.query(sql, [now, id], true);
    const success = result.affectedRows > 0;

    if (success) {
      logger.info(`记录恢复成功 - 表: ${this.tableName}, ID: ${id}`);
    } else {
      logger.warn(`记录恢复失败，记录不存在或未被删除 - 表: ${this.tableName}, ID: ${id}`);
    }

    return success;
  }

  /**
   * 物理删除记录（永久删除）
   * @param {number|string} id - 主键ID
   * @returns {Promise<boolean>} 是否删除成功
   */
  async hardDelete(id) {
    const sql = `DELETE FROM ${this.tableName} WHERE ${this.primaryKey} = ?`;
    const result = await this.query(sql, [id], true);
    const success = result.affectedRows > 0;

    if (success) {
      logger.warn(`记录物理删除成功 - 表: ${this.tableName}, ID: ${id}`);
    } else {
      logger.warn(`记录物理删除失败，记录不存在 - 表: ${this.tableName}, ID: ${id}`);
    }

    return success;
  }

  /**
   * 检查记录是否存在
   * @param {number|string} id - 主键ID
   * @returns {Promise<boolean>}
   */
  async exists(id) {
    const sql = `SELECT 1 FROM ${this.tableName} WHERE ${this.primaryKey} = ? AND deleted_at IS NULL LIMIT 1`;
    const rows = await this.query(sql, [id]);
    return rows.length > 0;
  }

  /**
   * 获取记录总数
   * @param {Object} conditions - 查询条件
   * @param {boolean} includeDeleted - 是否包含已删除的记录
   * @returns {Promise<number>}
   */
  async count(conditions = {}, includeDeleted = false) {
    const { whereClause, values } = this.buildWhereClause(conditions, includeDeleted);
    const sql = `SELECT COUNT(*) as total FROM ${this.tableName} WHERE ${whereClause}`;
    const result = await this.query(sql, values);
    return result[0].total;
  }

  /**
   * 构建WHERE子句
   * @param {Object} conditions - 查询条件
   * @param {boolean} includeDeleted - 是否包含已删除的记录
   * @returns {Object} {whereClause, values}
   */
  buildWhereClause(conditions = {}, includeDeleted = false) {
    const clauses = [];
    const values = [];

    // 处理查询条件
    for (const [field, value] of Object.entries(conditions)) {
      if (value === null) {
        clauses.push(`${field} IS NULL`);
      } else if (value === undefined) {
        continue;
      } else if (Array.isArray(value)) {
        const placeholders = value.map(() => '?').join(', ');
        clauses.push(`${field} IN (${placeholders})`);
        values.push(...value);
      } else if (typeof value === 'object' && value.operator) {
        // 支持操作符查询：{field: {operator: '>', value: 100}}
        clauses.push(`${field} ${value.operator} ?`);
        values.push(value.value);
      } else {
        clauses.push(`${field} = ?`);
        values.push(value);
      }
    }

    // 添加软删除条件
    if (!includeDeleted) {
      clauses.push('deleted_at IS NULL');
    }

    const whereClause = clauses.length > 0 ? clauses.join(' AND ') : '1=1';
    
    return { whereClause, values };
  }

  /**
   * 构建INSERT数据
   * @param {Object} data - 要插入的数据
   * @returns {Object} {fields, placeholders, values}
   */
  buildInsertData(data) {
    const fields = Object.keys(data).join(', ');
    const placeholders = Object.keys(data).map(() => '?').join(', ');
    const values = Object.values(data);
    
    return { fields, placeholders, values };
  }

  /**
   * 构建UPDATE数据
   * @param {Object} data - 要更新的数据
   * @returns {Object} {setClause, values}
   */
  buildUpdateData(data) {
    const setClauses = [];
    const values = [];

    for (const [field, value] of Object.entries(data)) {
      setClauses.push(`${field} = ?`);
      values.push(value);
    }

    const setClause = setClauses.join(', ');
    
    return { setClause, values };
  }

  /**
   * 获取表信息
   * @returns {Promise<Object>} 表结构信息
   */
  async getTableInfo() {
    const sql = `DESCRIBE ${this.tableName}`;
    const columns = await this.query(sql);
    
    return {
      tableName: this.tableName,
      primaryKey: this.primaryKey,
      columns: columns.map(col => ({
        field: col.Field,
        type: col.Type,
        null: col.Null === 'YES',
        key: col.Key,
        default: col.Default,
        extra: col.Extra
      }))
    };
  }
}

/**
 * 查询构建器类
 * 提供链式查询API
 */
class QueryBuilder {
  constructor(tableName, options = {}) {
    this.tableName = tableName;
    this.selectFields = ['*'];
    this.whereConditions = [];
    this.whereValues = [];
    this.joinClauses = [];
    this.orderByClauses = [];
    this.groupByClauses = [];
    this.havingConditions = [];
    this.havingValues = [];
    this.limitValue = null;
    this.offsetValue = null;
    this.includeDeleted = options.includeDeleted || false;
  }

  /**
   * 选择字段
   * @param {Array<string>} fields - 字段数组
   * @returns {QueryBuilder}
   */
  select(fields) {
    this.selectFields = fields;
    return this;
  }

  /**
   * WHERE条件
   * @param {string} field - 字段名
   * @param {string} operator - 操作符
   * @param {*} value - 值
   * @returns {QueryBuilder}
   */
  where(field, operator, value) {
    this.whereConditions.push(`${field} ${operator} ?`);
    this.whereValues.push(value);
    return this;
  }

  /**
   * WHERE IN条件
   * @param {string} field - 字段名
   * @param {Array} values - 值数组
   * @returns {QueryBuilder}
   */
  whereIn(field, values) {
    const placeholders = values.map(() => '?').join(', ');
    this.whereConditions.push(`${field} IN (${placeholders})`);
    this.whereValues.push(...values);
    return this;
  }

  /**
   * JOIN查询
   * @param {string} table - 表名
   * @param {string} condition - 连接条件
   * @param {string} type - 连接类型（INNER, LEFT, RIGHT）
   * @returns {QueryBuilder}
   */
  join(table, condition, type = 'INNER') {
    this.joinClauses.push(`${type} JOIN ${table} ON ${condition}`);
    return this;
  }

  /**
   * ORDER BY排序
   * @param {string} field - 字段名
   * @param {string} direction - 排序方向（ASC, DESC）
   * @returns {QueryBuilder}
   */
  orderBy(field, direction = 'ASC') {
    this.orderByClauses.push(`${field} ${direction}`);
    return this;
  }

  /**
   * GROUP BY分组
   * @param {string} field - 字段名
   * @returns {QueryBuilder}
   */
  groupBy(field) {
    this.groupByClauses.push(field);
    return this;
  }

  /**
   * LIMIT限制
   * @param {number} limit - 限制数量
   * @returns {QueryBuilder}
   */
  limit(limit) {
    this.limitValue = limit;
    return this;
  }

  /**
   * OFFSET偏移
   * @param {number} offset - 偏移量
   * @returns {QueryBuilder}
   */
  offset(offset) {
    this.offsetValue = offset;
    return this;
  }

  /**
   * 构建SQL语句
   * @returns {Object} {sql, values}
   */
  build() {
    const fields = this.selectFields.join(', ');
    let sql = `SELECT ${fields} FROM ${this.tableName}`;

    // JOIN子句
    if (this.joinClauses.length > 0) {
      sql += ' ' + this.joinClauses.join(' ');
    }

    // WHERE子句
    const conditions = [...this.whereConditions];
    const values = [...this.whereValues];

    if (!this.includeDeleted) {
      conditions.push('deleted_at IS NULL');
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    // GROUP BY子句
    if (this.groupByClauses.length > 0) {
      sql += ' GROUP BY ' + this.groupByClauses.join(', ');
    }

    // HAVING子句
    if (this.havingConditions.length > 0) {
      sql += ' HAVING ' + this.havingConditions.join(' AND ');
      values.push(...this.havingValues);
    }

    // ORDER BY子句
    if (this.orderByClauses.length > 0) {
      sql += ' ORDER BY ' + this.orderByClauses.join(', ');
    }

    // LIMIT和OFFSET子句
    if (this.limitValue) {
      sql += ` LIMIT ${this.limitValue}`;
      if (this.offsetValue) {
        sql += ` OFFSET ${this.offsetValue}`;
      }
    }

    return { sql, values };
  }
}

module.exports = BaseRepository; 