# 📖 API 接口文档

本文档详细描述了 Express API Framework 的所有API接口，包括请求参数、响应格式、错误码等信息。

## 📋 目录

- [基础信息](#基础信息)
- [认证说明](#认证说明)
- [错误处理](#错误处理)
- [小程序端API](#小程序端api)
  - [认证相关](#小程序端认证相关)
  - [用户管理](#小程序端用户管理)
- [管理端API](#管理端api)
  - [认证相关](#管理端认证相关)
  - [用户管理](#管理端用户管理)
- [系统管理](#系统管理)

## 🔧 基础信息

### 请求基础信息
- **协议**: HTTP/HTTPS
- **请求头**: `Content-Type: application/json`
- **编码**: UTF-8
- **API版本**: v1

### 服务器信息
- **开发环境**: `http://localhost:3000`
- **生产环境**: `https://api.yourdomain.com`

### 响应格式
所有API接口返回统一的JSON格式：

```json
{
  "code": 200,
  "message": "操作成功",
  "data": {},
  "timestamp": "2025-01-21T10:00:00.000Z"
}
```

## 🔐 认证说明

### 小程序端认证
- **Token类型**: JWT
- **过期时间**: 24小时
- **请求头**: `Authorization: Bearer <token>`
- **权限范围**: 用户只能操作自己的数据

### 管理端认证
- **Token类型**: JWT
- **过期时间**: 2小时
- **请求头**: `Authorization: Bearer <token>`
- **权限范围**: 管理员可操作所有用户数据
- **IP白名单**: 支持IP地址限制

## ❌ 错误处理

### HTTP状态码

| 状态码 | 说明 | 示例 |
|--------|------|------|
| 200 | 请求成功 | 正常获取数据 |
| 201 | 创建成功 | 用户注册成功 |
| 400 | 请求参数错误 | 缺少必需参数 |
| 401 | 未授权 | Token无效或过期 |
| 403 | 权限不足 | 无访问权限 |
| 404 | 资源不存在 | 用户ID不存在 |
| 409 | 资源冲突 | 邮箱已被注册 |
| 422 | 数据验证失败 | 邮箱格式错误 |
| 429 | 请求过频 | 触发限流保护 |
| 500 | 服务器错误 | 内部系统错误 |

### 自定义业务状态码

| 状态码 | 说明 | 示例 |
|--------|------|------|
| 600 | 业务逻辑错误 | 余额不足 |
| 601 | 数据验证错误 | 表单验证失败 |
| 602 | 数据库错误 | 数据库连接失败 |

### 错误响应格式

```json
{
  "code": 400,
  "message": "参数错误",
  "error": "详细错误描述",
  "timestamp": "2025-01-21T10:00:00.000Z"
}
```

---

## 📱 小程序端API

### 小程序端认证相关

#### POST /api/auth/register
用户注册

**请求参数:**
```json
{
  "username": "testuser",       // 必需，用户名，3-20字符
  "email": "test@example.com",  // 必需，邮箱
  "password": "Test123456",     // 必需，密码，8-20字符，包含字母数字
  "phone": "13800138000",       // 可选，手机号
  "nickname": "测试用户"        // 可选，昵称
}
```

**成功响应:**
```json
{
  "code": 201,
  "message": "注册成功",
  "data": {
    "user": {
      "id": 1,
      "username": "testuser",
      "email": "test@example.com",
      "nickname": "测试用户",
      "phone": "13800138000",
      "status": 1,
      "created_at": "2025-01-21T10:00:00.000Z"
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
  }
}
```

**错误响应:**
```json
{
  "code": 409,
  "message": "邮箱已被注册",
  "timestamp": "2025-01-21T10:00:00.000Z"
}
```

#### POST /api/auth/login
用户登录

**请求参数:**
```json
{
  "email": "test@example.com",  // 必需，邮箱
  "password": "Test123456"      // 必需，密码
}
```

**成功响应:**
```json
{
  "code": 200,
  "message": "登录成功",
  "data": {
    "user": {
      "id": 1,
      "username": "testuser",
      "email": "test@example.com",
      "nickname": "测试用户",
      "avatar": null,
      "last_login_at": "2025-01-21T10:00:00.000Z"
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
  }
}
```

#### POST /api/auth/wechat-login
微信登录

**请求参数:**
```json
{
  "code": "wx_auth_code",      // 必需，微信授权码
  "userInfo": {               // 可选，微信用户信息
    "nickname": "微信用户",
    "avatar": "https://...",
    "gender": 1
  }
}
```

#### GET /api/auth/profile
获取用户信息

**请求头:**
```
Authorization: Bearer <access_token>
```

**成功响应:**
```json
{
  "code": 200,
  "message": "获取成功",
  "data": {
    "id": 1,
    "username": "testuser",
    "email": "test@example.com",
    "nickname": "测试用户",
    "avatar": "https://example.com/avatar.jpg",
    "phone": "13800138000",
    "gender": 1,
    "birthday": "1990-01-01",
    "bio": "个人简介",
    "email_verified": 1,
    "phone_verified": 1,
    "settings": {
      "privacy": {
        "show_phone": false,
        "show_email": false
      },
      "notification": {
        "email_enabled": true,
        "push_enabled": true
      }
    },
    "created_at": "2025-01-21T10:00:00.000Z"
  }
}
```

#### POST /api/auth/refresh
刷新Token

**请求参数:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**成功响应:**
```json
{
  "code": 200,
  "message": "刷新成功",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

#### POST /api/auth/logout
用户登出

**请求头:**
```
Authorization: Bearer <access_token>
```

**请求参数:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."  // 可选
}
```

#### POST /api/auth/forgot-password
忘记密码

**请求参数:**
```json
{
  "email": "test@example.com"  // 必需，邮箱
}
```

#### POST /api/auth/reset-password
重置密码

**请求参数:**
```json
{
  "token": "reset_token",      // 必需，重置令牌
  "password": "NewPassword123" // 必需，新密码
}
```

### 小程序端用户管理

#### GET /api/users/profile
获取个人信息

**请求头:**
```
Authorization: Bearer <access_token>
```

**成功响应:**
```json
{
  "code": 200,
  "message": "获取成功",
  "data": {
    "id": 1,
    "username": "testuser",
    "email": "test@example.com",
    "nickname": "测试用户",
    "avatar": "https://example.com/avatar.jpg",
    "phone": "13800138000",
    "gender": 1,
    "birthday": "1990-01-01",
    "bio": "个人简介",
    "email_verified": 1,
    "phone_verified": 1
  }
}
```

#### PUT /api/users/profile
更新个人信息

**请求头:**
```
Authorization: Bearer <access_token>
```

**请求参数:**
```json
{
  "nickname": "新昵称",        // 可选，昵称
  "gender": 2,               // 可选，性别 0:未知 1:男 2:女
  "birthday": "1990-01-01",  // 可选，生日
  "bio": "新的个人简介"       // 可选，个人简介
}
```

#### POST /api/users/upload-avatar
上传头像

**请求头:**
```
Authorization: Bearer <access_token>
Content-Type: multipart/form-data
```

**请求参数:**
```
avatar: <file>  // 必需，头像文件，支持jpg、png、gif格式，最大5MB
```

**成功响应:**
```json
{
  "code": 200,
  "message": "头像上传成功",
  "data": {
    "avatar": "https://example.com/uploads/avatars/user_1_20250121.jpg"
  }
}
```

#### DELETE /api/users/avatar
删除头像

**请求头:**
```
Authorization: Bearer <access_token>
```

#### PUT /api/users/change-password
修改密码

**请求头:**
```
Authorization: Bearer <access_token>
```

**请求参数:**
```json
{
  "currentPassword": "OldPassword123",  // 必需，当前密码
  "newPassword": "NewPassword123"       // 必需，新密码
}
```

#### POST /api/users/bind-phone
绑定手机号

**请求头:**
```
Authorization: Bearer <access_token>
```

**请求参数:**
```json
{
  "phone": "13800138000",    // 必需，手机号
  "smsCode": "123456"        // 必需，短信验证码
}
```

#### POST /api/users/verify-phone
验证手机号

**请求头:**
```
Authorization: Bearer <access_token>
```

**请求参数:**
```json
{
  "phone": "13800138000",    // 必需，手机号
  "smsCode": "123456"        // 必需，短信验证码
}
```

#### PUT /api/users/update-phone
更新手机号

**请求头:**
```
Authorization: Bearer <access_token>
```

**请求参数:**
```json
{
  "newPhone": "13900139000", // 必需，新手机号
  "smsCode": "123456"        // 必需，短信验证码
}
```

#### POST /api/users/bind-wechat
绑定微信

**请求头:**
```
Authorization: Bearer <access_token>
```

**请求参数:**
```json
{
  "code": "wx_auth_code"     // 必需，微信授权码
}
```

#### DELETE /api/users/unbind-wechat
解绑微信

**请求头:**
```
Authorization: Bearer <access_token>
```

#### GET /api/users/settings
获取用户设置

**请求头:**
```
Authorization: Bearer <access_token>
```

**成功响应:**
```json
{
  "code": 200,
  "message": "获取成功",
  "data": {
    "privacy": {
      "show_phone": false,
      "show_email": false,
      "show_real_name": false
    },
    "notification": {
      "email_enabled": true,
      "push_enabled": true,
      "sms_enabled": false
    },
    "security": {
      "two_factor_enabled": false,
      "login_notification": true
    }
  }
}
```

#### PUT /api/users/settings
更新用户设置

**请求头:**
```
Authorization: Bearer <access_token>
```

**请求参数:**
```json
{
  "privacy": {
    "show_phone": false,
    "show_email": false
  },
  "notification": {
    "email_enabled": true,
    "push_enabled": false
  }
}
```

#### POST /api/users/deactivate
注销/停用账户

**请求头:**
```
Authorization: Bearer <access_token>
```

**请求参数:**
```json
{
  "reason": "不再需要此账户",  // 可选，注销原因
  "password": "Password123"   // 必需，确认密码
}
```

#### GET /api/users/login-history
登录历史记录

**请求头:**
```
Authorization: Bearer <access_token>
```

**查询参数:**
- `page`: 页码（默认1）
- `pageSize`: 每页条数（默认10）

**成功响应:**
```json
{
  "code": 200,
  "message": "获取成功",
  "data": {
    "items": [
      {
        "id": 1,
        "ip": "192.168.1.100",
        "user_agent": "Mozilla/5.0...",
        "device_type": "mobile",
        "location": "北京市",
        "success": 1,
        "created_at": "2025-01-21T10:00:00.000Z"
      }
    ],
    "pagination": {
      "total": 50,
      "total_pages": 5,
      "current_page": 1,
      "page_size": 10,
      "has_previous": false,
      "has_next": true,
      "is_first_page": true,
      "is_last_page": false
    }
  }
}
```

#### POST /api/users/feedback
用户反馈

**请求头:**
```
Authorization: Bearer <access_token>
```

**请求参数:**
```json
{
  "type": "bug",              // 必需，反馈类型：bug、suggestion、complaint
  "title": "登录页面问题",     // 必需，反馈标题
  "content": "详细描述...",    // 必需，反馈内容
  "contact": "user@email.com" // 可选，联系方式
}
```

#### DELETE /api/users/delete-data
删除个人数据（GDPR合规）

**请求头:**
```
Authorization: Bearer <access_token>
```

**请求参数:**
```json
{
  "password": "Password123",   // 必需，确认密码
  "dataTypes": [              // 必需，要删除的数据类型
    "profile",
    "loginHistory",
    "feedback"
  ]
}
```

---

## 🔧 管理端API

### 管理端认证相关

#### POST /admin/auth/login
管理员登录

**请求参数:**
```json
{
  "email": "admin@example.com",  // 必需，管理员邮箱
  "password": "Admin123456"       // 必需，密码
}
```

**成功响应:**
```json
{
  "code": 200,
  "message": "登录成功",
  "data": {
    "admin": {
      "id": 1,
      "email": "admin@example.com",
      "nickname": "系统管理员",
      "roles": ["admin"],
      "permissions": ["user:read", "user:write", "user:delete"]
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
  }
}
```

#### POST /admin/auth/logout
管理员登出

**请求头:**
```
Authorization: Bearer <admin_access_token>
```

#### POST /admin/auth/refresh
刷新管理员Token

**请求参数:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### GET /admin/auth/verify
验证管理员身份

**请求头:**
```
Authorization: Bearer <admin_access_token>
```

### 管理端用户管理

#### GET /admin/users
获取用户列表

**请求头:**
```
Authorization: Bearer <admin_access_token>
```

**查询参数:**
- `page`: 页码（默认1）
- `pageSize`: 每页条数（默认10，最大100）
- `search`: 搜索关键词（用户名、邮箱、昵称）
- `status`: 用户状态（0:禁用 1:正常）
- `email_verified`: 邮箱验证状态（0:未验证 1:已验证）
- `sortBy`: 排序字段（id、created_at、last_login_at）
- `sortOrder`: 排序方向（asc、desc）
- `startDate`: 注册开始日期
- `endDate`: 注册结束日期

**成功响应:**
```json
{
  "code": 200,
  "message": "获取成功",
  "data": {
    "items": [
      {
        "id": 1,
        "username": "testuser",
        "email": "test@example.com",
        "nickname": "测试用户",
        "phone": "13800138000",
        "status": 1,
        "email_verified": 1,
        "phone_verified": 1,
        "login_attempts": 0,
        "last_login_at": "2025-01-21T10:00:00.000Z",
        "last_login_ip": "192.168.1.100",
        "created_at": "2025-01-20T10:00:00.000Z"
      }
    ],
    "pagination": {
      "total": 100,
      "total_pages": 10,
      "current_page": 1,
      "page_size": 10,
      "has_previous": false,
      "has_next": true,
      "is_first_page": true,
      "is_last_page": false
    }
  }
}
```

#### GET /admin/users/:id
获取单个用户详情

**请求头:**
```
Authorization: Bearer <admin_access_token>
```

**路径参数:**
- `id`: 用户ID

**成功响应:**
```json
{
  "code": 200,
  "message": "获取成功",
  "data": {
    "id": 1,
    "username": "testuser",
    "email": "test@example.com",
    "nickname": "测试用户",
    "avatar": "https://example.com/avatar.jpg",
    "phone": "13800138000",
    "gender": 1,
    "birthday": "1990-01-01",
    "bio": "个人简介",
    "status": 1,
    "email_verified": 1,
    "phone_verified": 1,
    "login_attempts": 0,
    "locked_until": null,
    "last_login_at": "2025-01-21T10:00:00.000Z",
    "last_login_ip": "192.168.1.100",
    "wechat_openid": "wx_openid_123",
    "settings": {},
    "created_at": "2025-01-20T10:00:00.000Z",
    "updated_at": "2025-01-21T09:00:00.000Z"
  }
}
```

#### POST /admin/users
创建用户

**请求头:**
```
Authorization: Bearer <admin_access_token>
```

**请求参数:**
```json
{
  "username": "newuser",       // 必需，用户名
  "email": "new@example.com",  // 必需，邮箱
  "password": "Password123",   // 必需，密码
  "nickname": "新用户",        // 可选，昵称
  "phone": "13900139000",      // 可选，手机号
  "gender": 1,                 // 可选，性别
  "status": 1,                 // 可选，状态（默认1）
  "email_verified": 1,         // 可选，邮箱验证状态（默认0）
  "phone_verified": 1          // 可选，手机验证状态（默认0）
}
```

#### PUT /admin/users/:id
更新用户信息

**请求头:**
```
Authorization: Bearer <admin_access_token>
```

**路径参数:**
- `id`: 用户ID

**请求参数:**
```json
{
  "nickname": "新昵称",        // 可选，昵称
  "phone": "13900139000",      // 可选，手机号
  "gender": 2,                 // 可选，性别
  "birthday": "1991-01-01",    // 可选，生日
  "bio": "新的简介",           // 可选，个人简介
  "status": 0,                 // 可选，状态
  "email_verified": 1,         // 可选，邮箱验证状态
  "phone_verified": 1          // 可选，手机验证状态
}
```

#### DELETE /admin/users/:id
删除用户（软删除）

**请求头:**
```
Authorization: Bearer <admin_access_token>
```

**路径参数:**
- `id`: 用户ID

#### DELETE /admin/users/batch
批量删除用户

**请求头:**
```
Authorization: Bearer <admin_access_token>
```

**请求参数:**
```json
{
  "userIds": [1, 2, 3, 4, 5]  // 必需，用户ID数组
}
```

#### GET /admin/users/stats
用户统计数据

**请求头:**
```
Authorization: Bearer <admin_access_token>
```

**成功响应:**
```json
{
  "code": 200,
  "message": "获取成功",
  "data": {
    "total": 1000,              // 总用户数
    "active": 800,              // 活跃用户数
    "inactive": 200,            // 非活跃用户数
    "verified": 750,            // 已验证用户数
    "unverified": 250,          // 未验证用户数
    "new_today": 15,            // 今日新增
    "new_this_week": 85,        // 本周新增
    "new_this_month": 320,      // 本月新增
    "login_today": 120,         // 今日登录
    "gender_stats": {           // 性别统计
      "male": 450,
      "female": 350,
      "unknown": 200
    },
    "daily_stats": [            // 近30天每日新增统计
      {
        "date": "2025-01-21",
        "new_users": 15,
        "active_users": 120
      }
    ]
  }
}
```

#### PUT /admin/users/:id/reset-password
重置用户密码

**请求头:**
```
Authorization: Bearer <admin_access_token>
```

**路径参数:**
- `id`: 用户ID

**请求参数:**
```json
{
  "newPassword": "NewPassword123"  // 必需，新密码
}
```

#### PUT /admin/users/:id/lock
锁定用户账户

**请求头:**
```
Authorization: Bearer <admin_access_token>
```

**路径参数:**
- `id`: 用户ID

**请求参数:**
```json
{
  "reason": "违规操作",           // 必需，锁定原因
  "duration": 24                 // 可选，锁定时长（小时，默认24）
}
```

#### PUT /admin/users/:id/unlock
解锁用户账户

**请求头:**
```
Authorization: Bearer <admin_access_token>
```

**路径参数:**
- `id`: 用户ID

---

## ⚙️ 系统管理

#### GET /health
健康检查

**成功响应:**
```json
{
  "status": "ok",
  "timestamp": "2025-01-21T10:00:00.000Z",
  "uptime": 123.456,
  "environment": "development",
  "version": "1.0.0",
  "services": {
    "database": "connected",
    "redis": "connected"
  }
}
```

#### GET /admin/metrics
系统指标（仅管理端）

**请求头:**
```
Authorization: Bearer <admin_access_token>
```

**成功响应:**
```json
{
  "code": 200,
  "message": "获取成功",
  "data": {
    "system": {
      "cpu_usage": 15.5,         // CPU使用率(%)
      "memory_usage": 65.8,      // 内存使用率(%)
      "disk_usage": 45.2,        // 磁盘使用率(%)
      "load_average": [1.2, 1.1, 1.0]
    },
    "application": {
      "uptime": 86400,           // 运行时间(秒)
      "total_requests": 15420,   // 总请求数
      "error_rate": 0.05,        // 错误率(%)
      "avg_response_time": 120   // 平均响应时间(ms)
    },
    "database": {
      "connections": 8,          // 当前连接数
      "max_connections": 20,     // 最大连接数
      "query_time": 45,          // 平均查询时间(ms)
      "slow_queries": 2          // 慢查询数量
    },
    "redis": {
      "connected_clients": 5,    // 连接客户端数
      "memory_usage": "10.5MB",  // 内存使用量
      "hit_rate": 95.5,          // 命中率(%)
      "ops_per_sec": 1250        // 每秒操作数
    }
  }
}
```

#### POST /admin/cache/clear
清除缓存（仅管理端）

**请求头:**
```
Authorization: Bearer <admin_access_token>
```

**请求参数:**
```json
{
  "type": "all",              // 必需，缓存类型：all、user、auth、system
  "keys": ["user:1", "user:2"] // 可选，指定清除的缓存键
}
```

---

## 📝 备注

1. **时间格式**: 所有时间字段均使用ISO 8601格式 (`YYYY-MM-DDTHH:mm:ss.sssZ`)
2. **分页参数**: 页码从1开始，页大小默认为10，最大为100
3. **文件上传**: 支持的图片格式为jpg、jpeg、png、gif，最大文件大小为5MB
4. **手机号格式**: 支持中国大陆手机号格式验证
5. **密码要求**: 8-20位字符，必须包含字母和数字
6. **Token过期**: 小程序端24小时，管理端2小时，可通过refresh接口刷新

## 🔄 版本更新

- **v1.0.0** (2025-01-21): 初始版本，包含基础认证和用户管理功能

---

📞 **技术支持**: 如有API使用问题，请联系技术支持团队或查看项目GitHub Issues。 