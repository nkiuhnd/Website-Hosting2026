# 使用 Node.js v20.19.4 的 Alpine 基础镜像
FROM node:20.19.4-alpine AS base

# 创建必要的目录结构
RUN mkdir -p /app/server /app/client

# 安装必要的系统依赖
RUN apk add --no-cache bash git openssh-client curl openssl

# 第一阶段：构建客户端
FROM base AS client-builder
WORKDIR /app/client

# 复制客户端依赖文件
COPY client/package*.json ./

# 安装依赖（使用 npm 镜像加速下载，增加超时时间）
RUN npm install --registry=https://registry.npmmirror.com --timeout=120000

# 复制客户端源代码
COPY client/ ./

# 构建客户端
RUN npm run build

# 第二阶段：构建服务器
FROM base AS server-builder
WORKDIR /app/server

# 复制服务器依赖文件
COPY server/package*.json ./

# 安装系统依赖和依赖（包括开发依赖）
RUN apk add --no-cache libc6-compat openssl && \
    npm install --registry=https://registry.npmmirror.com --timeout=120000

# 复制服务器源代码
COPY server/ ./

# 生成 Prisma 客户端
RUN npx prisma generate

# 构建服务器
RUN npm run build

# 第三阶段：生产环境
FROM base AS production
WORKDIR /app

# 复制服务器的依赖文件和环境变量文件
COPY server/package*.json ./server/
COPY server/.env ./server/

# 安装系统依赖（仅保留必要的）和生产环境依赖
RUN apk add --no-cache libc6-compat openssl && \
    cd server && npm install --only=production --ignore-scripts --registry=https://registry.npmmirror.com --timeout=120000 && \
    npm prune --production

# 复制构建好的服务器代码
COPY --from=server-builder /app/server/dist ./server/dist

# 复制 Prisma 配置文件和生成的客户端
COPY server/prisma ./server/prisma
COPY --from=server-builder /app/server/node_modules/.prisma ./server/node_modules/.prisma
COPY --from=server-builder /app/server/node_modules/@prisma ./server/node_modules/@prisma

# 复制构建好的客户端代码
COPY --from=client-builder /app/client/dist ./client/dist

# 设置工作目录为服务器目录
WORKDIR /app/server

# 安装 Prisma CLI（用于运行迁移等操作）
RUN npm install -g prisma

# 生成 Prisma 客户端（确保客户端被正确初始化）
RUN npx prisma generate

# 暴露端口
EXPOSE 4000

# 启动命令
CMD ["npm", "start"]