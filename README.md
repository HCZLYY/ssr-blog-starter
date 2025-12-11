# SSR Blog Starter（科技与数码专题）

## 项目概览
- 基于 **Express + EJS** 的 SSR 渲染，首页与详情页默认在服务端生成完整 HTML 并在客户端通过 `hydrate.js` 激活交互。
- 后端提供文章 CRUD、分页、按标签筛选、关键词搜索与排序能力，接口统一挂载在 `/api/v1/articles`。
- 文章列表具备 **分页**、**抽屉式标签筛选**、**关键词搜索** 与 **降级提示**，点击整行卡片即可进入详情。
- 管理后台（`/admin/login` → `/admin/articles`）支持登录、文章新增/编辑/草稿箱、分页加载与 PM2 一键刷新。
- Redis 负责热点列表/详情缓存，并在写操作后失效缓存；当 MySQL 或 Redis 不可用时，SSR 会自动切换到降级页。

## 目录结构
```
.
├─ client/                 # 前端静态资源与样式（包括 hydrate.js、admin.css）
│  └─ dist/                # 构建产物
├─ server/
│  ├─ index.js             # Express 入口，挂载 SSR、API、Admin
│  ├─ routes/              # articles API、admin API 等
│  ├─ ssr/                 # renderPage.js 列表/详情 SSR 逻辑
│  ├─ views/               # EJS 视图（文章列表、详情、后台登录/管理）
│  ├─ middleware/          # 日志、缓存头等中间件
│  ├─ lib/                 # MySQL、Redis 客户端封装
│  └─ db/                  # SQL 初始化脚本与迁移文件
├─ docker-compose.yml      # MySQL + Redis 一键启动
├─ package.json            # 根目录依赖（共享工具）
└─ README.md               # 当前文档
```

## 环境依赖与安装
1. **基础依赖**
   - Node.js ≥ 18
   - npm 或 pnpm
   - Docker Desktop（用于一键启动 MySQL、Redis）
   - 可选：PM2（线上守护进程）
2. **克隆与安装**
   ```bash
   git clone <repo>
   cd ssr-blog-starter
   npm install          # 安装根目录共享依赖
   cd server && npm install
   ```
3. **环境变量**
   - 复制 `server/.env.example` 为 `server/.env`（示例中已提供以下值）：
     ```env
     PORT=3000
     DATABASE_HOST=127.0.0.1
     DATABASE_PORT=6606
     DATABASE_USER=ssr_user
     DATABASE_PASSWORD=20035313pass
     DATABASE_NAME=ssr_blog
     REDIS_URL=redis://127.0.0.1:6379
     ADMIN_USER=LYY
     ADMIN_PASS=20035313Aa
     ```
   - `DEFAULT_AUTHOR_ID`/`ADMIN_USER_ID` 用来告诉接口在没有登录态时默认写入哪位用户的 `user_id`。
4. **数据库初始化**
   - 启动容器：`docker compose up -d`
   - 初始化库表（任选其一）：
     - 快速方案：`mysql -h127.0.0.1 -P6606 -uroot -pROOTPASS < server/db/migrations/001_create_articles.sql`
     - 完整方案：`mysql ... < server/init_db.sql`（包含 `users`、`tags`、`article_tags` 三张扩展表）
5. **启动服务**
   ```bash
   cd server
   npm run dev        # 开发模式 + 热重载
   # 或
   npm start          # 单次启动
   # 或（线上）：
   pm2 start index.js --name ssr-blog-server
   pm2 save
   ```

## 启动 / 健康检查步骤
1. `docker compose up -d`（或 `docker start ssr-mysql-6606 ssr-blog-starter-redis-1`）
2. `cd server && npm start`
3. 浏览器访问：
   - `http://localhost:3000/` 文章列表
   - `http://localhost:3000/articles/1` 文章详情
   - `http://localhost:3000/admin/login` 后台登录（账号 LYY / 密码 20035313Aa）
4. 自检接口：`curl http://localhost:3000/health`

## API 文档（/api/v1/articles）
| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/v1/articles` | 分页列表，支持 `page` (默认1)、`limit` (默认10, ≤200)、`tag`、`search`、`status` (`published|draft|all`)、`sort_by` (`id|created_at|title|views`)、`sort_dir` (`asc|desc`)。响应包含 `items`、`total`、`availableTags`、`search` 等字段。 |
| GET | `/api/v1/articles/:id` | 根据文章 ID 返回详情。 |
| POST | `/api/v1/articles` | 新增文章，Body 需包含 `title`，可选 `summary`、`content`、`author`、`status` (`published|draft`)、`tags`。接口会自动注入 `user_id`（来自 `.env` 中的默认作者）。 |
| PUT | `/api/v1/articles/:id` | 更新标题/摘要/正文/标签/状态。 |
| DELETE | `/api/v1/articles/:id` | 逻辑删除文章（`deleted=1`）。 |

### 设计细节
- **Redis 缓存**：列表与详情分别以 `articles:list:*`、`articles:detail:*` 为 key 缓存 60~120 秒，写操作后调用 `clearListCache / clearArticleCache` 精确失效。
- **降级策略**：SSR 查询 MySQL/Redis 设有 2 秒超时，若失败则返回降级提示；客户端刷新按钮会重新拉取，直到接口恢复。
- **搜索**：`search` 参数会在标题、摘要、正文上执行模糊匹配，服务端与客户端的缓存 key 都包含搜索词以确保隔离。

## 数据库结构
核心表位于 `server/db/migrations/001_create_articles.sql` 与 `server/init_db.sql`，关键字段如下：
- `users`：`id / username / password_hash / role / created_at`（用于后台管理员与作者身份）
- `articles`：`id / user_id / title / summary / content / status / tags / views / created_at / updated_at / deleted`
- `tags`：`id / name / created_at`
- `article_tags`：多对多关联，便于做精准统计（当前页面仍以内嵌 `tags` 字符串为主，Redis 缓存会在写操作后失效）

> 若使用简化版迁移，仅需确保 `articles` 表包含 `user_id`、`tags`、`status`、`views` 等列即可兼容当前 API。

## 技术选型与方案说明
1. **Express + EJS SSR**：快速输出完整 HTML，满足 SEO 与首屏性能；同时保留 `hydrate.js` 进行最小化交互激活。
2. **Redis 缓存策略**：热点文章列表/详情放入 Redis，缓存命中则直接返回，缓存 miss 时回源 MySQL；写操作后精准清除相关 key。
3. **降级能力**：`renderPage.js` 的 `withTimeout` + 客户端重试按钮，确保数据库或 Redis 短暂故障时依旧给出可感知的“降级模式”提示。
4. **前端交互**：列表页包含分页、抽屉式标签筛选、搜索条与整行卡片点击区；管理后台使用同一份 `admin.css` 实现统一视觉。
5. **运维**：建议通过 PM2 守护 `ssr-blog-server`，Redis/MySQL 采用 docker compose 容器；`pm2 save` 后机器重启也能自动拉起。

## 常用命令
```bash
# 启停依赖
docker compose up -d
docker compose down

# PM2
pm2 restart ssr-blog-server
pm2 save

# 数据检查
mysql -h127.0.0.1 -P6606 -ussr_user -p20035313pass -e "SELECT COUNT(*) FROM articles"
```

如需扩展更多功能（例如 AI 写作、更多统计面板等），可在现有 API/Redis/SSR 基础上继续演进，记得在新增或删除 PM2 进程后执行 `pm2 save`。
