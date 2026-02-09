# 广场功能 (Project Square) 开发文档

## 1. 功能概述 (Overview)

“广场”功能允许用户自愿公开分享其托管的静态网页项目。该功能旨在打造一个社区化的展示平台，用户不仅可以浏览他人的作品，还能进行点赞、评论和站内信互动。

### 核心特性
- **公开/私有切换**: 用户在控制台可一键将项目发布到广场。
- **社区广场页**: 网格化展示公开项目，支持按最新、最热（点赞）、访问量排序。
- **项目详情页**: 
    - **内嵌预览**: 通过 Iframe 直接在详情页预览静态网站。
    - **互动**: 点赞 (Like)、评论 (Comment)。
    - **联系作者**: 集成站内信功能，可直接联系项目所有者。

---

## 2. 数据库变更 (Database Schema)

在 `server/prisma/schema.prisma` 中新增了以下模型与字段：

```prisma
model Project {
  // ... 现有字段
  isPublic      Boolean   @default(false) // 是否公开
  likes         Like[]
  comments      Comment[]
}

model Like {
  id        Int      @id @default(autoincrement())
  userId    String
  projectId String
  createdAt DateTime @default(now())
  // ... 关联字段
  @@unique([userId, projectId]) // 防止重复点赞
}

model Comment {
  id        Int      @id @default(autoincrement())
  content   String
  userId    String
  projectId String
  createdAt DateTime @default(now())
  // ... 关联字段
}
```

> **迁移记录**: 位于 `server/prisma/migrations/20260209000000_add_square_feature`。

---

## 3. 后端 API 设计 (Backend API)

### 3.1 广场相关 (`/api/square`)
- `GET /`: 获取公开项目列表 (支持分页、搜索、排序)。
- `GET /:id`: 获取项目详情（含点赞数、评论数、是否已点赞）。
- `POST /:id/like`: 点赞/取消点赞 (需登录)。
- `GET /:id/comments`: 获取评论列表。
- `POST /:id/comments`: 发表评论 (需登录)。

### 3.2 项目管理 (`/api/projects`)
- `PATCH /:id/toggle-public`: 切换项目的公开/私有状态。

---

## 4. 前端页面 (Frontend Pages)

### 4.1 广场列表页 (`/square`)
- **路径**: `client/src/pages/Square.tsx`
- **功能**: 展示项目卡片网格。
- **特色**: 使用项目名称的哈希值生成动态渐变色封面，解决无缩略图问题。

### 4.2 项目详情页 (`/square/:id`)
- **路径**: `client/src/pages/ProjectDetail.tsx`
- **功能**:
    - **预览**: Iframe 嵌入原站。
    - **侧边栏**: 作者信息卡片 + “联系作者”按钮。
    - **评论区**: 完整的评论发表与展示流。

### 4.3 控制台 (`/dashboard`)
- **功能**: 在项目列表中增加了“公开/私有”切换按钮 (Globe Icon)。

---

## 5. 安全与隐私 (Security & Privacy)

1.  **敏感内容过滤**: 广场仅展示 `isPublic=true` 且 `status=ACTIVE` 的项目。
2.  **Iframe 安全**: 详情页预览使用 `sandbox` 属性限制 Iframe 权限。
3.  **隐私保护**: 仅展示作者的 `username`，不泄露手机号。

---

## 6. 后续优化建议 (Future Improvements)

- **封面图上传**: 允许用户上传自定义封面图片。
- **评论审核**: 增加评论的举报与后台审核功能。
- **消息通知**: 当收到评论或点赞时，通过站内信通知作者。
