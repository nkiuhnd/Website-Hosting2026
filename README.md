# WebHost - 极简网页托管与安全分发平台

WebHost 是一个基于 React + Express + Prisma 开发的轻量级静态网页托管系统。它支持单端口部署，具备独特的安全保护机制，非常适合用于演示、实验或小规模网页分发。

## 🌟 核心特性

- **🚀 单端口架构**：前后端通过同一个端口（默认 4000）提供服务，完美支持 cpolar 等内网穿透工具。
- **🛡️ 网页防下载保护**：动态注入保护脚本，禁止网页在 `file://` 协议下本地运行，防止内容被直接盗用。
- **📱 短信认证集成**：支持手机号注册、登录及短信找回密码，安全便捷（基于阿里云 SMS）。
- **🔍 自动内容审查**：内置敏感词扫描，自动阻断疑似诈骗/钓鱼页面的上传与发布。
- **🔗 反盗链机制**：内置 Referer 校验中间件，防止静态资源被第三方网站恶意调用。
- **📂 智能解压与分发**：支持 ZIP 压缩包上传，自动识别入口文件（index.html），并自动处理 GBK 编码兼容。
- **📊 访问统计**：实时统计每个项目的访问次数及存储占用。
- **⚙️ 管理员后台**：提供用户管理、项目状态监控（封禁/启用）等审查功能。

## 🛠️ 技术栈

- **前端**: React, Tailwind CSS, Lucide React, Axios
- **后端**: Node.js, Express, Prisma (SQLite)
- **安全**: JWT 认证, 路径穿越保护, 动态脚本注入, 内容关键词扫描, 阿里云短信服务
- **数据存储**: SQLite (数据), Redis (短信验证码缓存)

## 📦 快速开始

### 1. 克隆项目
```bash
git clone https://github.com/nkiuhnd/Website-Hosting.git
cd Website-Hosting
```

### 2. 配置环境
在 `server` 目录下创建 `.env` 文件：
```env
PORT=4000
DATABASE_URL="file:./dev.db"
JWT_SECRET="your_secret_key"
ADMIN_USERNAME="admin"
ADMIN_PASSWORD="your_secure_password"

# 阿里云短信配置 (必须配置)
ALIYUN_ACCESS_KEY_ID="your_access_key_id"
ALIYUN_ACCESS_KEY_SECRET="your_access_key_secret"
ALIYUN_SMS_SIGN_NAME="your_sign_name"
ALIYUN_SMS_TEMPLATE_CODE="your_template_code" # 验证码模板ID

# Redis 配置 (用于短信验证码缓存)
REDIS_HOST="redis" # 如果使用 docker-compose，这里填 redis 服务名；本地开发填 localhost
REDIS_PORT=6379
```

### 3. Docker 部署 (推荐)

本项目支持通过 Docker Compose 一键启动，分为开发模式和生产模式。

#### 3.1 启动生产环境 (Stable)
适用于正式部署。

```bash
docker-compose up --build -d
```

访问地址: `http://localhost:4000`

#### 3.2 启动开发环境 (Dev)
适用于开发调试，支持代码热重载。

```bash
docker-compose -f docker-compose.dev.yml up --build
```

访问地址:
- 前端: `http://localhost:5173`
- 后端: `http://localhost:4000`

### 4. 本地手动启动 (Legacy)

如果不使用 Docker，请确保本地已安装 Node.js, Redis 和 SQLite。

1. **安装后端依赖并启动**:
   ```bash
   cd server
   npm install
   npx prisma generate
   npx prisma db push
   npm run dev
   ```

2. **安装前端依赖并启动**:
   ```bash
   cd client
   npm install
   npm run dev
   ```

## 🔒 内容审查与安全说明

为了防止平台被用于诈骗（Phishing）：
1. **关键词过滤**：系统在上传时会自动扫描 HTML 内容。
2. **人工复审**：管理员可在后台查看所有上传项目并一键封禁。
3. **本地运行限制**：被下载的网页在本地双击打开时将触发黑屏警告。

## 📄 开源协议

本项目采用 [MIT License](LICENSE) 协议。
