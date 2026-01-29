# Docker 环境变量配置说明

## 概述

所有数据卷路径和重要配置都通过 `.env` 文件统一管理，您可以在宿主机上统一挂载特定的目录来存储数据。

## 配置方式

### 1. 初始化环境

```bash
make init
```

这个命令会：
1. 创建 `.env` 文件（如果不存在）
2. 根据 `.env` 中的配置创建所有必需的目录

### 2. 自定义存储路径

编辑 `.env` 文件，修改以下路径变量：

```bash
# 数据库数据存储
POSTGRES_DATA_PATH=/path/to/postgres/data

# Redis 数据存储
REDIS_DATA_PATH=/path/to/redis/data

# Meilisearch 索引存储
MEILISEARCH_DATA_PATH=/path/to/meilisearch/data

# PDF 文件存储
PDF_STORAGE_PATH=/path/to/pdfs

# pgAdmin 数据存储
PGADMIN_DATA_PATH=/path/to/pgadmin

# Redis Insight 数据存储
REDIS_INSIGHT_DATA_PATH=/path/to/redis-insight
```

### 3. 路径格式说明

```
┌─────────────────────────────────────────────────────────────────────────┐
│  路径格式说明                                                         │
└─────────────────────────────────────────────────────────────────────────┘

  相对路径（推荐）:
  POSTGRES_DATA_PATH=./data/postgres        → 项目目录下的 data/postgres/
  PDF_STORAGE_PATH=./data/pdfs              → 项目目录下的 data/pdfs/

  绝对路径:
  POSTGRES_DATA_PATH=/mnt/storage/postgres → /mnt/storage/postgres/
  PDF_STORAGE_PATH=/mnt/storage/pdfs      → /mnt/storage/pdfs/

  Windows 路径:
  POSTGRES_DATA_PATH=C:/data/postgres       → C:\data\postgres\
  PDF_STORAGE_PATH=D:/documents/pdfs       → D:\documents\pdfs\
```

## 目录结构示例

### 使用默认配置时

```
archive-management/                     # 项目根目录
├── .env                                # 环境变量配置
├── docker-compose.yml                   # Docker Compose 配置
├── Dockerfile                           # Docker 镜像构建
├── Makefile                             # 快捷命令
└── data/                               # 数据目录
    ├── postgres/                        # PostgreSQL 数据文件
    ├── redis/                           # Redis 数据文件
    ├── meilisearch/                     # Meilisearch 索引数据
    ├── pdfs/                            # PDF 文件
    ├── pgadmin/                          # pgAdmin 数据
    └── redis-insight/                    # Redis Insight 数据
```

### 自定义路径时

```
/mnt/storage/
└── archive-data/
    ├── postgres-data/
    ├── redis-data/
    ├── meilisearch-data/
    ├── pdf-files/
    └── admin-data/
```

```bash
# .env 文件配置
POSTGRES_DATA_PATH=/mnt/storage/archive-data/postgres-data
REDIS_DATA_PATH=/mnt/storage/archive-data/redis-data
MEILISEARCH_DATA_PATH=/mnt/storage/archive-data/meilisearch-data
PDF_STORAGE_PATH=/mnt/storage/archive-data/pdf-files
PGADMIN_DATA_PATH=/mnt/storage/archive-data/admin-data
REDIS_INSIGHT_DATA_PATH=/mnt/storage/archive-data/redis-insight
```

## docker-compose.yml 中的使用方式

### PostgreSQL 数据卷

```yaml
postgres:
  volumes:
    # 直接使用环境变量作为宿主机路径
    - ${POSTGRES_DATA_PATH:-./data/postgres}:/var/lib/postgresql/data
```

### Redis 数据卷

```yaml
redis:
  volumes:
    # 直接使用环境变量作为宿主机路径
    - ${REDIS_DATA_PATH:-./data/redis}:/data
```

### Meilisearch 数据卷

```yaml
meilisearch:
  volumes:
    # 直接使用环境变量作为宿主机路径
    - ${MEILISEARCH_DATA_PATH:-./data/meilisearch}:/meili_data
```

### PDF 文件存储

```yaml
app:
  volumes:
    # 直接使用环境变量作为宿主机路径
    - ${PDF_STORAGE_PATH:-./data/pdfs}:/app/data/pdfs
```

## 完整配置示例

### 场景 1：默认配置（推荐给大多数用户）

```bash
# .env 文件（使用默认路径）
POSTGRES_DATA_PATH=./data/postgres
REDIS_DATA_PATH=./data/redis
MEILISEARCH_DATA_PATH=./data/meilisearch
PDF_STORAGE_PATH=./data/pdfs
```

### 场景 2：统一数据存储

```bash
# .env 文件（所有数据存放在 /mnt/data）
POSTGRES_DATA_PATH=/mnt/data/archive/postgres
REDIS_DATA_PATH=/mnt/data/archive/redis
MEILISEARCH_DATA_PATH=/mnt/data/archive/meilisearch
PDF_STORAGE_PATH=/mnt/data/archive/pdfs
PGADMIN_DATA_PATH=/mnt/data/archive/pgadmin
REDIS_INSIGHT_DATA_PATH=/mnt/data/archive/redis-insight
```

### 场景 3：Windows 系统

```bash
# .env 文件（Windows 路径）
POSTGRES_DATA_PATH=C:/docker-data/archive/postgres
REDIS_DATA_PATH=C:/docker-data/archive/redis
MEILISEARCH_DATA_PATH=C:/docker-data/archive/meilisearch
PDF_STORAGE_PATH=D:/documents/archive/pdfs
PGADMIN_DATA_PATH=C:/docker-data/archive/pgadmin
REDIS_INSIGHT_DATA_PATH=C:/docker-data/archive/redis-insight
```

## 使用方式

### 首次部署

```bash
# 1. 初始化环境（创建 .env 和目录）
make init

# 2. 编辑 .env 自定义路径（可选）
vim .env

# 3. 查看当前配置的路径
make show-paths

# 4. 启动服务
make up

# 5. 运行迁移
make db-migrate
```

### 查看当前配置

```bash
make show-paths
```

输出示例：

```
当前配置的存储路径：

数据存储路径：
  PostgreSQL 数据: ./data/postgres/
  Redis 数据:     ./data/redis/
  Meilisearch:     ./data/meilisearch/
  PDF 文件:       ./data/pdfs/
  pgAdmin 数据:    ./data/pgadmin/
  Redis Insight:   ./data/redis-insight/

目录状态：
  ✓ ./data/postgres (不存在)
  ✓ ./data/redis (不存在)
  ✓ ./data/meilisearch (不存在)
  ✓ ./data/pdfs (不存在)
```

## 目录权限要求

### Linux/macOS

```bash
# 确保当前用户有读写权限
chmod 755 ./data

# 如果权限不足
sudo chown -R $USER:$USER ./data
```

### Windows

```bash
# 确保目录存在并有权限
mkdir C:\data\archive
```

## 注意事项

### 1. 路径必须存在或可创建

Docker Compose 会尝试创建不存在的目录，但如果：
- 父目录权限不足
- 路径包含特殊字符
- 父磁盘空间不足

则会启动失败。

### 2. 数据持久化

- 使用 bind mount（`:volumes: - /host/path:/container/path`）后
- 数据直接存储在宿主机指定路径
- 删除容器不会删除宿主机上的数据

### 3. 迁移现有数据

如果之前使用默认路径，现在想切换到新路径：

```bash
# 1. 停止服务
make down

# 2. 移动数据到新位置
mv ./data/* /new/path/

# 3. 更新 .env 中的路径
vim .env

# 4. 重新启动
make up
```

### 4. 备份建议

无论使用什么路径配置，都应该定期备份数据：

```bash
# 备份数据库
make db-backup

# 备份 PDF 文件
cp -r ./data/pdfs ./backups/pdfs_$(date +%Y%m%d)
```
