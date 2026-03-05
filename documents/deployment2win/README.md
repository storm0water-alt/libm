# 档案管理系统 - Windows 离线部署

## ⚠️ 登录失败问题？

如果遇到登录失败（显示"用户名或密码错误"且 PM2 无日志），请先查看：

👉 **[快速修复指南](QUICK-FIX.md)** - 5 分钟解决问题

**原因**：PostgreSQL 认证配置不匹配  
**解决**：运行 `scripts\fix-postgres-auth.bat`

---

## 环境要求

| 项目 | 要求 |
|------|------|
| 操作系统 | Windows Server 2019+ / Windows 10+ |
| 内存 | 8GB+ |
| 磁盘 | 10GB+ 可用空间 |
| 权限 | 管理员权限 |

## 技术栈

- **Next.js 15** - Web 应用框架 (standalone 模式)
- **Node.js 22** - 运行时
- **PostgreSQL 16** - 数据库
- **Meilisearch** - 全文搜索
- **PM2** - 进程管理

## 安装位置说明

| 组件 | 默认位置 | 说明 |
|------|----------|------|
| 应用数据 | **可自定义** (D:/E:/F:...) | 安装时选择盘符 |
| PostgreSQL | C:\Program Files\PostgreSQL\16 | 固定 C 盘 |
| Node.js | C:\Program Files\nodejs | 固定 C 盘 |
| Meilisearch | C:\Program Files\Meilisearch | 固定 C 盘 |

## 目录结构

```
D:\ArchiveManagement\          (或 E:\, F:\ 等)
├── app/                    # Next.js 应用
│   ├── server.js           # 启动入口
│   ├── .next/              # Next.js 构建产物
│   ├── public/             # 静态文件
│   └── node_modules/       # 依赖
├── config/                 # 配置文件
│   ├── .env                # 环境变量
│   ├── config.ini          # 安装路径配置
│   └── config.json
├── scripts/                # 运维脚本
│   ├── install.bat         # 一键安装
│   ├── start.bat           # 启动服务
│   ├── stop.bat            # 停止服务
│   ├── backup.bat          # 数据库备份
│   └── upgrade.bat         # 版本升级
├── services/               # 服务配置
├── init-data/              # 数据库初始化脚本
├── data/                   # 数据存储
│   ├── database/           # PostgreSQL 数据
│   ├── archives/           # 档案文件
│   └── meilisearch/        # 搜索引擎数据
├── logs/                   # 日志目录
└── packages/               # 离线安装包
    ├── postgresql-16.11-2-windows-x64.exe
    ├── nodejs-v22.22.0-x64.msi
    └── meilisearch-windows-amd64.exe
```

## 快速部署

### 1. 准备安装包

将以下文件放入 `packages/` 目录：

| 文件 | 说明 |
|------|------|
| `postgresql-16.11-2-windows-x64.exe` | PostgreSQL 安装程序 |
| `nodejs-v22.22.0-x64.msi` | Node.js 安装程序 |
| `meilisearch-windows-amd64.exe` | Meilisearch 可执行文件 |

### 可选：winsw.exe

如需将 App 注册为 Windows 服务（开机自启），请下载 winsw.exe：

1. 访问 https://github.com/winsw/winsw/releases
2. 下载 `WinSW-x64.exe`
3. 重命名为 `winsw.exe` 并放入 `services/` 目录

> 如果不提供 winsw.exe，App 将使用 PM2 管理，需要手动配置开机自启。

### 2. 执行安装

以 **管理员身份** 运行 PowerShell 或 CMD：

```cmd
cd D:\ArchiveManagement
.\scripts\install.bat
```

安装过程：
- 输入安装盘符 (D:/E:/F:...)，默认为 D:
- 自动创建目录结构
- 静默安装 PostgreSQL、Node.js、Meilisearch 到 C 盘
- 生成随机密码和密钥
- 初始化数据库

> **注意**: `install.bat` 内部调用 `install.ps1` 执行安装

### 3. 启动服务

```cmd
.\scripts\start.bat
```

### 4. 访问应用

| 服务 | 地址 |
|------|------|
| Web 应用 | http://localhost:3000 |
| 搜索服务 | http://localhost:7700 |
| 管理员账号 | admin / admin123 |

## 服务管理

### 自动启动服务

安装完成后，以下服务会自动注册为 Windows 服务，开机自动启动：

| 服务 | 说明 | 依赖 |
|------|------|------|
| PostgreSQL | 数据库服务 | 无 |
| Meilisearch | 搜索引擎 | PostgreSQL |
| ArchiveApp | Web 应用 | Meilisearch |

### 手动管理

| 命令 | 说明 |
|------|------|
| `start.bat` | 启动所有服务 |
| `stop.bat` | 停止所有服务 |
| `status.bat` | 查看服务状态 |

### Windows 服务管理

也可以使用 Windows 原生命令管理：

```cmd
# 查看服务状态
sc query PostgreSQL
sc query Meilisearch
sc query ArchiveApp

# 手动启动/停止
net start ArchiveApp
net stop ArchiveApp
```

## 数据库备份

备份文件保存到 `[安装盘符]:\ArchiveBackups`：

```cmd
.\scripts\backup.bat
```

## 版本升级

```cmd
.\scripts\upgrade.bat
```

升级步骤：
1. 停止服务并自动备份数据库
2. 备份当前配置
3. 解压新版本覆盖文件
4. 恢复配置后启动服务

## 多盘符支持

安装时可以选择任意盘符作为应用目录：

```cmd
请输入安装盘符 (如 D): E

安装路径: E:\ArchiveManagement
```

所有脚本会自动读取 `config\config.ini` 中的安装路径配置，无需手动修改。

## 配置文件说明

### config.ini

安装后会在 `config\config.ini` 中生成以下配置项：

| 配置项 | 说明 | 默认值 |
|--------|------|--------|
| `ARCHIVE_HOME` | 应用安装目录 | 安装时指定 |
| `PG_DATA_DIR` | PostgreSQL 数据目录 | `%ARCHIVE_HOME%\data\database` |
| `MEILI_DATA_DIR` | Meilisearch 数据目录 | `%ARCHIVE_HOME%\data\meilisearch` |
| `BACKUP_DAYS` | 备份保留天数 | `30` |
| `ARCHIVE_BACKUP_PATH` | 备份目录 (可选) | `%ARCHIVE_HOME%\..\ArchiveBackups` |

### config.json

`config\config.json` 使用相对路径，无需手动配置：

```json
{
  "archive": {
    "storagePath": "./data/archives",
    "tempPath": "./data/temp"
  },
  "logging": {
    "baseDir": "./logs"
  }
}
```

## 服务就绪检查

启动服务时会自动等待服务就绪：

| 服务 | 检查方式 | 超时时间 |
|------|----------|----------|
| PostgreSQL | 连接测试 (`SELECT 1`) | 60 秒 |
| Meilisearch | HTTP 健康检查 (`/health`) | 30 秒 |
| Application | PM2 进程检查 | 10 秒 |

## 数据库初始化流程

### 完全离线部署

本系统采用**纯 SQL 方式**进行数据库初始化，无需网络连接，无需 Node.js/Prisma CLI：

```
install.bat 执行流程:
1. ✅ 启动 PostgreSQL 服务
2. ✅ 创建数据库 archive_management
3. ✅ 执行 init-schema.sql 创建表结构 ← 离线
4. ✅ 执行 init-database.sql 插入初始数据 ← 离线
5. ✅ 启动应用服务
```

### 初始化脚本

| 文件 | 用途 | 大小 |
|------|------|------|
| `init-data/init-schema.sql` | 创建完整数据库表结构 | ~7KB |
| `init-data/init-database.sql` | 插入管理员账户和演示数据 | ~2KB |

### 自动初始化

安装时 (`install.bat`) 会自动执行：

1. **创建数据库**
   ```sql
   CREATE DATABASE archive_management;
   ```

2. **创建表结构**（如果不存在）
   - User - 用户表
   - Archive - 档案表
   - ImportRecord - 导入记录表
   - OperationLog - 操作日志表
   - License - 授权表
   - SystemConfig - 系统配置表
   - ConfigHistory - 配置历史表

3. **插入初始数据**（如果不存在）
   - 管理员账户: `admin` / `admin123`
   - 系统配置: 初始化标记、版本号
   - 演示档案: 2 条测试数据

### 幂等性保证

所有 SQL 语句都使用 `IF NOT EXISTS` / `IF EXISTS`：

```sql
-- 表创建（幂等）
CREATE TABLE IF NOT EXISTS "User" (...)

-- 数据插入（幂等）
INSERT INTO users (...) VALUES (...) ON CONFLICT (username) DO NOTHING;
```

因此可以**安全地重复运行** `install.bat`。

### 手动初始化

如需手动初始化数据库：

```cmd
REM 1. 启动 PostgreSQL
net start PostgreSQL

REM 2. 创建数据库
"C:\Program Files\PostgreSQL\16\bin\createdb.exe" -U postgres archive_management

REM 3. 创建表结构
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d archive_management -f D:\ArchiveManagement\init-data\init-schema.sql

REM 4. 插入初始数据
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d archive_management -f D:\ArchiveManagement\init-data\init-database.sql
```

### 验证初始化

```cmd
REM 连接数据库
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d archive_management

REM 查看表
\dt

REM 查看管理员账户
SELECT username, role FROM "User" WHERE username='admin';

REM 查看系统配置
SELECT config_key, config_value FROM "SystemConfig";
```

## 备份与恢复

### 自动备份保留策略

`backup.bat` 默认保留 **30 天** 的备份文件，可通过 `config.ini` 配置：

```ini
BACKUP_DAYS=30
```

或使用 `--keep` 参数临时覆盖：

```cmd
.\scripts\monitor.ps1 backup --keep 14
```

### 备份目录

默认备份到 `[安装盘符]:\ArchiveBackups`，可通过 `config.ini` 自定义：

```ini
ARCHIVE_BACKUP_PATH=E:\\MyBackups
```
## 故障排查

### 服务无法启动

```cmd
# 检查端口占用
netstat -an | findstr ":3000\|:5432\|:7700"

# 查看日志
type D:\ArchiveManagement\logs\*.log
```

### PostgreSQL 连接失败

```cmd
# 检查服务状态
net start PostgreSQL

# 手动启动
"C:\Program Files\PostgreSQL\16\bin\pg_ctl.exe" start -D "D:\ArchiveManagement\data\database"
```

### Node.js 应用启动失败

```cmd
# 使用 PM2 查看状态
%APPDATA%\npm\pm2 status

# 查看日志
%APPDATA%\npm\pm2 logs archive-management

# 手动运行测试
cd D:\ArchiveManagement\app
node server.js
```

### Meilisearch 无法启动

```cmd
# 检查可执行文件
dir "C:\Program Files\Meilisearch\"

# 查看日志
type D:\ArchiveManagement\logs\meilisearch.log
```

## 端口说明

| 端口 | 服务 | 说明 |
|------|------|------|
| 3000 | Next.js | Web 应用 |
| 5432 | PostgreSQL | 数据库 |
| 7700 | Meilisearch | 全文搜索 |

## 首次安装后的目录说明

首次运行 `install.bat` 后，系统会生成以下目录结构：

```
D:\ArchiveManagement\
├── app/                      # ✅ 系统应用（可更新）
│   ├── server.js             # 启动入口
│   ├── .next/                # Next.js 构建产物
│   ├── public/               # 静态文件
│   └── node_modules/         # 依赖
├── config/                   # ⚠️ 系统配置（必须保留）
│   ├── .env                  # 数据库密码、密钥（重要！）
│   ├── config.ini            # 安装路径配置（重要！）
│   └── config.json           # 服务配置
├── scripts/                  # ✅ 运维脚本（可更新）
├── services/                 # ✅ 服务配置（可更新）
├── init-data/                # ✅ 初始化脚本（可更新）
├── data/                     # ⚠️ 用户数据（必须保留）
│   ├── database/             # PostgreSQL 数据（核心数据！）
│   ├── archives/             # 用户上传的 PDF 文件（核心数据！）
│   └── meilisearch/          # 搜索索引（可重建）
├── logs/                     # ⚠️ 日志（可保留）
└── packages/                 # 安装包缓存（可删除）
```

### 关键：哪些必须保留？

| 必须保留 | 说明 | 丢失后果 |
|----------|------|----------|
| `config/.env` | 数据库密码、密钥 | 无法连接数据库、应用无法启动 |
| `config/config.ini` | 安装路径 | monitor.ps1 无法定位目录 |
| `data/database/` | PostgreSQL 数据 | **所有业务数据丢失！** |
| `data/archives/` | PDF 文件 | **用户档案文件丢失！** |

### 哪些可以覆盖？

| 可以覆盖 | 说明 |
|----------|------|
| `app/` | 应用代码和依赖 |
| `scripts/` | 运维脚本 |
| `services/` | 服务配置 |
| `init-data/` | 初始化脚本 |
| `logs/` | 日志文件（可选保留） |
| `data/meilisearch/` | 搜索索引（可重建） |

## 系统升级

> ⚠️ **警告**：升级前必须备份 `data/` 目录！

### 升级步骤

```powershell
# 1. 停止服务
cd D:\ArchiveManagement\scripts
.\monitor.ps1 stop

# 2. 备份用户数据（重要！）
Copy-Item "D:\ArchiveManagement\data" "D:\ArchiveManagement\data-backup" -Recurse

# 3. 解压新版本到临时目录
Expand-Archive -Path "archive-management-vYYYYMMDDHHMMSS-offline.zip" -DestinationPath "D:\ArchiveManagement-new"

# 4. 选择性覆盖（只更新应用代码）
Copy-Item "D:\ArchiveManagement-new\app\server.js" "D:\ArchiveManagement\app\" -Force
Copy-Item "D:\ArchiveManagement-new\app\.next" "D:\ArchiveManagement\app\" -Recurse -Force
Copy-Item "D:\ArchiveManagement-new\app\package.json" "D:\ArchiveManagement\app\" -Force
Copy-Item "D:\ArchiveManagement-new\app\ecosystem.config.js" "D:\ArchiveManagement\app\" -Force
Copy-Item "D:\ArchiveManagement-new\scripts\*" "D:\ArchiveManagement\scripts\" -Force

# 5. 验证 data 目录完整
# 确保 D:\ArchiveManagement\data\ 下仍有 database/ 和 archives/

# 6. 启动服务
.\monitor.ps1 start

# 7. 验证
.\monitor.ps1 status
.\monitor.ps1 health
```

### 快速升级命令

```powershell
# 停止
.\monitor.ps1 stop

# 备份 data 目录
xcopy /E /I "data" "data-backup" 2>nul

# 覆盖应用（不覆盖 config 和 data）
xcopy /Y /S "..\新版本\app\*" "app\"
xcopy /Y "..\新版本\scripts\*.ps1" "scripts\"
xcopy /Y "..\新版本\scripts\*.bat" "scripts\"
xcopy /Y "..\新版本\services\*.json" "services\"
xcopy /Y "..\新版本\init-data\*.sql" "init-data\"

# 启动
.\monitor.ps1 start
```

### 升级检查清单

- [ ] 停止服务
- [ ] 备份 data 目录
- [ ] 覆盖 app/ 目录
- [ ] 覆盖 scripts/ 目录
- [ ] **不要覆盖** config/
- [ ] **不要覆盖** data/
- [ ] 启动服务
- [ ] 验证状态

### 回滚步骤

如果升级失败：

```powershell
# 1. 停止服务
.\monitor.ps1 stop

# 2. 恢复备份
rm -Recurse -Force data
Rename-Item data-backup data

# 3. 启动服务
.\monitor.ps1 start
```

## 打包内容说明

部署包 (`archive-management-vYYYYMMDDHHMMSS-offline.zip`) 包含以下内容：

| 目录/文件 | 是否包含 | 说明 |
|-----------|----------|------|
| `app/server.js` | ✅ | 应用入口 |
| `app/.next/` | ✅ | Next.js 构建产物 |
| `app/node_modules/` | ✅ | 依赖（包含 Windows Prisma 客户端） |
| `app/public/` | ✅ | 静态资源 |
| `app/ecosystem.config.js` | ✅ | PM2 配置 |
| `config/config.json` | ✅ | 服务配置 |
| `config/.env.template` | ✅ | 环境变量模板 |
| `scripts/*.ps1` | ✅ | PowerShell 运维脚本 |
| `scripts/*.bat` | ✅ | CMD 批处理脚本 |
| `services/*.json` | ✅ | 服务配置 |
| `init-data/init-schema.sql` | ✅ | **数据库表结构（离线）** |
| `init-data/init-database.sql` | ✅ | **数据库初始数据（离线）** |
| `config/.env` | ❌ | **不包含**（安装时生成） |
| `config/config.ini` | ❌ | **不包含**（安装时生成） |
| `data/` | ❌ | **不包含**（用户数据） |
| `logs/` | ❌ | **不包含**（运行时生成） |
| `packages/` | ❌ | **不包含**（需手动放置安装包） |

## 文件校验

```cmd
# 验证 SHA256
sha256sum -c archive-management-vYYYYMMDDHHMMSS-offline.sha256
```

## 构建部署包 (macOS)

```bash
cd documents/deployment2win
bash deploy.sh

# 输出:
# - output/archive-management-vYYYYMMDDHHMMSS-offline.zip
# - output/archive-management-vYYYYMMDDHHMMSS-offline.sha256

# 部署包大小约 30MB（包含 Windows Prisma 客户端）
```

### 注意事项

1. **首次部署**：必须以管理员身份运行 `install.bat`
2. **PowerShell 执行策略**：如遇到执行策略限制，请先运行：
   ```powershell
   Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope CurrentUser
   ```
3. **盘符选择**：安装时可选择任意盘符 (D/E/F...)
4. **组件位置**：PostgreSQL/Node.js/Meilisearch 固定安装到 C 盘
5. **密码管理**：安装时自动生成随机密码，保存于 `config\.env`
6. **Prisma**：node_modules 已完整打包，支持离线运行
7. **日志位置**：所有日志保存在 `logs\` 目录
8. **数据备份**：定期运行 `backup.bat` 保护数据
