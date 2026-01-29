# 档案管理系统部署手册

本文档详细说明如何将档案管理系统部署到新的服务器上。

---

## 目录

1. [环境要求](#环境要求)
2. [服务器准备](#服务器准备)
3. [Docker 镜像源配置](#docker-镜像源配置)
4. [项目部署](#项目部署)
5. [服务启动](#服务启动)
6. [常见问题](#常见问题)

---

## 环境要求

### 硬件要求

| 资源 | 最低配置 | 推荐配置 |
|------|----------|----------|
| CPU | 2 核 | 4 核+ |
| 内存 | 4 GB | 8 GB+ |
| 磁盘 | 20 GB | 50 GB+ |

### 软件要求

- **操作系统**: Linux (Ubuntu 20.04+, CentOS 7+) / macOS
- **Docker**: 20.10+
- **Docker Compose**: 2.0+
- **Git**: 2.0+ (用于拉取代码)

---

## 服务器准备

### 1. 安装 Docker

#### Ubuntu/Debian

```bash
# 更新包索引
sudo apt-get update

# 安装依赖
sudo apt-get install -y ca-certificates curl gnupg

# 添加 Docker 官方 GPG 密钥
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# 设置仓库
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# 安装 Docker
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# 启动 Docker
sudo systemctl start docker
sudo systemctl enable docker

# 验证安装
docker --version
docker compose version
```

#### CentOS/RHEL

```bash
# 安装依赖
sudo yum install -y yum-utils

# 添加 Docker 仓库
sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo

# 安装 Docker
sudo yum install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# 启动 Docker
sudo systemctl start docker
sudo systemctl enable docker

# 验证安装
docker --version
docker compose version
```

### 2. 配置用户权限（可选）

将当前用户添加到 docker 组，避免每次使用 sudo：

```bash
sudo usermod -aG docker $USER
newgrp docker
```

### 3. 安装 Git

```bash
# Ubuntu/Debian
sudo apt-get install -y git

# CentOS/RHEL
sudo yum install -y git
```

---

## Docker 镜像源配置

### 问题说明

在国内服务器上，直接从 Docker Hub 拉取镜像可能会遇到网络超时问题：

```
failed to solve: failed to fetch oauth token: dial tcp: i/o timeout
```

### 解决方案：配置国内镜像源

#### Docker Desktop（macOS/Windows）

1. 打开 Docker Desktop
2. 点击右上角齿轮图标进入 **Settings**
3. 选择 **Docker Engine**
4. 在配置 JSON 中添加以下内容：

```json
{
  "registry-mirrors": [
    "https://docker.1ms.run",
    "https://docker.xuanyuan.me"
  ]
}
```

5. 点击 **Apply & Restart**

#### Linux 服务器

编辑 Docker 配置文件：

```bash
sudo mkdir -p /etc/docker
sudo tee /etc/docker/daemon.json <<EOF
{
  "registry-mirrors": [
    "https://docker.1ms.run",
    "https://docker.xuanyuan.me"
  ]
}
EOF

# 重启 Docker
sudo systemctl daemon-reload
sudo systemctl restart docker

# 验证配置
docker info | grep -A 10 "Registry Mirrors"
```

### 可用的国内镜像源

| 镜像源 | 地址 |
|--------|------|
| 1MS Run | `https://docker.1ms.run` |
| 轩辕镜像 | `https://docker.xuanyuan.me` |
| 阿里云 | `https://<your-id>.mirror.aliyuncs.com` (需登录获取) |
| 腾讯云 | `https://mirror.ccs.tencentyun.com` |

> **提示**: 可配置多个镜像源，Docker 会自动尝试可用的源。

---

## 项目部署

### 1. 克隆项目

```bash
# 克隆项目到服务器
git clone <repository-url> /opt/archive-management
cd /opt/archive-management
```

### 2. 配置环境变量

```bash
# 复制示例配置文件
cp .env.example .env

# 编辑配置文件
vim .env
```

**关键配置项：**

```bash
# 数据存储路径（根据服务器磁盘情况调整）
POSTGRES_DATA_PATH=/data/archive/postgres
REDIS_DATA_PATH=/data/archive/redis
MEILISEARCH_DATA_PATH=/data/archive/meilisearch
PDF_STORAGE_PATH=/data/archive/pdfs

# 数据库密码（生产环境务必修改！）
POSTGRES_USER=admin
POSTGRES_PASSWORD=<strong-password>
REDIS_PASSWORD=<strong-password>
MEILI_MASTER_KEY=<minimum-32-characters-key>

# NextAuth 配置（生产环境务必修改！）
NEXTAUTH_SECRET=<minimum-32-characters-secret>
NEXTAUTH_URL=https://your-domain.com
```

### 3. 创建数据目录

```bash
# 使用 Makefile 自动创建
make init

# 或手动创建
mkdir -p /data/archive/{postgres,redis,meilisearch,pdfs,pgadmin,redis-insight}
```

### 4. 验证配置

```bash
# 查看当前配置的存储路径
make show-paths
```

输出示例：

```
当前配置的存储路径：

数据存储路径：
  PostgreSQL 数据: /data/archive/postgres/
  Redis 数据:     /data/archive/redis/
  Meilisearch:     /data/archive/meilisearch/
  PDF 文件:       /data/archive/pdfs/

目录状态：
  ✓ /data/archive/postgres
  ✓ /data/archive/redis
  ✓ /data/archive/meilisearch
  ✓ /data/archive/pdfs
```

---

## 服务启动

### 1. 构建并启动服务

```bash
# 启动所有服务
make up

# 或使用 docker-compose
docker compose up -d
```

### 2. 查看服务状态

```bash
# 查看所有服务状态
make ps

# 或使用 docker-compose
docker compose ps
```

### 3. 查看日志

```bash
# 查看所有服务日志
make logs

# 查看应用日志
make logs-app

# 查看数据库日志
make logs-db
```

### 4. 运行数据库迁移

```bash
make db-migrate
```

### 5. 验证服务健康

```bash
# 检查应用健康状态
make health

# 或直接访问
curl http://localhost:3000/api/health
```

### 6. 访问应用

| 服务 | 地址 | 说明 |
|------|------|------|
| 应用 | http://localhost:3000 | 主应用 |
| Meilisearch | http://localhost:7700 | 搜索引擎管理界面 |
| pgAdmin | http://localhost:5050 | 数据库管理（需 `make admin` 启动） |
| Redis Insight | http://localhost:8001 | Redis 管理（需 `make admin` 启动） |

---

## 常见问题

### Q1: Docker 镜像拉取超时

**症状**: `failed to solve: failed to fetch oauth token: dial tcp: i/o timeout`

**解决**: 参考 [Docker 镜像源配置](#docker-镜像源配置) 配置国内镜像源。

### Q2: 端口冲突

**症状**: `port is already allocated`

**解决**: 修改 `.env` 文件中的端口配置：

```bash
POSTGRES_PORT=5432    # PostgreSQL
REDIS_PORT=6379       # Redis
MEILISEARCH_PORT=7700 # Meilisearch
APP_PORT=3000         # 应用
PGADMIN_PORT=5050     # pgAdmin
REDIS_INSIGHT_PORT=8001 # Redis Insight
```

### Q3: 权限问题

**症状**: `permission denied` 或无法创建数据目录

**解决**:

```bash
# 使用 sudo 运行
sudo make up

# 或调整目录权限
sudo chown -R $USER:$USER /data/archive
```

### Q4: 数据库连接失败

**症状**: 应用无法连接数据库

**解决**: 检查服务健康状态和日志：

```bash
make ps
make logs-db

# 进入数据库验证
make db-shell

# 测试数据库连接
docker-compose exec postgres psql -U admin -d archive_management -c "SELECT 1"
```

### Q4a: Prisma 7 配置注意事项

**说明**: 项目使用 Prisma 7.x，配置方式与之前版本不同：

1. **schema.prisma**: datasource 不需要 `url` 属性
2. **prisma.config.ts**: DATABASE_URL 在此文件中配置
3. **lib/prisma.ts**: PrismaClient 使用默认构造函数（无需传参）

```typescript
// prisma/schema.prisma - ✅ 正确
datasource db {
  provider = "postgresql"
}

// prisma/config.ts - ✅ 正确
export default defineConfig({
  datasource: {
    url: process.env.DATABASE_URL,
  },
});

// lib/prisma.ts - ✅ 正确
const prisma = new PrismaClient();
```

### Q5: 如何备份数据

```bash
# 备份数据库
make db-backup

# 备份文件在 backups/ 目录下
ls -lh backups/
```

### Q6: 如何清理并重新部署

```bash
# 停止并删除所有容器和卷
make clean

# 重新启动
make up
```

---

## 附录

### Make 命令速查

```bash
make help          # 显示帮助
make init          # 初始化环境
make show-paths    # 显示存储路径
make up            # 启动所有服务
make down          # 停止所有服务
make restart       # 重启所有服务
make logs          # 查看日志
make ps            # 查看服务状态
make db-shell      # 进入数据库
make db-backup     # 备份数据库
make db-migrate    # 运行数据库迁移
make clean         # 清理容器和卷
make health        # 检查健康状态
```

### 服务端口说明

| 端口 | 服务 | 说明 |
|------|------|------|
| 3000 | App | Next.js 应用 |
| 5432 | PostgreSQL | 数据库 |
| 6379 | Redis | 缓存 |
| 7700 | Meilisearch | 搜索引擎 |
| 5050 | pgAdmin | 数据库管理工具 |
| 8001 | Redis Insight | Redis 管理工具 |

### 数据目录结构

```
/data/archive/
├── postgres/          # PostgreSQL 数据
├── redis/             # Redis 数据
├── meilisearch/       # Meilisearch 索引
├── pdfs/              # PDF 文件存储
├── pgadmin/           # pgAdmin 配置
└── redis-insight/     # Redis Insight 配置
```

---

**文档版本**: 1.0
**最后更新**: 2026-01-26
