# Docker 部署说明

## 服务架构

```
┌─────────────────────────────────────────────────────────────┐
│                      Docker Compose 环境                      │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Next.js    │  │  PostgreSQL  │  │ Meilisearch  │      │
│  │     App      │◄─┤              │  │              │      │
│  │   (Port 3000)│  │  (Port 5432) │  │  (Port 7700) │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│         │                  │                  │              │
│         └──────────────────┼──────────────────┘              │
│                            ▼                                 │
│                   ┌──────────────┐                           │
│                   │    Redis     │                           │
│                   │  (Port 6379) │                           │
│                   └──────────────┘                           │
│                                                              │
│  存储卷:                                                     │
│  ├── postgres_data      (数据库持久化)                       │
│  ├── redis_data         (缓存持久化)                         │
│  ├── meilisearch_data   (搜索索引持久化)                     │
│  └── pdf_storage        (PDF 文件存储)                       │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## 快速开始

### 1. 环境准备

确保已安装：
- Docker Engine 24.0+
- Docker Compose 2.20+

### 2. 配置环境变量

```bash
# 复制环境变量模板
cp .env.example .env

# 编辑 .env 文件，修改密码等敏感配置
vim .env
```

**重要**：生产环境必须修改以下密码：
- `POSTGRES_PASSWORD`
- `REDIS_PASSWORD`
- `MEILI_MASTER_KEY`（最少 32 字符）
- `NEXTAUTH_SECRET`（最少 32 字符）

### 3. 创建 PDF 存储目录

```bash
mkdir -p data/pdfs
```

### 4. 启动服务

```bash
# 启动所有服务
docker-compose up -d

# 查看日志
docker-compose logs -f app

# 查看服务状态
docker-compose ps
```

### 5. 初始化数据库

```bash
# 运行数据库迁移
docker-compose exec app npx prisma migrate deploy

# （可选）创建初始管理员用户
# docker-compose exec app npx prisma db seed
```

### 6. 访问应用

- **应用地址**: http://localhost:3000
- **Meilisearch**: http://localhost:7700
  - Master Key: 见 `.env` 中的 `MEILI_MASTER_KEY`

### 7. 管理工具（可选）

```bash
# 启动管理工具（pgAdmin + Redis Insight）
docker-compose --profile admin up -d

# 访问 pgAdmin
# 地址: http://localhost:5050
# 用户名: 见 .env PGADMIN_EMAIL
# 密码: 见 .env PGADMIN_PASSWORD

# 访问 Redis Insight
# 地址: http://localhost:8001
```

## 服务说明

### Next.js 应用服务

- **容器名**: `archive-app`
- **端口**: 3000
- **健康检查**: `GET /api/health`
- **依赖**: postgres, redis, meilisearch

### PostgreSQL 数据库

- **容器名**: `archive-postgres`
- **版本**: PostgreSQL 16 Alpine
- **端口**: 5432
- **默认用户**: `postgres`
- **默认数据库**: `archive_management`
- **性能优化**: 已配置适合中小型应用的参数

### Redis 缓存

- **容器名**: `archive-redis`
- **版本**: Redis 7 Alpine
- **端口**: 6379
- **最大内存**: 256MB
- **淘汰策略**: allkeys-lru

### Meilisearch 搜索

- **容器名**: `archive-meilisearch`
- **版本**: v1.12
- **端口**: 7700
- **用途**: 档案全文检索

### pgAdmin（可选）

- **容器名**: `archive-pgadmin`
- **端口**: 5050
- **启动方式**: `--profile admin`

### Redis Insight（可选）

- **容器名**: `archive-redis-insight`
- **端口**: 8001
- **启动方式**: `--profile admin`

## 常用命令

### 服务管理

```bash
# 启动所有服务
docker-compose up -d

# 停止所有服务
docker-compose down

# 停止并删除数据卷（危险！）
docker-compose down -v

# 重启服务
docker-compose restart app

# 查看日志
docker-compose logs -f [service_name]

# 查看服务状态
docker-compose ps

# 进入容器
docker-compose exec app sh
docker-compose exec postgres psql -U postgres -d archive_management
```

### 数据库操作

```bash
# 生成 Prisma Client
docker-compose exec app npx prisma generate

# 运行迁移
docker-compose exec app npx prisma migrate deploy

# 查看数据库
docker-compose exec postgres psql -U postgres -d archive_management

# 备份数据库
docker-compose exec postgres pg_dump -U postgres archive_management > backup.sql

# 恢复数据库
docker-compose exec -T postgres psql -U postgres archive_management < backup.sql
```

### 监控与调试

```bash
# 查看资源使用
docker stats

# 查看容器日志
docker-compose logs --tail=100 app

# 实时查看日志
docker-compose logs -f --tail=100 app

# 健康检查
curl http://localhost:3000/api/health
```

## 数据持久化

所有数据存储在 Docker 命名卷中：

```bash
# 查看所有卷
docker volume ls | grep archive

# 查看卷详情
docker volume inspect archive-postgres-data

# 备份卷
docker run --rm -v archive-postgres-data:/data -v $(pwd):/backup alpine tar czf /backup/postgres-backup.tar.gz /data

# 恢复卷
docker run --rm -v archive-postgres-data:/data -v $(pwd):/backup alpine tar xzf /backup/postgres-backup.tar.gz -C /
```

## 生产环境部署建议

### 1. 安全配置

```bash
# 修改所有默认密码
# 使用强密码（最少 32 字符）
# 配置 HTTPS（使用 Traefik 或 Nginx 反向代理）
# 限制容器资源
```

### 2. 资源限制

在 `docker-compose.yml` 中添加：

```yaml
services:
  app:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '0.5'
          memory: 512M
```

### 3. 日志管理

```yaml
services:
  app:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

### 4. 备份策略

```bash
# 定期备份数据库
0 2 * * * docker-compose exec postgres pg_dump -U postgres archive_management > /backup/$(date +\%Y\%m\%d).sql

# 定期备份 PDF 文件
0 3 * * * rsync -avz ./data/pdfs/ /backup/pdfs/
```

### 5. 监控告警

建议集成：
- Prometheus + Grafana
- Elasticsearch + Kibana（日志分析）
- Sentry（错误追踪）

## 故障排查

### 数据库连接失败

```bash
# 检查 PostgreSQL 是否就绪
docker-compose exec postgres pg_isready -U postgres

# 查看 PostgreSQL 日志
docker-compose logs postgres

# 检查网络连接
docker-compose exec app ping postgres
```

### Meilisearch 连接失败

```bash
# 检查 Meilisearch 健康状态
curl http://localhost:7700/health

# 查看 Meilisearch 日志
docker-compose logs meilisearch
```

### PDF 文件无法访问

```bash
# 检查存储卷
docker volume inspect archive-pdf-storage

# 检查目录权限
ls -la data/pdfs

# 进入容器检查
docker-compose exec app ls -la /app/data/pdfs
```

## 更新部署

```bash
# 1. 拉取最新代码
git pull

# 2. 重新构建镜像
docker-compose build app

# 3. 重启服务
docker-compose up -d app

# 4. 运行数据库迁移
docker-compose exec app npx prisma migrate deploy
```

## 开发环境

如需本地开发（不使用 Docker）：

```bash
# 安装依赖
npm install

# 配置环境变量
cp .env.example .env.local

# 启动开发服务器
npm run dev

# 在另一个终端启动数据库（使用 docker-compose 仅启动中间件）
docker-compose up -d postgres redis meilisearch
```
