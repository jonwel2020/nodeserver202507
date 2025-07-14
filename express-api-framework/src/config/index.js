/**
 * 统一配置导出模块
 * 集中管理所有配置模块的导入导出
 */
const database = require('./database');
const redis = require('./redis');
const logger = require('./logger');

module.exports = {
  database,
  redis,
  logger
}; 