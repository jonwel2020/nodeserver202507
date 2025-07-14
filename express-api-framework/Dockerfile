# =================================================================
# 企业级 Node.js + Express + MySQL 后端API框架 Docker配置
# =================================================================
# 多阶段构建，优化镜像大小和安全性

# 构建阶段
FROM node:18-alpine AS builder

# 设置工作目录
WORKDIR /app

# 安装构建依赖
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    && ln -sf python3 /usr/bin/python

# 复制package文件
COPY package*.json ./

# 安装依赖（仅生产依赖）
RUN npm ci --only=production && npm cache clean --force

# 生产阶段
FROM node:18-alpine AS production

# 创建非root用户
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodeuser -u 1001

# 设置工作目录
WORKDIR /app

# 安装运行时依赖
RUN apk add --no-cache \
    dumb-init \
    curl \
    && rm -rf /var/cache/apk/*

# 从构建阶段复制依赖
COPY --from=builder --chown=nodeuser:nodejs /app/node_modules ./node_modules

# 复制应用代码
COPY --chown=nodeuser:nodejs . .

# 创建必要的目录
RUN mkdir -p logs uploads temp && \
    chown -R nodeuser:nodejs logs uploads temp

# 设置环境变量
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

# 暴露端口
EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# 切换到非root用户
USER nodeuser

# 使用dumb-init作为PID 1
ENTRYPOINT ["dumb-init", "--"]

# 启动应用
CMD ["node", "server.js"]

# 标签信息
LABEL maintainer="系统 <system@example.com>"
LABEL version="1.0.0"
LABEL description="企业级 Node.js + Express + MySQL 后端API框架"
LABEL org.opencontainers.image.source="https://github.com/your-org/express-api-framework" 