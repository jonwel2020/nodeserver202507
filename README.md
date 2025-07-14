# 🚀 Express API Framework

[![Node.js Version](https://img.shields.io/badge/node-%3E%3D%2016.0.0-brightgreen.svg)](https://nodejs.org/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Test Coverage](https://img.shields.io/badge/coverage-80%25-green.svg)](https://github.com/yourusername/express-api-framework)

一个完整的企业级 Node.js + Express + MySQL 后端API服务框架，专为小程序端和后台管理端提供数据支持而设计。采用双端完全隔离架构，支持快速业务开发和部署。

## ✨ 项目特色

### 🔐 双端完全隔离架构
- **小程序端** (`/api/*`): 24小时Token过期，基础权限验证，用户只能操作自己的数据
- **管理端** (`/admin/*`): 2小时Token过期，严格权限验证和IP白名单，完整CRUD权限
- **独立认证机制**: 不同的JWT密钥和过期时间，降低跨端攻击风险

### 🏗️ 企业级架构设计
- **分层架构**: Routes → Controllers → Services → Repository → Model
- **模块化设计**: 按功能模块组织代码，易于维护和扩展
- **统一响应格式**: 标准化API响应，包含完整分页信息
- **完善状态码体系**: 包含自定义业务状态码（6xx系列）

### 🛡️ 安全防护特性
- **JWT双Token机制**: AccessToken + RefreshToken
- **密码安全**: bcrypt加密 + 强度验证
- **登录保护**: 失败锁定机制（5次失败自动锁定）
- **API限流**: 智能限流策略，支持VIP用户动态调整
- **输入验证**: 全面的数据验证和SQL注入防护
- **敏感信息脱敏**: 自动脱敏处理

### 🚄 性能优化
- **数据库优化**: 读写分离配置，连接池管理
- **多级缓存**: Redis + 本地缓存策略
- **分布式锁**: 支持并发控制
- **查询优化**: 避免N+1查询，索引优化

## 🛠️ 技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| **Node.js** | ≥16.0.0 | 运行环境 |
| **Express.js** | ^4.18.0 | Web框架 |
| **MySQL** | ≥8.0 | 主数据库 |
| **Redis** | ≥6.0 | 缓存数据库 |
| **JWT** | ^9.0.0 | 认证授权 |
| **bcryptjs** | ^2.4.3 | 密码加密 |
| **Joi** | ^17.9.0 | 数据验证 |
| **Winston** | ^3.10.0 | 日志系统 |
| **Jest** | ^29.6.0 | 测试框架 |

## 📁 项目结构

```
express-api-framework/
├── src/                        # 源代码
│   ├── config/                 # 配置文件
│   │   ├── database.js         # 数据库配置（支持读写分离）
│   │   ├── redis.js            # Redis配置
│   │   ├── logger.js           # 日志配置
│   │   └── index.js            # 统一配置导出
│   ├── controllers/            # 控制器层
│   │   ├── base/               # 基础控制器
│   │   ├── api/                # 小程序端控制器
│   │   └── admin/              # 管理端控制器
│   ├── services/               # 服务层（业务逻辑）
│   ├── repositories/           # 数据访问层
│   ├── models/                 # 数据模型
│   ├── dto/                    # 数据传输对象
│   ├── validators/             # 数据验证器
│   ├── middleware/             # 中间件
│   ├── routes/                 # 路由定义
│   ├── utils/                  # 工具函数
│   ├── constants/              # 常量定义
│   └── app.js                  # 应用入口
├── tests/                      # 测试文件
│   ├── unit/                   # 单元测试
│   ├── integration/            # 集成测试
│   ├── fixtures/               # 测试数据
│   └── helpers/                # 测试辅助工具
├── scripts/                    # 脚本文件
│   ├── init-database.sql       # 数据库初始化脚本
│   ├── init-database.js        # 数据库初始化Node.js脚本
│   └── seed-data.js            # 测试数据脚本
├── docs/                       # 文档
│   ├── api.md                  # API文档
│   └── deployment.md           # 部署文档
├── logs/                       # 日志文件（运行时生成）
├── uploads/                    # 上传文件（运行时生成）
├── .env.example                # 环境变量示例
├── jest.config.js              # Jest测试配置
├── package.json                # 项目配置
├── server.js                   # 服务器入口
└── README.md                   # 项目说明
```

## 🚀 快速开始

### 1. 环境要求
- Node.js >= 16.0.0
- MySQL >= 8.0
- Redis >= 6.0
- npm >= 8.0.0

### 2. 克隆项目
```bash
git clone https://github.com/yourusername/express-api-framework.git
cd express-api-framework
```

### 3. 安装依赖
```bash
npm install
```

### 4. 环境配置
```bash
# 复制环境变量示例文件
cp .env.example .env

# 编辑环境变量
vim .env
```

### 5. 数据库初始化
```bash
# 初始化数据库结构
npm run db:init

# 插入测试数据（可选）
npm run db:seed
```

### 6. 启动服务
```bash
# 开发环境（热重载）
npm run dev

# 生产环境
npm start
```

### 7. 验证安装
```bash
# 健康检查
curl http://localhost:3000/health

# 预期响应：
# {
#   "status": "ok",
#   "timestamp": "2025-01-21T10:00:00.000Z",
#   "uptime": 1.234,
#   "environment": "development"
# }
```

## 📖 使用指南

### 🔑 认证系统

#### 小程序端认证示例
```bash
# 用户注册
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "Test123456",
    "phone": "13800138000",
    "nickname": "测试用户"
  }'

# 用户登录
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123456"
  }'

# 获取用户信息
curl -X GET http://localhost:3000/api/auth/profile \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

#### 管理端认证示例
```bash
# 管理员登录
curl -X POST http://localhost:3000/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "Admin123456"
  }'

# 获取用户列表
curl -X GET "http://localhost:3000/admin/users?page=1&pageSize=10" \
  -H "Authorization: Bearer YOUR_ADMIN_ACCESS_TOKEN"
```

### 📊 分页查询
```bash
# 带搜索和排序的分页查询
curl -X GET "http://localhost:3000/admin/users?page=1&pageSize=10&search=test&sortBy=created_at&sortOrder=desc" \
  -H "Authorization: Bearer YOUR_ADMIN_ACCESS_TOKEN"

# 响应格式：
# {
#   "code": 200,
#   "message": "获取成功",
#   "data": {
#     "items": [...],
#     "pagination": {
#       "total": 100,
#       "total_pages": 10,
#       "current_page": 1,
#       "page_size": 10,
#       "has_previous": false,
#       "has_next": true,
#       "is_first_page": true,
#       "is_last_page": false
#     }
#   }
# }
```

### 🔒 权限控制

#### 基于角色的权限控制（RBAC）
```javascript
// 权限定义示例
const PERMISSIONS = {
  USER_READ: 'user:read',
  USER_WRITE: 'user:write',
  USER_DELETE: 'user:delete',
  ADMIN_PANEL: 'admin:panel'
};

// 角色权限映射
const ROLES = {
  USER: {
    name: 'user',
    permissions: ['user:read']
  },
  ADMIN: {
    name: 'admin',
    permissions: ['user:read', 'user:write', 'user:delete', 'admin:panel']
  }
};
```

## 🧪 测试

### 运行测试
```bash
# 运行所有测试
npm test

# 运行并监听文件变化
npm run test:watch

# 生成覆盖率报告
npm run test:coverage

# 运行特定测试文件
npm test auth.test.js
```

### 测试覆盖率
- 目标覆盖率：80%
- 包含单元测试和集成测试
- 自动生成HTML覆盖率报告

## 📝 开发指南

### 添加新功能模块

#### 1. 创建模型和DTO
```javascript
// src/models/Product.js
class Product extends BaseModel {
  constructor() {
    super('products');
  }
}

// src/dto/ProductDto.js
class CreateProductDto {
  constructor() {
    this.schema = Joi.object({
      name: Joi.string().min(2).max(100).required(),
      price: Joi.number().positive().required(),
      description: Joi.string().max(500)
    });
  }
}
```

#### 2. 创建Repository和Service
```javascript
// src/repositories/ProductRepository.js
class ProductRepository extends BaseRepository {
  constructor() {
    super(new Product());
  }
}

// src/services/ProductService.js
class ProductService extends BaseService {
  constructor() {
    super(new ProductRepository());
  }
}
```

#### 3. 创建控制器和路由
```javascript
// src/controllers/api/ProductController.js
class ProductController extends BaseController {
  constructor() {
    super(new ProductService());
  }
}

// src/routes/api/products.js
const router = express.Router();
const controller = new ProductController();

router.get('/', controller.getAll.bind(controller));
router.post('/', validateProduct, controller.create.bind(controller));

module.exports = router;
```

### 数据库迁移
```bash
# 创建新的迁移文件
npm run migration:create add_products_table

# 运行迁移
npm run migration:up

# 回滚迁移
npm run migration:down
```

## 🌐 API文档

详细的API文档请参阅 [API Documentation](docs/api.md)

### 主要接口概览

| 分类 | 方法 | 路径 | 描述 |
|------|------|------|------|
| **小程序端认证** | POST | `/api/auth/register` | 用户注册 |
| | POST | `/api/auth/login` | 用户登录 |
| | GET | `/api/auth/profile` | 获取用户信息 |
| | POST | `/api/auth/logout` | 用户登出 |
| **小程序端用户** | GET | `/api/users/profile` | 获取个人信息 |
| | PUT | `/api/users/profile` | 更新个人信息 |
| | PUT | `/api/users/change-password` | 修改密码 |
| **管理端认证** | POST | `/admin/auth/login` | 管理员登录 |
| | GET | `/admin/auth/verify` | 身份验证 |
| **管理端用户** | GET | `/admin/users` | 获取用户列表 |
| | POST | `/admin/users` | 创建用户 |
| | PUT | `/admin/users/:id` | 更新用户 |
| | DELETE | `/admin/users/:id` | 删除用户 |
| **系统管理** | GET | `/health` | 健康检查 |
| | GET | `/admin/metrics` | 系统指标 |

## 🚢 部署

详细的部署指南请参阅 [Deployment Guide](docs/deployment.md)

### Docker部署
```bash
# 构建镜像
docker build -t express-api-framework .

# 运行容器
docker run -d -p 3000:3000 --name api-server express-api-framework

# 使用Docker Compose
docker-compose up -d
```

### PM2部署
```bash
# 安装PM2
npm install -g pm2

# 启动应用
pm2 start ecosystem.config.js

# 查看状态
pm2 status

# 查看日志
pm2 logs
```

## 📊 监控和日志

### 日志系统
- **分级记录**: error, warn, info, debug
- **结构化格式**: JSON格式，便于解析
- **按日期轮转**: 防止日志文件过大
- **敏感信息脱敏**: 自动处理敏感数据

### 监控指标
- **系统指标**: CPU、内存、磁盘使用率
- **应用指标**: 请求量、响应时间、错误率
- **数据库指标**: 连接数、查询时间、慢查询
- **缓存指标**: 命中率、连接状态

## 🤝 贡献指南

我们欢迎任何形式的贡献，包括但不限于：

1. **报告问题**: 提交bug报告或功能请求
2. **代码贡献**: 提交Pull Request
3. **文档改进**: 完善项目文档
4. **测试用例**: 增加测试覆盖率

### 贡献流程
1. Fork项目
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建Pull Request

### 代码规范
- 遵循ESLint配置
- 使用Prettier格式化代码
- 添加必要的JSDoc注释
- 保持测试覆盖率80%以上

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 🙏 致谢

感谢以下开源项目的支持：
- [Express.js](https://expressjs.com/) - Web框架
- [MySQL](https://www.mysql.com/) - 数据库
- [Redis](https://redis.io/) - 缓存
- [JWT](https://jwt.io/) - 认证
- [Jest](https://jestjs.io/) - 测试框架

## 📞 联系我们

- **项目主页**: https://github.com/yourusername/express-api-framework
- **问题反馈**: https://github.com/yourusername/express-api-framework/issues
- **邮箱**: your-email@example.com

---

⭐ 如果这个项目对你有帮助，请给我们一个Star！ 