# 档案管理系统 - 离线部署指南

## 📋 目录结构

```
deployment/
├── images/                    # Docker 镜像文件目录
│   ├── archive-management.tar # 应用镜像
│   └── dependencies.tar        # 依赖镜像（可选）
├── docker-compose.yml          # Docker Compose 编排文件
├── .env.example                # 环境变量模板
├── load-images.sh              # 镜像加载脚本（Linux/macOS）
├── load-images.bat             # 镜像加载脚本（Windows）
└── README.md                   # 本文档
```

## 🚀 快速开始

### 前置要求

- Docker 20.10+
- Docker Compose 2.0+

### 部署步骤

#### 1. 解压部署包

将收到的部署包解压到目标服务器。

#### 2. 加载 Docker 镜像

**Linux/macOS:**
```bash
chmod +x load-images.sh
./load-images.sh
```

**Windows:**
```cmd
load-images.bat
```

#### 3. 配置环境变量

```bash
# 复制环境变量模板
cp .env.example .env

# 编辑 .env 文件，修改以下关键配置：
# - POSTGRES_PASSWORD: 数据库密码
# - NEXTAUTH_SECRET: NextAuth 密钥
# - MEILISEARCH_MASTER_KEY: Meilisearch 密钥
```

**生成密钥的方法:**
```bash
# 生成 NEXTAUTH_SECRET
openssl rand -base64 32

# 生成 MEILISEARCH_MASTER_KEY
openssl rand -base64 32
```

#### 4. 启动服务

```bash
# 启动所有服务
docker-compose up -d

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f
```

#### 5. 访问系统

服务启动完成后，在浏览器中访问：
- 系统地址: `http://服务器IP:3000`
- 默认管理员账号: 需首次登录时创建

## 📊 服务说明

系统包含以下服务：

| 服务名 | 容器名 | 端口 | 说明 |
|--------|--------|------|------|
| app | archive-management-app | 3000 | 应用主服务 |
| db | archive-management-db | - | PostgreSQL 数据库 |
| meilisearch | archive-management-search | 7700 | 全文搜索引擎 |

## 💾 数据持久化

系统使用 Docker Volume 进行数据持久化，数据存储位置：

- **数据库数据**: `postgres_data` volume
- **搜索引擎数据**: `meilisearch_data` volume
- **上传文件**: `./data/uploads` 目录
- **档案文件**: `./data/archives` 目录

**重要**: 请定期备份 `./data` 目录和 Docker volumes。

## 🔧 常用操作

### 查看服务状态
```bash
docker-compose ps
```

### 查看日志
```bash
# 查看所有服务日志
docker-compose logs -f

# 查看特定服务日志
docker-compose logs -f app
docker-compose logs -f db
```

### 重启服务
```bash
docker-compose restart
```

### 停止服务
```bash
docker-compose down
```

### 停止服务并删除数据（危险操作）
```bash
docker-compose down -v
```

### 更新系统

1. 获取新的镜像文件
2. 加载新镜像
3. 重启服务

```bash
docker load -i images/archive-management-new.tar
docker-compose up -d
```

## 🔐 安全建议

1. **修改默认密码**: 部署后务必修改 `.env` 中的所有默认密码和密钥
2. **防火墙配置**: 建议只开放必要端口（如 3000）
3. **定期备份**: 建议每日备份数据库和档案文件
4. **SSL 证书**: 生产环境建议配置 HTTPS

## 📋 故障排查

### 服务无法启动

1. 检查端口是否被占用
```bash
netstat -tuln | grep 3000
```

2. 检查 Docker 日志
```bash
docker-compose logs app
```

### 数据库连接失败

1. 确认数据库服务已启动
```bash
docker-compose ps db
```

2. 检查数据库连接配置
```bash
cat .env | grep DATABASE_URL
```

### 搜索功能异常

1. 检查 Meilisearch 服务状态
```bash
docker-compose logs meilisearch
```

2. 初始化搜索索引
访问: `http://服务器IP:3000/api/search/init`

## 📞 技术支持

如遇到问题，请联系技术支持并提供以下信息：

- 服务器操作系统版本
- Docker 版本: `docker --version`
- Docker Compose 版本: `docker-compose --version`
- 服务日志: `docker-compose logs`

---

**版本**: 1.0.0
**更新日期**: 2026-01-29
