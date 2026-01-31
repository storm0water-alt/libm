# 档案管理系统 - Windows + WSL2 部署指南

## 📋 目录结构

```
deployment/
├── docker-compose.yml          # Docker Compose 编排文件（WSL2优化版）
├── .env.example                # 环境变量模板
├── load-images.sh              # 镜像加载脚本（Linux/macOS）
├── load-images.bat             # 镜像加载脚本（Windows）
├── setup-wsl2.sh             # WSL2 环境初始化脚本
├── check-wsl2.sh              # WSL2 环境检查脚本
└── README.md                   # 本文档
```

## 🎯 部署目标

**目标环境**：Windows Server + WSL2 + Docker
**核心功能**：支持移动硬盘批量PDF导入，高性能并行处理

## 🚀 快速开始

### 前置要求

1. **Windows Server 环境**
   - Windows 10/11 或 Windows Server 2019+
   - 已启用 WSL2 功能
   - 已安装 Docker Desktop（WSL2后端）

2. **WSL2 环境检查**
   ```bash
   # 检查 WSL2 版本
   wsl --version
   
   # 检查 Linux 发行版
   wsl -l -v
   ```

3. **Docker 环境检查**
   ```bash
   # 在 WSL2 中检查 Docker
   docker --version
   docker-compose --version
   ```

### 部署步骤

#### 1. 初始化 WSL2 环境

**在 WSL2 中执行：**
```bash
# 转到部署目录
cd /path/to/deployment

# 运行 WSL2 环境初始化
chmod +x setup-wsl2.sh
./setup-wsl2.sh

# 检查环境是否就绪
chmod +x check-wsl2.sh
./check-wsl2.sh
```

#### 2. 加载 Docker 镜像

**在 Windows 中执行：**
```cmd
# Windows 命令提示符
load-images.bat
```

**或在 WSL2 中执行：**
```bash
# Linux 环境
chmod +x load-images.sh
./load-images.sh
```

#### 3. 配置环境变量

**在 WSL2 中执行：**
```bash
# 复制环境变量模板
cp .env.example .env

# 编辑 .env 文件
nano .env  # 或使用 vim
```

**关键配置项：**
```env
# ===================================
# Windows 文件路径配置（重要！）
# ===================================
# 移动硬盘或源文件路径（Windows格式）
SOURCE_PATHS=C:\\MobileDrive,D:\\BackupPDFs

# 档案存储路径（Windows格式）
ARCHIVE_STORAGE_PATH=C:\\ArchiveStorage

# 转换后的 WSL2 路径（自动生成）
# C:\MobileDrive → /mnt/c/MobileDrive
# D:\BackupPDFs → /mnt/d/BackupPDFs
# C:\ArchiveStorage → /mnt/c/ArchiveStorage

# ===================================
# 并行导入配置
# ===================================
# 导入并发数（1-10，建议3-5）
IMPORT_CONCURRENCY=3

# ===================================
# 数据库配置
# ===================================
POSTGRES_PASSWORD=your_secure_password_here
POSTGRES_DB=archive_management

# ===================================
# NextAuth 配置
# ===================================
NEXTAUTH_SECRET=your_nextauth_secret_here_generate_with_openssl
NEXTAUTH_URL=http://localhost:3000

# ===================================
# Meilisearch 配置
# ===================================
MEILISEARCH_MASTER_KEY=your_meilisearch_key_here_generate_with_openssl

# ===================================
# 应用配置
# ===================================
APP_PORT=3000
PDF_STORAGE_PATH=/app/archives  # Docker 容器内路径
```

#### 4. 启动服务

**在 WSL2 中执行：**
```bash
# 启动所有服务
docker-compose up -d

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f
```

#### 5. 验证部署

访问系统：`http://localhost:3000`

**WSL2 文件访问测试：**
```bash
# 测试 Windows 目录访问
ls -la /mnt/c/MobileDrive
ls -la /mnt/d/BackupPDFs
ls -la /mnt/c/ArchiveStorage
```

## 🎛 WSL2 优化配置

### Docker Compose 配置特点

```yaml
version: '3.8'

services:
  app:
    image: archive-management:latest
    container_name: archive-management-app
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      # Windows 路径映射配置
      - SOURCE_DIRECTORIES=${SOURCE_DIRECTORIES}
      - ARCHIVE_STORAGE_PATH=${ARCHIVE_STORAGE_PATH}
      - IMPORT_CONCURRENCY=${IMPORT_CONCURRENCY:-3}
    volumes:
      # WSL2 挂载的 Windows 目录
      - /mnt/c/ArchiveStorage:/app/archives:rw
      - /mnt/c/MobileDrive:/app/source/mobile-drive:rw
      - /mnt/d/BackupPDFs:/app/source/backup-pdfs:rw
    depends_on:
      db:
        condition: service_healthy
      meilisearch:
        condition: service_started
```

### 文件路径转换机制

系统会自动在运行时转换 Windows 路径到 WSL2 路径：

```typescript
// 路径转换逻辑
function convertWindowsToWSL2(windowsPath: string): string {
  return windowsPath
    .replace(/^C:\\/i, '/mnt/c/')
    .replace(/^D:\\/i, '/mnt/d/')
    .replace(/^E:\\/i, '/mnt/e/')
    .replace(/\\/g, '/');
}
```

## 📊 服务架构

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Windows      │    │      WSL2       │    │    Docker      │
│                │    │                  │    │                │
│ C:\MobileDrive ├────┤ /mnt/c/Mobile ├──────┤ /app/source/    │
│ D:\BackupPDFs  ├────┤ /mnt/d/BackupPDF ├──────┤ /app/source/    │
│ C:\ArchiveStor├────┤ /mnt/c/ArchiveStor├────┤ /app/archives/   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

**服务列表**：

| 服务名 | 容器名 | 端口 | WSL2挂载路径 | 说明 |
|--------|--------|------|--------------|------|
| app | archive-management-app | 3000 | /app/archives | 主应用服务 |
| db | archive-management-db | - | postgres_data | PostgreSQL 数据库 |
| meilisearch | archive-management-search | 7700 | meilisearch_data | 全文搜索引擎 |

## 💾 数据持久化

### Windows 主机存储
- **档案文件**: `C:\ArchiveStorage\`
- **移动硬盘**: `C:\MobileDrive\`（或其他盘符）
- **备份PDF**: `D:\BackupPDFs\`

### Docker Volume 存储
- **数据库数据**: `postgres_data` volume
- **搜索引擎数据**: `meilisearch_data` volume

### 备份策略
```bash
# Windows 主机备份脚本
@echo off
echo "开始备份档案数据..."
robocopy C:\ArchiveStorage D:\ArchiveBackup /E /COPYALL
echo "备份完成！"

# WSL2 自动备份（添加到 crontab）
# 0 2 * * * /path/to/backup-script.sh
```

## 🔧 WSL2 专用操作

### 目录权限设置
```bash
# 设置 Windows 挂载点权限
sudo chmod 755 /mnt/c/MobileDrive
sudo chmod 755 /mnt/d/BackupPDFs
sudo chmod 755 /mnt/c/ArchiveStorage

# 设置 Docker 容器用户权限
sudo usermod -aG docker $USER
```

### 性能优化
```bash
# WSL2 内存和CPU优化
# 编辑 /etc/wsl2.conf
echo "memory=4GB" >> /etc/wsl2.conf
echo "processors=4" >> /etc/wsl2.conf
echo "swap=2GB" >> /etc/wsl2.conf

# 重启 WSL2
wsl --shutdown
wsl
```

### Docker 存储优化
```bash
# Docker 数据目录迁移到 Windows 驱动器（可选）
sudo mv /var/lib/docker /mnt/c/docker-data
sudo ln -s /mnt/c/docker-data /var/lib/docker
```

## 📈 并行导入性能调优

### 环境变量配置
```env
# 根据服务器配置调整
IMPORT_CONCURRENCY=5  # 高性能服务器
IMPORT_CONCURRENCY=3  # 普通服务器
IMPORT_CONCURRENCY=2  # 低配置服务器
```

### 实时监控
```bash
# 查看并行处理状态
curl -s http://localhost:3000/api/import/stats | jq '.'

# 查看当前配置
curl -s http://localhost:3000/api/import/config | jq '.'
```

### 动态调整
```bash
# 动态设置并发数（需要管理员权限）
curl -X POST http://localhost:3000/api/import/set-concurrency \
  -H "Content-Type: application/json" \
  -d '{"concurrency": 7}'
```

## 🛠 常用操作

### 服务管理
```bash
# 启动服务
docker-compose up -d

# 停止服务
docker-compose down

# 重启服务
docker-compose restart

# 查看服务状态
docker-compose ps

# 查看实时日志
docker-compose logs -f
```

### 数据库操作
```bash
# 进入数据库
docker-compose exec db psql -U postgres -d archive_management

# 备份数据库
docker-compose exec db pg_dump -U postgres archive_management > backup.sql

# 恢复数据库
docker-compose exec -T db psql -U postgres archive_management < backup.sql
```

### 搜索索引管理
```bash
# 初始化搜索索引
curl http://localhost:3000/api/search/init

# 查看搜索统计
curl http://localhost:3000/api/search/stats
```

## 🔍 故障排查

### WSL2 相关问题

**1. WSL2 挂载问题**
```bash
# 检查挂载点
mount | grep /mnt

# 手动重新挂载（如果需要）
sudo mount -t drvfs 'C:' /mnt/c
```

**2. Docker 无法访问 Windows 目录**
```bash
# 检查 Docker 权限
groups | grep docker

# 重启 Docker 服务
sudo service docker restart
```

**3. 文件权限问题**
```bash
# 修复文件权限
sudo chown -R $USER:$USER /mnt/c/ArchiveStorage
sudo chmod -R 755 /mnt/c/ArchiveStorage
```

### 应用相关问题

**1. 移动硬盘无法访问**
```bash
# 检查驱动器是否挂载
ls /mnt/
df -h

# 检查文件是否可读
ls -la /mnt/d/MobileDrive
```

**2. 导入性能问题**
```bash
# 检查当前并发配置
curl -s http://localhost:3000/api/import/config

# 查看处理统计
curl -s http://localhost:3000/api/import/stats

# 调整并发数（临时）
curl -X POST http://localhost:3000/api/import/set-concurrency \
  -H "Content-Type: application/json" \
  -d '{"concurrency": 3}'
```

**3. 数据库连接问题**
```bash
# 检查数据库状态
docker-compose ps db

# 测试数据库连接
docker-compose exec app curl -f http://db:5432
```

## 🚀 性能优化建议

### 1. 硬件优化
- **SSD 硬盘**: 使用 SSD 存储 PDF 文件
- **内存配置**: 建议至少 8GB RAM
- **CPU 核心**: 4核心以上支持更好并发性能

### 2. WSL2 优化
- **内存分配**: 在 `.wslconfig` 中分配足够内存
- **文件系统**: 使用 `metadata` 选项提升性能
- **网络优化**: 配置 `localhost` 转发规则

### 3. Docker 优化
- **存储驱动**: 使用 `overlay2` 驱动
- **日志配置**: 配置日志轮转避免磁盘占满
- **资源限制**: 合理设置容器资源限制

## 📞 技术支持

如遇到问题，请联系技术支持并提供以下信息：

### 系统信息
```bash
# Windows 版本
cmd /c ver

# WSL2 版本
wsl --version

# Docker 版本
docker --version
docker-compose --version

# Linux 发行版信息
cat /etc/os-release
```

### 日志收集
```bash
# 收集所有服务日志
docker-compose logs > deployment-logs.txt

# 收集系统资源信息
top -b -n 1 >> system-info.txt
free -h >> system-info.txt
df -h >> system-info.txt
```

### 网络测试
```bash
# 测试端口连通性
curl -I http://localhost:3000
curl -I http://localhost:7700
telnet localhost 5432
```

---

## 📋 部署检查清单

### 部署前检查
- [ ] WSL2 已安装并正常运行
- [ ] Docker Desktop 已安装并使用 WSL2 后端
- [ ] 目标目录（C:\ArchiveStorage）已创建
- [ ] 防火墙已配置允许端口 3000

### 部署后检查
- [ ] 所有容器正常运行 (`docker-compose ps`)
- [ ] 应用可正常访问 (`http://localhost:3000`)
- [ ] 数据库连接正常
- [ ] 搜索功能正常
- [ ] 文件导入功能测试通过
- [ ] 并行处理功能测试通过

### 性能验证
- [ ] 并行导入性能测试通过（1000个文件 < 30分钟）
- [ ] 系统资源使用合理
- [ ] WSL2 文件访问速度正常

---

**版本**: 2.0.0 (WSL2 优化版)  
**更新日期**: 2026-01-30  
**兼容性**: Windows Server + WSL2 + Docker  
**新增功能**: 并行PDF导入 + 智能拷贝策略