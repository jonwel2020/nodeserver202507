# 多阶段构建 Dockerfile
# Stage 1: 构建阶段
FROM node:18-alpine AS builder

# 设置工作目录
WORKDIR /app

# 复制package文件
COPY package*.json ./

# 安装依赖
RUN npm ci --only=production && npm cache clean --force

# Stage 2: 运行阶段
FROM node:18-alpine AS runtime

# 安装必要的系统包
RUN apk add --no-cache \
    dumb-init \
    tzdata \
    && cp /usr/share/zoneinfo/Asia/Shanghai /etc/localtime \
    && echo "Asia/Shanghai" > /etc/timezone \
    && apk del tzdata

# 创建应用用户
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# 设置工作目录
WORKDIR /app

# 复制node_modules
COPY --from=builder /app/node_modules ./node_modules

# 复制应用代码
COPY --chown=nodejs:nodejs . .

# 创建必要的目录并设置权限
RUN mkdir -p logs uploads && \
    chown -R nodejs:nodejs /app

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:${PORT:-3000}/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })" || exit 1

# 暴露端口
EXPOSE 3000

# 使用非root用户运行
USER nodejs

# 使用dumb-init处理信号
ENTRYPOINT ["dumb-init", "--"]

# 启动应用
CMD ["node", "server.js"] 