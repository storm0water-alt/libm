# 档案管理系统 - 极简Windows原生部署指南

## 🎯 部署目标

**技术栈**：
- PostgreSQL 16.11.2 (内网环境，SSL已禁用)
- Node.js v22.22.0 (生产就绪版本)  
- Meilisearch Latest (Windows 原生版本)
- PM2 进程管理器

**部署方式**：Windows原生服务，极简配置，离线友好

---

## 📋 目录结构

```
D:\
├── ArchiveManagement\          # 应用根目录
│   ├── app\               # 应用代码 (copy from archive-management/)
│   ├── packages\           # 离线安装包
│   │   ├── nodejs-v22.22.0-x64.msi
│   │   ├── postgresql-16.11-2-windows-x64.exe
│   │   └── meilisearch-windows-amd64.exe
│   ├── config\             # 配置文件
│   │   ├── config.json
│   │   └── .env
│   ├── services\           # Windows服务配置
│   ├── scripts\            # 运维脚本
│   ├── data\              # 数据存储
│   │   ├── database\
│   │   └── archives\
│   └── logs\              # 统一日志
├── ArchiveBackups\         # 数据库备份
└── ArchiveTemp\           # 临时文件
```

---

## 🚀 一键安装

### 前置条件

1. Windows Server 2019+ 或 Windows 10+ (管理员权限)
2. 至少 8GB RAM，建议 SSD 硬盘
3. 确保所有下载包完整性 (SHA-256校验)

### 安装步骤

```powershell
# 1. 以管理员身份运行 PowerShell
# 2. 进入部署目录
cd D:\ArchiveManagement
# 3. 执行一键安装
.\scripts\install.ps1
```

---

## ⚙️ 配置文件

### .env.template

```env
# ===================================
# 数据库配置
# ===================================
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=archive_management
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_secure_password_here

# SSL配置 (内网环境 - 已禁用)
POSTGRES_SSL_MODE=disable

# ===================================
# Meilisearch配置  
# ===================================
MEILISEARCH_HOST=localhost
MEILISEARCH_PORT=7700
MEILISEARCH_MASTER_KEY=your_meilisearch_key_here

# ===================================
# 应用配置
# ===================================
NEXTAUTH_SECRET=your_nextauth_secret_here
NEXTAUTH_URL=http://localhost:3000
APP_PORT=3000

# ===================================
# 存储配置
# ===================================
ARCHIVE_STORAGE_PATH=D:\ArchiveManagement\data\archives
BACKUP_PATH=D:\ArchiveBackups
LOG_PATH=C:\ArchiveLogs

# ===================================
# 服务配置
# ===================================
PM2_LOG_LEVEL=info
SERVICE_RESTART_DELAY=30
```

### config.json

```json
{
  "database": {
    "host": "localhost",
    "port": 5432,
    "database": "archive_management",
    "ssl": {
      "enabled": true,
      "certPath": "D:\\ArchiveManagement\\config\\server.crt",
      "keyPath": "D:\\ArchiveManagement\\config\\server.key"
    }
  },
  "meilisearch": {
    "host": "localhost",
    "port": 7700,
    "masterKey": "your_meilisearch_key_here"
  },
  "archive": {
    "port": 3000,
    "storagePath": "D:\\ArchiveManagement\\data\\archives",
    "tempPath": "D:\\ArchiveTemp"
  },
  "logging": {
    "baseDir": "C:\\ArchiveLogs",
    "maxFileSize": "100MB",
    "rotatePolicy": "daily",
    "retentionDays": 30,
    "importantLogFile": "critical-errors.log"
  },
  "services": {
    "restartDelay": 30,
    "healthCheckInterval": 60,
    "startupTimeout": 300
  }
}
```

---

## 📦 服务管理

### 启动所有服务

```powershell
.\scripts\start-services.ps1
```

### 停止所有服务

```powershell
.\scripts\stop-services.ps1
```

### 检查服务状态

```powershell
.\scripts\check-status.ps1
```

### 数据库备份

```powershell
# 手动备份
.\scripts\backup-database.ps1

# 检查备份状态
Get-ChildItem "D:\ArchiveBackups" | Sort-Object LastWriteTime -Descending | Select-Object -First 5
```

### 日志轮转

```powershell
# 手动日志轮转
.\scripts\rotate-logs.ps1

# 查看重要错误日志
Get-Content "C:\ArchiveLogs\critical-errors.log" -Tail 50
```

---

## 🔧 服务账户

### PostgreSQL 服务
- **运行账户**: 当前用户 (安装时用户)
- **服务名称**: PostgreSQL
- **显示名称**: PostgreSQL Database Service

### Meilisearch 服务  
- **运行账户**: 当前用户 (安装时用户)
- **服务名称**: Meilisearch
- **显示名称**: Archive Search Service

### Archive Management 应用
- **运行账户**: 当前用户 (安装时用户)
- **PM2进程名**: archive-management
- **服务名称**: ArchiveManagement

---

## 📋 日志管理

### 日志文件结构

```
C:\ArchiveLogs\
├── app\
│   ├── app-2026-01-31.log
│   └── app-2026-02-01.log
├── database\
│   ├── database-2026-01-31.log
│   └── database-2026-02-01.log
├── meilisearch\
│   ├── meilisearch-2026-01-31.log
│   └── meilisearch-2026-02-01.log
└── critical-errors.log          # 重要错误日志
```

### 日志轮转规则
- **大小限制**: 100MB
- **轮转策略**: 每日00:00轮转
- **保留期限**: 30天
- **重要日志**: 关键错误单独记录到 `critical-errors.log`

---

## 💾 备份策略

### 智能备份逻辑
1. **变更检测**: 检查数据库最后变更时间戳
2. **条件备份**: 只有数据变更时才执行备份
3. **文件管理**: 保留最近7个备份文件
4. **命名规则**: `backup-YYYY-MM-DD-HHMM.sql`

### 手动备份命令
```powershell
# 完整备份
.\scripts\backup-database.ps1 --full

# 增量备份 (如果支持)
.\scripts\backup-database.ps1 --incremental
```

---

## 🛠 故障排查

### 服务状态检查
```powershell
# 检查所有服务状态
Get-Service -Name "PostgreSQL", "Meilisearch", "ArchiveManagement"

# 检查端口占用
netstat -an | findstr ":3000\|:5432\|:7700"

# 检查进程状态
tasklist | findstr "postgres\|meilisearch\|node"
```

### 常见问题解决

#### PostgreSQL 启动失败
```powershell
# 检查数据目录权限
icacls "D:\ArchiveManagement\data\database"

# 检查端口占用
netstat -an | findstr ":5432"

# 手动启动 (紧急)
& "C:\Program Files\PostgreSQL\16\bin\pg_ctl.exe" start -D "D:\ArchiveManagement\data\database"
```

#### Node.js 应用启动失败
```powershell
# 检查PM2状态
pm2 status archive-management

# 查看应用日志
pm2 logs archive-management --lines 50

# 重启应用
pm2 restart archive-management
```

#### Meilisearch 启动失败
```powershell
# 手动启动 (紧急)
& "C:\Program Files\Meilisearch\meilisearch.exe" --master-key="your_key"

# 检查配置文件
Get-Content "D:\ArchiveManagement\config\meilisearch.toml"
```

---

## 📊 性能优化

### PostgreSQL 优化
```sql
-- 在数据库创建后执行
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET work_mem = '4MB';
SELECT pg_reload_conf();
```

### Node.js 优化
```javascript
// PM2 配置优化
{
  "max_memory_restart": "1G",
  "min_uptime": "10s",
  "error_file": "C:\\ArchiveLogs\\pm2-error.log",
  "out_file": "C:\\ArchiveLogs\\pm2-out.log"
}
```

---

## 🔐 安全配置

### SSL证书生成 (如果需要自签名证书)
```powershell
# 生成自签名证书 (开发环境)
openssl req -x509 -nodes -days 365 -newkey rsa:2048 `
  -keyout "D:\ArchiveManagement\config\server.key" `
  -out "D:\ArchiveManagement\config\server.crt" `
  -subj "/C=CN/ST=State/L=City/O=Organization/CN=localhost"
```

### 目录权限设置
```powershell
# 设置最大权限 (开发环境)
icacls "D:\ArchiveManagement" /grant "Everyone:(OI)(CI)F"

# 生产环境权限 (按需设置)
icacls "D:\ArchiveManagement\data" /grant "NT AUTHORITY\SYSTEM:(OI)(CI)F"
```

---

## 📈 监控和健康检查

### 服务健康检查
```powershell
# 每60秒检查一次服务状态
.\scripts\check-status.ps1 --interval 60

# 生成健康报告
.\scripts\check-status.ps1 --report > "D:\ArchiveManagement\health-report.json"
```

### 日志监控
```powershell
# 监控关键错误日志
Get-Content "C:\ArchiveLogs\critical-errors.log" -Wait -Tail 10

# 实时查看所有日志
Get-ChildItem "C:\ArchiveLogs\*.log" | ForEach-Object {
  Get-Content $_.FullName -Tail 5
}
```

---

## 🔄 版本升级

### 升级流程
```powershell
# 1. 备份当前数据
.\scripts\backup-database.ps1 --full

# 2. 停止所有服务
.\scripts\stop-services.ps1

# 3. 更新安装包
# 替换 packages/ 目录中的文件

# 4. 重新安装
.\scripts\install.ps1

# 5. 验证升级
.\scripts\check-status.ps1
```

---

## 📞 技术支持

### 日志收集命令
```powershell
# 生成完整技术支持包
.\scripts\collect-support-info.ps1 > "D:\ArchiveManagement\support-info.txt"

# 包含内容：
# - Windows版本信息
# - 服务配置
# - 最近错误日志
# - 系统资源使用情况
# - 网络配置
```

### 系统信息检查
```powershell
# Windows版本
[Environment]::OSVersion.VersionString

# 硬件信息
Get-WmiObject -Class Win32_ComputerSystem
Get-WmiObject -Class Win32_LogicalDisk

# 内存使用
Get-Process | Measure-Object -Property WorkingSet | Sort-Object -Descending WorkingSet
```

---

## 📋 部署检查清单

### 部署前检查
- [ ] 管理员权限确认
- [ ] 目标目录创建完成 (D:\ArchiveManagement)
- [ ] 安装包完整性验证完成
- [ ] 防火墙端口配置 (3000, 5432, 7700)

### 部署后验证
- [ ] PostgreSQL服务正常运行
- [ ] Meilisearch服务正常运行  
- [ ] ArchiveManagement应用正常运行
- [ ] SSL连接测试通过
- [ ] 数据备份功能正常
- [ ] 日志轮转功能正常
- [ ] 服务监控功能正常

### 性能验证
- [ ] 应用启动时间 < 30秒
- [ ] 数据库查询响应 < 100ms
- [ ] 搜索响应时间 < 500ms
- [ ] 系统资源使用合理

---

## 📚 相关文档

- **应用文档**: 应用内部功能和API文档
- **数据库文档**: PostgreSQL配置和优化指南
- **安全文档**: SSL配置和权限设置指南
- **运维文档**: 日常维护和故障排查手册

---

## 📞 技术支持

如遇到问题，请提供以下信息：

1. **系统信息**: 运行 `.\scripts\collect-support-info.ps1`
2. **错误描述**: 详细的错误信息和重现步骤
3. **配置信息**: `config.json` 文件内容 (隐藏敏感信息)
4. **日志文件**: 相关的日志文件内容

---

**版本**: 1.0.0 (极简Windows版)  
**更新日期**: 2026-01-31  
**兼容性**: Windows Server + PostgreSQL + Meilisearch + Node.js v22