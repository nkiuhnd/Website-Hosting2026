# WebHost - 极简网页托管与安全分发平台

WebHost 是一个基于 React + Express + Prisma 开发的轻量级静态网页托管系统。它支持单端口部署，具备独特的安全保护机制，非常适合用于演示、实验或小规模网页分发。

## 🌟 核心特性

- **🚀 单端口架构**：前后端通过同一个端口（默认 4000）提供服务，完美支持 cpolar 等内网穿透工具。
- **🛡️ 网页防下载保护**：动态注入保护脚本，禁止网页在 `file://` 协议下本地运行，防止内容被直接盗用。
- **🔍 自动内容审查**：内置敏感词扫描，自动阻断疑似诈骗/钓鱼页面的上传与发布。
- **🔗 反盗链机制**：内置 Referer 校验中间件，防止静态资源被第三方网站恶意调用。
- **📂 智能解压与分发**：支持 ZIP 压缩包上传，自动识别入口文件（index.html），并自动处理 GBK 编码兼容。
- **📊 访问统计**：实时统计每个项目的访问次数及存储占用。
- **⚙️ 管理员后台**：提供用户管理、项目状态监控（封禁/启用）等审查功能。

## 🛠️ 技术栈

- **前端**: React, Tailwind CSS, Lucide React, Axios
- **后端**: Node.js, Express, Prisma (SQLite)
- **安全**: JWT 认证, 路径穿越保护, 动态脚本注入, 内容关键词扫描

## 📦 快速开始

### 1. 克隆项目
```bash
git clone https://github.com/your-username/web2.git
cd web2/Website-Hosting
```

### 2. 安装依赖
```bash
# 安装后端依赖
cd server
npm install

# 安装前端依赖
cd ../client
npm install
```

### 3. 配置环境
在 `server` 目录下创建 `.env` 文件：
```env
PORT=4000
DATABASE_URL="file:./dev.db"
JWT_SECRET="your_secret_key"
ADMIN_USERNAME="admin"
ADMIN_PASSWORD="your_secure_password"
```

### 4. 初始化数据库
```bash
cd server
npx prisma generate
npx prisma db push
```

### 5. 启动服务

**开发模式 (双端口):**
- 后端: `cd server && npm run dev` (http://localhost:4000)
- 前端: `cd client && npm run dev` (http://localhost:5173)

**生产模式 (单端口部署):**
1. 构建前端: `cd client && npm run build`
2. 启动后端: `cd server && npm run start`
3. 访问: `http://localhost:4000`

## 🐳 Docker 部署

### 1. 确保 Docker 和 Docker Compose 已安装
请确保你的系统已安装 Docker 和 Docker Compose。你可以通过以下命令检查：
```bash
docker --version
docker-compose --version
```

### 2. 配置环境变量
在 `server` 目录下创建 `.env` 文件（如果尚未创建）：
```env
PORT=4000
DATABASE_URL="file:./dev.db"
JWT_SECRET="your_secret_key"
ADMIN_USERNAME="admin"
ADMIN_PASSWORD="your_secure_password"
```

### 3. 使用 Docker Compose 构建和启动服务

**构建并启动服务：**
```bash
docker-compose up --build -d
```

- `--build`: 重新构建镜像
- `-d`: 后台运行容器

**查看运行状态：**
```bash
docker-compose ps
```

**查看日志：**
```bash
docker-compose logs -f
```

**停止服务：**
```bash
docker-compose down
```

**重启服务：**
```bash
docker-compose restart
```

### 4. 访问应用
服务启动后，你可以通过以下地址访问应用：
```
http://localhost:4000
```

### 5. Docker 部署说明

- 应用数据会持久化存储在 `server/prisma` 和 `server/uploads` 目录中
- 首次启动时会自动初始化数据库
- 默认使用 Node.js 20.19.4 版本
- 支持通过修改 `docker-compose.yml` 中的端口映射来更改访问端口

## 🔒 内容审查与安全说明

为了防止平台被用于诈骗（Phishing）：
1. **关键词过滤**：系统在上传时会自动扫描 HTML 内容。
2. **人工复审**：管理员可在后台查看所有上传项目并一键封禁。
3. **本地运行限制**：被下载的网页在本地双击打开时将触发黑屏警告。

## 📄 开源协议

本项目采用 [MIT License](LICENSE) 协议。