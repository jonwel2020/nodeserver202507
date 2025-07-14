# 🚢 部署指南

本文档详细介绍了 Express API Framework 在不同环境下的部署方式，包括开发环境、测试环境和生产环境的部署配置。

## 📋 目录

- [环境要求](#环境要求)
- [部署前准备](#部署前准备)
- [Docker部署](#docker部署)
- [PM2部署](#pm2部署)
- [云服务器部署](#云服务器部署)
- [负载均衡配置](#负载均衡配置)
- [数据库配置](#数据库配置)
- [Redis配置](#redis配置)
- [监控和日志](#监控和日志)
- [安全配置](#安全配置)
- [性能优化](#性能优化)
- [故障排除](#故障排除)

## 🛠️ 环境要求

### 最低要求
- **操作系统**: Linux (Ubuntu 18.04+, CentOS 7+) / macOS / Windows
- **Node.js**: 16.0.0 或更高版本
- **内存**: 最少 2GB RAM
- **存储**: 最少 10GB 可用空间
- **网络**: 稳定的网络连接

### 推荐配置
- **CPU**: 2核或以上
- **内存**: 4GB RAM 或以上
- **存储**: SSD 硬盘，20GB 以上可用空间
- **数据库**: MySQL 8.0+ 或 MariaDB 10.5+
- **缓存**: Redis 6.0+

### 依赖服务
- **MySQL**: 8.0 或更高版本
- **Redis**: 6.0 或更高版本
- **Nginx**: 1.18+ (生产环境推荐)

## 🔧 部署前准备

### 1. 克隆项目
```bash
git clone https://github.com/yourusername/express-api-framework.git
cd express-api-framework
```

### 2. 安装依赖
```bash
npm install --production
```

### 3. 环境配置
```bash
# 复制环境变量文件
cp .env.example .env

# 编辑环境配置
vim .env
```

### 4. 数据库初始化
```bash
# 创建数据库
mysql -u root -p -e "CREATE DATABASE express_api_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 初始化表结构
npm run db:init

# 创建初始管理员（可选）
npm run db:seed
```

## 🐳 Docker部署

### 1. 创建Dockerfile
项目已包含完整的Dockerfile：

```dockerfile
# 多阶段构建
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

FROM node:18-alpine AS runtime

# 安装必要的系统包
RUN apk add --no-cache dumb-init

# 创建应用用户
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

WORKDIR /app

# 复制应用文件
COPY --from=builder /app/node_modules ./node_modules
COPY --chown=nodejs:nodejs . .

# 创建必要的目录
RUN mkdir -p logs uploads && chown -R nodejs:nodejs /app

# 暴露端口
EXPOSE 3000

# 使用非root用户运行
USER nodejs

# 使用dumb-init处理信号
ENTRYPOINT ["dumb-init", "--"]

# 启动应用
CMD ["node", "server.js"]
```

### 2. 构建镜像
```bash
# 构建生产镜像
docker build -t express-api-framework:latest .

# 构建带版本标签的镜像
docker build -t express-api-framework:v1.0.0 .
```

### 3. 运行容器
```bash
# 单容器运行
docker run -d \
  --name api-server \
  --restart unless-stopped \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e DB_HOST=your-db-host \
  -e DB_PASSWORD=your-db-password \
  -e REDIS_HOST=your-redis-host \
  -v /app/logs:/app/logs \
  -v /app/uploads:/app/uploads \
  express-api-framework:latest
```

### 4. Docker Compose部署
创建`docker-compose.yml`文件：

```yaml
version: '3.8'

services:
  # API服务
  api:
    build: .
    container_name: express-api
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DB_HOST=mysql
      - DB_NAME=express_api_db
      - DB_USER=root
      - DB_PASSWORD=your-secure-password
      - REDIS_HOST=redis
      - JWT_SECRET=your-jwt-secret
      - ADMIN_JWT_SECRET=your-admin-jwt-secret
    volumes:
      - ./logs:/app/logs
      - ./uploads:/app/uploads
    depends_on:
      - mysql
      - redis
    networks:
      - app-network

  # MySQL数据库
  mysql:
    image: mysql:8.0
    container_name: express-mysql
    restart: unless-stopped
    environment:
      - MYSQL_ROOT_PASSWORD=your-secure-password
      - MYSQL_DATABASE=express_api_db
      - MYSQL_CHARACTER_SET_SERVER=utf8mb4
      - MYSQL_COLLATION_SERVER=utf8mb4_unicode_ci
    ports:
      - "3306:3306"
    volumes:
      - mysql_data:/var/lib/mysql
      - ./scripts/init-database.sql:/docker-entrypoint-initdb.d/init.sql
    command: --default-authentication-plugin=mysql_native_password
    networks:
      - app-network

  # Redis缓存
  redis:
    image: redis:7-alpine
    container_name: express-redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes --requirepass your-redis-password
    networks:
      - app-network

  # Nginx反向代理
  nginx:
    image: nginx:alpine
    container_name: express-nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./nginx/ssl:/etc/nginx/ssl
    depends_on:
      - api
    networks:
      - app-network

volumes:
  mysql_data:
  redis_data:

networks:
  app-network:
    driver: bridge
```

### 5. 启动所有服务
```bash
# 启动所有服务
docker-compose up -d

# 查看运行状态
docker-compose ps

# 查看日志
docker-compose logs -f api
```

## ⚡ PM2部署

### 1. 安装PM2
```bash
# 全局安装PM2
npm install -g pm2

# 或者使用yarn
yarn global add pm2
```

### 2. 创建PM2配置文件
创建`ecosystem.config.js`：

```javascript
module.exports = {
  apps: [
    {
      name: 'express-api',
      script: './server.js',
      instances: 'max', // 使用所有CPU核心
      exec_mode: 'cluster',
      
      // 环境变量
      env: {
        NODE_ENV: 'development',
        PORT: 3000
      },
      
      // 生产环境变量
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
        DB_HOST: 'your-db-host',
        DB_PASSWORD: 'your-db-password',
        REDIS_HOST: 'your-redis-host',
        JWT_SECRET: 'your-jwt-secret',
        ADMIN_JWT_SECRET: 'your-admin-jwt-secret'
      },
      
      // 日志配置
      log_file: './logs/combined.log',
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      
      // 进程管理
      min_uptime: '10s',
      max_restarts: 10,
      autorestart: true,
      
      // 监控配置
      watch: false,
      ignore_watch: ['node_modules', 'logs', 'uploads'],
      
      // 内存限制
      max_memory_restart: '500M',
      
      // 其他配置
      source_map_support: true,
      merge_logs: true,
      time: true
    }
  ],

  // 部署配置
  deploy: {
    production: {
      user: 'deploy',
      host: ['your-server-ip'],
      ref: 'origin/main',
      repo: 'git@github.com:yourusername/express-api-framework.git',
      path: '/var/www/express-api',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && npm run db:migrate && pm2 reload ecosystem.config.js --env production',
      'pre-setup': '',
      'ssh_options': 'ForwardAgent=yes'
    }
  }
};
```

### 3. 启动应用
```bash
# 开发环境启动
pm2 start ecosystem.config.js

# 生产环境启动
pm2 start ecosystem.config.js --env production

# 指定实例数量
pm2 start ecosystem.config.js -i 4
```

### 4. PM2常用命令
```bash
# 查看应用状态
pm2 status

# 查看日志
pm2 logs express-api

# 重启应用
pm2 restart express-api

# 停止应用
pm2 stop express-api

# 删除应用
pm2 delete express-api

# 重载应用（零停机）
pm2 reload express-api

# 监控面板
pm2 monit

# 保存PM2配置
pm2 save

# 设置开机自启
pm2 startup
pm2 save
```

## ☁️ 云服务器部署

### 1. 服务器准备（Ubuntu 20.04）

#### 更新系统
```bash
sudo apt update && sudo apt upgrade -y
```

#### 安装Node.js
```bash
# 使用NodeSource仓库
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 验证安装
node --version
npm --version
```

#### 安装MySQL
```bash
# 安装MySQL服务器
sudo apt install mysql-server -y

# 安全配置
sudo mysql_secure_installation

# 创建数据库和用户
sudo mysql -e "CREATE DATABASE express_api_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
sudo mysql -e "CREATE USER 'api_user'@'localhost' IDENTIFIED BY 'secure_password';"
sudo mysql -e "GRANT ALL PRIVILEGES ON express_api_db.* TO 'api_user'@'localhost';"
sudo mysql -e "FLUSH PRIVILEGES;"
```

#### 安装Redis
```bash
# 安装Redis
sudo apt install redis-server -y

# 配置Redis
sudo vim /etc/redis/redis.conf
# 设置密码: requirepass your-secure-password

# 重启Redis
sudo systemctl restart redis-server
sudo systemctl enable redis-server
```

#### 安装Nginx
```bash
# 安装Nginx
sudo apt install nginx -y

# 启动和启用Nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

### 2. 部署应用

#### 创建部署用户
```bash
# 创建部署用户
sudo adduser deploy
sudo usermod -aG sudo deploy

# 切换到部署用户
sudo su - deploy
```

#### 克隆和配置项目
```bash
# 克隆项目
git clone https://github.com/yourusername/express-api-framework.git
cd express-api-framework

# 安装依赖
npm install --production

# 配置环境变量
cp .env.example .env
vim .env

# 初始化数据库
npm run db:init
```

#### 配置Nginx
创建Nginx配置文件`/etc/nginx/sites-available/express-api`：

```nginx
upstream express_api {
    server 127.0.0.1:3000;
    server 127.0.0.1:3001;
    server 127.0.0.1:3002;
    server 127.0.0.1:3003;
}

server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    
    # 重定向到HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;
    
    # SSL配置
    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    
    # 安全头
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
    
    # 日志配置
    access_log /var/log/nginx/express-api.access.log;
    error_log /var/log/nginx/express-api.error.log;
    
    # Gzip压缩
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/json
        application/javascript
        application/xml+rss
        application/atom+xml
        image/svg+xml;
    
    # API代理
    location / {
        proxy_pass http://express_api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
    
    # 静态文件
    location /uploads/ {
        alias /home/deploy/express-api-framework/uploads/;
        expires 30d;
        add_header Cache-Control "public, no-transform";
    }
    
    # 健康检查
    location /health {
        access_log off;
        proxy_pass http://express_api;
    }
}
```

#### 启用Nginx配置
```bash
# 创建软链接
sudo ln -s /etc/nginx/sites-available/express-api /etc/nginx/sites-enabled/

# 测试配置
sudo nginx -t

# 重启Nginx
sudo systemctl restart nginx
```

### 3. SSL证书配置

#### 使用Let's Encrypt
```bash
# 安装Certbot
sudo apt install certbot python3-certbot-nginx -y

# 获取SSL证书
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# 自动续期测试
sudo certbot renew --dry-run
```

### 4. 防火墙配置
```bash
# 启用UFW
sudo ufw enable

# 允许SSH
sudo ufw allow ssh

# 允许HTTP和HTTPS
sudo ufw allow 'Nginx Full'

# 允许MySQL（如果需要远程连接）
sudo ufw allow 3306/tcp

# 查看状态
sudo ufw status
```

## ⚖️ 负载均衡配置

### 1. 多实例部署
```bash
# 使用PM2集群模式
pm2 start ecosystem.config.js -i max

# 或手动指定实例数
pm2 start server.js -i 4 --name "express-api"
```

### 2. Nginx负载均衡
```nginx
upstream express_api {
    least_conn;  # 负载均衡算法
    server 127.0.0.1:3000 weight=1 max_fails=3 fail_timeout=30s;
    server 127.0.0.1:3001 weight=1 max_fails=3 fail_timeout=30s;
    server 127.0.0.1:3002 weight=1 max_fails=3 fail_timeout=30s;
    server 127.0.0.1:3003 weight=1 max_fails=3 fail_timeout=30s;
    
    # 备用服务器
    server 127.0.0.1:3004 backup;
}
```

### 3. 健康检查
```nginx
location /health {
    access_log off;
    proxy_pass http://express_api;
    proxy_next_upstream error timeout invalid_header http_500 http_502 http_503;
}
```

## 🗄️ 数据库配置

### 1. 主从复制配置

#### 主库配置 (master)
编辑`/etc/mysql/mysql.conf.d/mysqld.cnf`：
```ini
[mysqld]
server-id = 1
log-bin = mysql-bin
binlog-do-db = express_api_db
```

#### 从库配置 (slave)
编辑`/etc/mysql/mysql.conf.d/mysqld.cnf`：
```ini
[mysqld]
server-id = 2
relay-log = mysql-relay-bin
log-bin = mysql-bin
binlog-do-db = express_api_db
```

#### 创建复制用户
```sql
-- 在主库执行
CREATE USER 'replica'@'%' IDENTIFIED BY 'replica_password';
GRANT REPLICATION SLAVE ON *.* TO 'replica'@'%';
FLUSH PRIVILEGES;
FLUSH TABLES WITH READ LOCK;
SHOW MASTER STATUS;
```

### 2. 数据库连接池优化
```javascript
// 生产环境数据库配置
const dbConfig = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  
  // 连接池配置
  connectionLimit: 20,
  acquireTimeout: 60000,
  timeout: 60000,
  reconnect: true,
  
  // 字符集配置
  charset: 'utf8mb4',
  timezone: '+08:00',
  
  // SSL配置（生产环境推荐）
  ssl: {
    rejectUnauthorized: false
  }
};
```

## 🔴 Redis配置

### 1. Redis持久化配置
编辑`/etc/redis/redis.conf`：
```conf
# RDB持久化
save 900 1
save 300 10
save 60 10000

# AOF持久化
appendonly yes
appendfsync everysec

# 内存配置
maxmemory 2gb
maxmemory-policy allkeys-lru

# 安全配置
requirepass your-secure-password
```

### 2. Redis集群配置（可选）
```bash
# 创建集群配置目录
mkdir -p /etc/redis/cluster/{7000,7001,7002,7003,7004,7005}

# 每个节点的配置文件
port 7000
cluster-enabled yes
cluster-config-file nodes-7000.conf
cluster-node-timeout 5000
appendonly yes
```

## 📊 监控和日志

### 1. PM2监控
```bash
# 安装PM2 Plus（可选）
pm2 install pm2-server-monit

# 连接到PM2 Plus
pm2 plus
```

### 2. 日志管理
```bash
# 安装logrotate配置
sudo vim /etc/logrotate.d/express-api

/home/deploy/express-api-framework/logs/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 0644 deploy deploy
    postrotate
        pm2 reloadLogs
    endscript
}
```

### 3. 系统监控
```bash
# 安装htop
sudo apt install htop

# 安装iotop
sudo apt install iotop

# 安装netstat
sudo apt install net-tools
```

## 🔒 安全配置

### 1. 服务器安全
```bash
# 修改SSH端口
sudo vim /etc/ssh/sshd_config
# Port 2222

# 禁用root登录
# PermitRootLogin no

# 重启SSH服务
sudo systemctl restart sshd
```

### 2. 应用安全配置
```javascript
// 生产环境安全配置
const securityConfig = {
  // CORS配置
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['https://yourdomain.com'],
    credentials: true
  },
  
  // 限流配置
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15分钟
    max: 100, // 每个IP最多100次请求
    message: '请求过于频繁，请稍后再试'
  },
  
  // Helmet安全头
  helmet: {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"]
      }
    }
  }
};
```

### 3. 数据库安全
```sql
-- 删除匿名用户
DELETE FROM mysql.user WHERE User='';

-- 删除test数据库
DROP DATABASE test;

-- 只允许本地root登录
DELETE FROM mysql.user WHERE User='root' AND Host NOT IN ('localhost', '127.0.0.1', '::1');

-- 刷新权限
FLUSH PRIVILEGES;
```

## ⚡ 性能优化

### 1. Node.js性能优化
```javascript
// 启动优化参数
const nodeOptions = [
  '--max-old-space-size=4096',  // 增加V8内存限制
  '--optimize-for-size',        // 优化内存使用
  '--gc-interval=100'           // GC间隔
];
```

### 2. Nginx性能优化
```nginx
# 工作进程配置
worker_processes auto;
worker_connections 1024;

# 缓冲区配置
client_body_buffer_size 128k;
client_max_body_size 10m;
client_header_buffer_size 1k;
large_client_header_buffers 4 4k;

# 超时配置
keepalive_timeout 65;
client_body_timeout 12;
client_header_timeout 12;
send_timeout 10;

# 静态文件缓存
location ~* \.(jpg|jpeg|png|gif|ico|css|js)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

### 3. 数据库性能优化
```sql
-- 查询缓存
SET GLOBAL query_cache_size = 268435456;
SET GLOBAL query_cache_type = ON;

-- InnoDB配置
SET GLOBAL innodb_buffer_pool_size = 2147483648;
SET GLOBAL innodb_log_file_size = 268435456;
SET GLOBAL innodb_flush_log_at_trx_commit = 2;
```

## 🔧 故障排除

### 1. 常见问题

#### 应用无法启动
```bash
# 检查端口占用
sudo netstat -tulpn | grep :3000

# 检查进程
ps aux | grep node

# 检查日志
pm2 logs express-api
tail -f logs/error.log
```

#### 数据库连接失败
```bash
# 检查MySQL状态
sudo systemctl status mysql

# 检查连接
mysql -u api_user -p -h localhost express_api_db

# 检查权限
SHOW GRANTS FOR 'api_user'@'localhost';
```

#### Redis连接失败
```bash
# 检查Redis状态
sudo systemctl status redis-server

# 测试连接
redis-cli -h localhost -p 6379 -a your-password ping
```

### 2. 性能问题诊断
```bash
# CPU使用率
top -p $(pgrep -f "node.*server.js")

# 内存使用
ps aux | grep node | awk '{print $6}' | sort -n

# 网络连接
ss -tuln | grep :3000

# 磁盘I/O
iotop -p $(pgrep -f "node.*server.js")
```

### 3. 日志分析
```bash
# 错误日志分析
grep -i error logs/*.log | tail -50

# 访问频率统计
awk '{print $1}' /var/log/nginx/access.log | sort | uniq -c | sort -nr | head -10

# 响应时间分析
awk '{print $NF}' /var/log/nginx/access.log | sort -n | tail -10
```

## 📝 部署检查清单

### 部署前检查
- [ ] 服务器资源充足（CPU、内存、磁盘）
- [ ] 数据库已创建并配置
- [ ] Redis服务运行正常
- [ ] 环境变量正确配置
- [ ] SSL证书已安装
- [ ] 防火墙规则已配置

### 部署后检查
- [ ] 应用正常启动
- [ ] 健康检查接口可访问
- [ ] 数据库连接正常
- [ ] Redis连接正常
- [ ] 日志记录正常
- [ ] 错误处理正常
- [ ] 性能监控正常

### 安全检查
- [ ] 敏感信息已脱敏
- [ ] 管理端IP白名单已配置
- [ ] API限流规则生效
- [ ] HTTPS证书有效
- [ ] 安全头配置正确
- [ ] 数据库权限最小化

---

📞 **技术支持**: 如遇部署问题，请查看项目GitHub Issues或联系技术支持团队。 