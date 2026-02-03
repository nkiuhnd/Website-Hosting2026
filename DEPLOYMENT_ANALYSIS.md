# 部署分析与风险评估（Web Hosting Platform）

## 结论摘要
- **必须保留旧镜像**：仅依赖 GitHub 源码回滚太慢且风险高。建议在推送新版前，将当前 Docker Hub 上的 `latest` 另存为备份标签（操作步骤见下文）。
- **部署方式**：仍可继续使用“本地构建 -> 推送 -> 服务器拉取”的流程。
- **数据风险**：必须在生产更新前处理好数据库迁移和数据备份，否则存在数据结构不一致风险。

---

## 1. 镜像备份策略（回答你的疑问）

**强烈建议保留现有的镜像。**

虽然 GitHub 有代码记录，但从代码恢复到可运行的镜像需要时间（下载依赖、编译、构建），而且构建环境可能发生微小变化导致失败。
**生产环境回滚的最佳实践是“秒级回切换镜像”，而不是“重新构建”。**

### 操作步骤：在覆盖 `latest` 之前

请在你的本地电脑（或任意能连 Docker Hub 的终端）执行以下命令，把当前的 `latest` "锁"在一个新标签里：

```bash
# 1. 拉取当前线上的稳定版本
docker pull hanshuai23/web-hosting-platform:latest

# 2. 给它打个备份标签 (例如 v1.0-backup 或 backup-日期)
docker tag hanshuai23/web-hosting-platform:latest hanshuai23/web-hosting-platform:v1.0-backup

# 3. 推送备份标签到 Docker Hub
docker push hanshuai23/web-hosting-platform:v1.0-backup
```

**好处**：
如果新版 `latest` 部署后服务器挂了，你只需要修改服务器上的 `docker-compose.yml`，将 image 改为 `...:v1.0-backup`，然后 `docker compose up -d`，服务就能在 10 秒内恢复。

---

## 2. 当前部署结构分析
- 生产 compose: `docker-compose.yml`
- 镜像构建: `Dockerfile`
- 数据库: SQLite（挂载宿主机 `server/prisma/production.db`）

### 关键挂载点（生产）
- DB: `./server/prisma/production.db` → `/app/server/prisma/dev_v2.db`
- 上传文件: `./server/uploads` → `/app/server/uploads`
- 环境变量: `./server/.env` → `/app/server/.env`

---

## 3. 本地 Docker 测试建议
为了避免直接在服务器上测试，推荐在本地进行“生产模拟”：

1. **构建新镜像**：
   ```bash
   docker build -t hanshuai23/web-hosting-platform:v2.0-test .
   ```

2. **使用生产配置启动**：
   ```bash
   # 使用生产 compose 文件启动
   docker compose -f docker-compose.yml up -d
   ```
   *注意：这会使用你本地的 production.db，请确保你本地有这个文件，或者先复制一份 dev.db 改名。*

3. **验证功能**：
   测试登录、上传、消息通知等核心功能是否正常。

---

## 4. Prisma 数据结构与迁移风险
你当前的数据库结构 (`schema.prisma`) 包含 User, Project, Message 等表。
如果线上数据库结构滞后，新代码运行会报错。

**必须执行的步骤**：
1. **备份**：登录服务器，将 `production.db` 复制一份为 `production.db.bak`。
2. **部署新镜像**：`docker compose pull && docker compose up -d`
3. **执行迁移**：
   ```bash
   # 进入容器执行数据库迁移
   docker compose exec web-hosting-platform npx prisma migrate deploy
   ```
   *注意：`migrate deploy` 专门用于生产环境，它会应用所有未应用的 migrations。*

---

## 5. 推荐上线流程清单
1. [本地] 拉取旧镜像并 Retag 备份 (`v1.0-backup`)
2. [本地] 构建新镜像并推送 (`latest` 和 `v2.0`)
3. [服务器] 备份 `production.db` 和 `uploads` 目录
4. [服务器] `docker compose pull` 拉取新镜像
5. [服务器] `docker compose up -d` 重启服务
6. [服务器] `docker compose exec web-hosting-platform npx prisma migrate deploy` 更新数据库结构
7. [服务器] 验证网站功能

---

## 6. 回滚方案
如果出现严重故障：
1. 修改 `docker-compose.yml`，将 image 改回 `hanshuai23/web-hosting-platform:v1.0-backup`
2. 如果数据库迁移破坏了数据，将 `production.db.bak` 恢复为 `production.db`
3. `docker compose up -d`