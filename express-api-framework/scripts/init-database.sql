-- =============================================
-- Express API Framework 数据库初始化脚本
-- 企业级Node.js后端API框架
-- =============================================

-- 设置字符集和时区
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;
SET time_zone = '+00:00';

-- =============================================
-- 1. 角色表 (roles)
-- =============================================
DROP TABLE IF EXISTS `roles`;
CREATE TABLE `roles` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '角色ID',
  `name` varchar(50) NOT NULL COMMENT '角色名称',
  `display_name` varchar(100) NOT NULL COMMENT '角色显示名称',
  `description` text COMMENT '角色描述',
  `permissions` json COMMENT '权限列表',
  `is_active` tinyint(1) NOT NULL DEFAULT '1' COMMENT '是否启用',
  `is_system` tinyint(1) NOT NULL DEFAULT '0' COMMENT '是否系统角色（不可删除）',
  `parent_id` int DEFAULT NULL COMMENT '父角色ID',
  `level` int NOT NULL DEFAULT '1' COMMENT '角色级别',
  `sort_order` int NOT NULL DEFAULT '0' COMMENT '排序顺序',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted_at` timestamp NULL DEFAULT NULL COMMENT '删除时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_roles_name` (`name`),
  KEY `idx_roles_parent_id` (`parent_id`),
  KEY `idx_roles_level` (`level`),
  KEY `idx_roles_active` (`is_active`),
  KEY `idx_roles_deleted` (`deleted_at`),
  CONSTRAINT `fk_roles_parent` FOREIGN KEY (`parent_id`) REFERENCES `roles` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户角色表';

-- =============================================
-- 2. 用户表 (users)
-- =============================================
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '用户ID',
  `username` varchar(50) DEFAULT NULL COMMENT '用户名',
  `email` varchar(100) DEFAULT NULL COMMENT '邮箱',
  `phone` varchar(20) DEFAULT NULL COMMENT '手机号',
  `password_hash` varchar(255) NOT NULL COMMENT '密码哈希',
  `salt` varchar(255) NOT NULL COMMENT '密码盐值',
  `nickname` varchar(100) DEFAULT NULL COMMENT '昵称',
  `real_name` varchar(50) DEFAULT NULL COMMENT '真实姓名',
  `avatar_url` varchar(500) DEFAULT NULL COMMENT '头像URL',
  `gender` tinyint DEFAULT NULL COMMENT '性别 1-男 2-女',
  `birthday` date DEFAULT NULL COMMENT '生日',
  `bio` text COMMENT '个人简介',
  `status` tinyint NOT NULL DEFAULT '1' COMMENT '状态 1-正常 2-禁用 3-锁定 4-注销',
  `email_verified` tinyint(1) NOT NULL DEFAULT '0' COMMENT '邮箱是否验证',
  `phone_verified` tinyint(1) NOT NULL DEFAULT '0' COMMENT '手机号是否验证',
  `two_factor_enabled` tinyint(1) NOT NULL DEFAULT '0' COMMENT '是否启用双重验证',
  `two_factor_secret` varchar(255) DEFAULT NULL COMMENT '双重验证密钥',
  `login_count` int NOT NULL DEFAULT '0' COMMENT '登录次数',
  `last_login_at` timestamp NULL DEFAULT NULL COMMENT '最后登录时间',
  `last_login_ip` varchar(45) DEFAULT NULL COMMENT '最后登录IP',
  `password_changed_at` timestamp NULL DEFAULT NULL COMMENT '密码修改时间',
  `failed_login_attempts` int NOT NULL DEFAULT '0' COMMENT '登录失败次数',
  `locked_until` timestamp NULL DEFAULT NULL COMMENT '锁定到期时间',
  `preferences` json COMMENT '用户偏好设置',
  `metadata` json COMMENT '额外元数据',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deleted_at` timestamp NULL DEFAULT NULL COMMENT '删除时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_users_username` (`username`),
  UNIQUE KEY `uk_users_email` (`email`),
  UNIQUE KEY `uk_users_phone` (`phone`),
  KEY `idx_users_status` (`status`),
  KEY `idx_users_email_verified` (`email_verified`),
  KEY `idx_users_phone_verified` (`phone_verified`),
  KEY `idx_users_created_at` (`created_at`),
  KEY `idx_users_deleted` (`deleted_at`),
  KEY `idx_users_last_login` (`last_login_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';

-- =============================================
-- 3. 用户角色关联表 (user_roles)
-- =============================================
DROP TABLE IF EXISTS `user_roles`;
CREATE TABLE `user_roles` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '关联ID',
  `user_id` int NOT NULL COMMENT '用户ID',
  `role_id` int NOT NULL COMMENT '角色ID',
  `assigned_by` int DEFAULT NULL COMMENT '分配者用户ID',
  `assigned_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '分配时间',
  `expires_at` timestamp NULL DEFAULT NULL COMMENT '过期时间',
  `is_active` tinyint(1) NOT NULL DEFAULT '1' COMMENT '是否启用',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_roles` (`user_id`,`role_id`),
  KEY `idx_user_roles_user_id` (`user_id`),
  KEY `idx_user_roles_role_id` (`role_id`),
  KEY `idx_user_roles_active` (`is_active`),
  KEY `idx_user_roles_expires` (`expires_at`),
  CONSTRAINT `fk_user_roles_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_roles_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_roles_assigned_by` FOREIGN KEY (`assigned_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户角色关联表';

-- =============================================
-- 4. 微信用户信息表 (wechat_users)
-- =============================================
DROP TABLE IF EXISTS `wechat_users`;
CREATE TABLE `wechat_users` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '记录ID',
  `user_id` int NOT NULL COMMENT '用户ID',
  `openid` varchar(100) NOT NULL COMMENT '微信OpenID',
  `unionid` varchar(100) DEFAULT NULL COMMENT '微信UnionID',
  `session_key` varchar(100) DEFAULT NULL COMMENT '会话密钥',
  `nickname` varchar(100) DEFAULT NULL COMMENT '微信昵称',
  `avatar_url` varchar(500) DEFAULT NULL COMMENT '微信头像',
  `gender` tinyint DEFAULT NULL COMMENT '性别',
  `city` varchar(50) DEFAULT NULL COMMENT '城市',
  `province` varchar(50) DEFAULT NULL COMMENT '省份',
  `country` varchar(50) DEFAULT NULL COMMENT '国家',
  `language` varchar(10) DEFAULT NULL COMMENT '语言',
  `bind_time` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '绑定时间',
  `last_login_at` timestamp NULL DEFAULT NULL COMMENT '最后登录时间',
  `is_active` tinyint(1) NOT NULL DEFAULT '1' COMMENT '是否启用',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_wechat_openid` (`openid`),
  UNIQUE KEY `uk_wechat_user_id` (`user_id`),
  KEY `idx_wechat_unionid` (`unionid`),
  KEY `idx_wechat_active` (`is_active`),
  CONSTRAINT `fk_wechat_users_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='微信用户信息表';

-- =============================================
-- 5. 登录历史表 (login_history)
-- =============================================
DROP TABLE IF EXISTS `login_history`;
CREATE TABLE `login_history` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '记录ID',
  `user_id` int NOT NULL COMMENT '用户ID',
  `login_type` varchar(20) NOT NULL COMMENT '登录类型',
  `login_method` varchar(20) NOT NULL COMMENT '登录方式',
  `ip_address` varchar(45) NOT NULL COMMENT 'IP地址',
  `user_agent` text COMMENT '用户代理',
  `device_info` json COMMENT '设备信息',
  `location` varchar(100) DEFAULT NULL COMMENT '登录位置',
  `is_success` tinyint(1) NOT NULL COMMENT '是否成功',
  `failure_reason` varchar(100) DEFAULT NULL COMMENT '失败原因',
  `session_id` varchar(100) DEFAULT NULL COMMENT '会话ID',
  `logout_at` timestamp NULL DEFAULT NULL COMMENT '登出时间',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_login_history_user_id` (`user_id`),
  KEY `idx_login_history_success` (`is_success`),
  KEY `idx_login_history_created` (`created_at`),
  KEY `idx_login_history_ip` (`ip_address`),
  CONSTRAINT `fk_login_history_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='登录历史表';

-- =============================================
-- 6. JWT令牌黑名单表 (token_blacklist)
-- =============================================
DROP TABLE IF EXISTS `token_blacklist`;
CREATE TABLE `token_blacklist` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '记录ID',
  `token_id` varchar(100) NOT NULL COMMENT '令牌ID',
  `user_id` int NOT NULL COMMENT '用户ID',
  `token_type` varchar(20) NOT NULL COMMENT '令牌类型',
  `expires_at` timestamp NOT NULL COMMENT '过期时间',
  `reason` varchar(100) DEFAULT NULL COMMENT '加入黑名单原因',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_token_blacklist_token_id` (`token_id`),
  KEY `idx_token_blacklist_user_id` (`user_id`),
  KEY `idx_token_blacklist_expires` (`expires_at`),
  KEY `idx_token_blacklist_type` (`token_type`),
  CONSTRAINT `fk_token_blacklist_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='JWT令牌黑名单表';

-- =============================================
-- 7. 用户反馈表 (user_feedback)
-- =============================================
DROP TABLE IF EXISTS `user_feedback`;
CREATE TABLE `user_feedback` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '反馈ID',
  `user_id` int DEFAULT NULL COMMENT '用户ID',
  `type` varchar(20) NOT NULL COMMENT '反馈类型',
  `category` varchar(50) DEFAULT NULL COMMENT '反馈分类',
  `title` varchar(200) NOT NULL COMMENT '反馈标题',
  `content` text NOT NULL COMMENT '反馈内容',
  `contact_info` varchar(100) DEFAULT NULL COMMENT '联系方式',
  `attachments` json COMMENT '附件列表',
  `status` tinyint NOT NULL DEFAULT '1' COMMENT '状态 1-待处理 2-处理中 3-已解决 4-已关闭',
  `priority` tinyint NOT NULL DEFAULT '2' COMMENT '优先级 1-低 2-中 3-高 4-紧急',
  `assigned_to` int DEFAULT NULL COMMENT '分配给谁处理',
  `response` text COMMENT '回复内容',
  `resolved_at` timestamp NULL DEFAULT NULL COMMENT '解决时间',
  `ip_address` varchar(45) DEFAULT NULL COMMENT 'IP地址',
  `user_agent` text COMMENT '用户代理',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_feedback_user_id` (`user_id`),
  KEY `idx_feedback_type` (`type`),
  KEY `idx_feedback_status` (`status`),
  KEY `idx_feedback_priority` (`priority`),
  KEY `idx_feedback_assigned` (`assigned_to`),
  KEY `idx_feedback_created` (`created_at`),
  CONSTRAINT `fk_feedback_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_feedback_assigned` FOREIGN KEY (`assigned_to`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户反馈表';

-- =============================================
-- 8. 系统配置表 (system_config)
-- =============================================
DROP TABLE IF EXISTS `system_config`;
CREATE TABLE `system_config` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '配置ID',
  `key` varchar(100) NOT NULL COMMENT '配置键',
  `value` text COMMENT '配置值',
  `type` varchar(20) NOT NULL DEFAULT 'string' COMMENT '值类型',
  `category` varchar(50) DEFAULT NULL COMMENT '配置分类',
  `description` varchar(255) DEFAULT NULL COMMENT '配置描述',
  `is_public` tinyint(1) NOT NULL DEFAULT '0' COMMENT '是否公开',
  `is_editable` tinyint(1) NOT NULL DEFAULT '1' COMMENT '是否可编辑',
  `sort_order` int NOT NULL DEFAULT '0' COMMENT '排序顺序',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_config_key` (`key`),
  KEY `idx_config_category` (`category`),
  KEY `idx_config_public` (`is_public`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='系统配置表';

-- =============================================
-- 插入默认数据
-- =============================================

-- 插入默认角色
INSERT INTO `roles` (`name`, `display_name`, `description`, `permissions`, `is_system`, `level`, `sort_order`) VALUES
('super_admin', '超级管理员', '系统超级管理员，拥有所有权限', '["*"]', 1, 1, 1),
('admin', '管理员', '系统管理员，拥有大部分管理权限', '["admin.*", "user.*", "role.*"]', 1, 2, 2),
('moderator', '协调员', '内容协调员，拥有内容管理权限', '["content.*", "user.view", "user.edit"]', 1, 3, 3),
('user', '普通用户', '普通用户，基础权限', '["profile.*", "api.*"]', 1, 4, 4),
('guest', '访客', '访客用户，只读权限', '["api.read"]', 1, 5, 5);

-- 插入默认超级管理员用户（密码：admin123456）
INSERT INTO `users` (`username`, `email`, `password_hash`, `salt`, `nickname`, `status`, `email_verified`, `created_at`) VALUES
('admin', 'admin@example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6hsP1LkgTa', 'default_salt', '系统管理员', 1, 1, CURRENT_TIMESTAMP);

-- 为超级管理员分配角色
INSERT INTO `user_roles` (`user_id`, `role_id`, `assigned_by`) VALUES
(1, 1, 1);

-- 插入默认系统配置
INSERT INTO `system_config` (`key`, `value`, `type`, `category`, `description`, `is_public`) VALUES
('site_name', 'Express API Framework', 'string', 'general', '网站名称', 1),
('site_description', '企业级Node.js后端API框架', 'string', 'general', '网站描述', 1),
('allow_registration', 'true', 'boolean', 'auth', '是否允许用户注册', 0),
('email_verification_required', 'false', 'boolean', 'auth', '注册是否需要邮箱验证', 0),
('max_login_attempts', '5', 'number', 'security', '最大登录尝试次数', 0),
('account_lock_duration', '3600', 'number', 'security', '账户锁定时长（秒）', 0),
('password_min_length', '6', 'number', 'security', '密码最小长度', 0),
('jwt_expires_in', '24h', 'string', 'auth', 'JWT过期时间', 0),
('admin_jwt_expires_in', '2h', 'string', 'auth', '管理端JWT过期时间', 0),
('file_upload_max_size', '10485760', 'number', 'upload', '文件上传最大大小（字节）', 0);

-- =============================================
-- 创建视图
-- =============================================

-- 用户详细信息视图
CREATE VIEW `user_details` AS
SELECT 
  u.id,
  u.username,
  u.email,
  u.phone,
  u.nickname,
  u.real_name,
  u.avatar_url,
  u.gender,
  u.birthday,
  u.status,
  u.email_verified,
  u.phone_verified,
  u.login_count,
  u.last_login_at,
  u.last_login_ip,
  u.created_at,
  u.updated_at,
  GROUP_CONCAT(r.name) as roles,
  GROUP_CONCAT(r.display_name) as role_names
FROM users u
LEFT JOIN user_roles ur ON u.id = ur.user_id AND ur.is_active = 1
LEFT JOIN roles r ON ur.role_id = r.id AND r.is_active = 1
WHERE u.deleted_at IS NULL
GROUP BY u.id;

-- =============================================
-- 创建触发器
-- =============================================

-- 用户登录次数更新触发器
DELIMITER $$
CREATE TRIGGER `update_login_count` 
AFTER INSERT ON `login_history`
FOR EACH ROW
BEGIN
  IF NEW.is_success = 1 THEN
    UPDATE users 
    SET login_count = login_count + 1,
        last_login_at = NEW.created_at,
        last_login_ip = NEW.ip_address
    WHERE id = NEW.user_id;
  END IF;
END$$
DELIMITER ;

-- 清理过期的黑名单令牌事件
SET GLOBAL event_scheduler = ON;

DELIMITER $$
CREATE EVENT IF NOT EXISTS `cleanup_expired_tokens`
ON SCHEDULE EVERY 1 HOUR
DO
BEGIN
  DELETE FROM token_blacklist WHERE expires_at < NOW();
END$$
DELIMITER ;

-- =============================================
-- 设置权限和索引优化
-- =============================================

-- 分析表以优化查询性能
ANALYZE TABLE users, roles, user_roles, wechat_users, login_history, token_blacklist, user_feedback, system_config;

-- 恢复外键检查
SET FOREIGN_KEY_CHECKS = 1;

-- 显示创建结果
SELECT 'Database initialization completed successfully!' as result; 