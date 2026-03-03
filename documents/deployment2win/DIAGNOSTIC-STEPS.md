# Windows 登录失败诊断步骤

## 问题症状

1. 点击登录按钮后，前端显示"用户名或密码错误"
2. PM2 日志和应用日志都没有新输出（停留在启动日志）
3. Network 响应显示 `{"success":false,"error":"ç"¨æˆ·å"}` （乱码）

## 根本原因

**PostgreSQL 认证配置不匹配**：
- `pg_hba.conf` 使用 `scram-sha-256` 认证
- 但 `postgres` 用户没有密码（安装时用 `-A trust`）
- `.env` 中的 `DATABASE_URL` 包含密码，但与 postgres 用户不匹配
- Prisma 无法连接数据库 → 登录失败

## 诊断步骤

### 步骤 1: 检查 PostgreSQL 服务状态

```powershell
# 检查服务是否运行
Get-Service -Name PostgreSQL

# 如果未运行，启动服务
Start-Service -Name PostgreSQL
```

### 步骤 2: 测试数据库连接（无密码）

```powershell
# 尝试无密码连接
& "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d archive_management -c "SELECT version();"

# 如果成功，说明 trust 认证生效
# 如果失败（要求密码），说明 scram-sha-256 认证生效
```

**预期结果**：
- ✅ **成功**：输出 PostgreSQL 版本信息
- ❌ **失败**：提示 `psql: error: connection to server at "localhost" (127.0.0.1), port 5432 failed: FATAL: password authentication failed for user postgres`

### 步骤 3: 检查数据库中是否有用户

```powershell
# 如果步骤 2 成功（无密码可连接）
& "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d archive_management -c "SELECT username, role, status FROM \""User\"";"

# 如果步骤 2 失败（需要密码），先修改 pg_hba.conf
```

**预期结果**：
```
 username | role  | status  
----------+-------+---------
 admin    | admin | enabled
```

### 步骤 4: 检查 .env 配置

```powershell
# 查看 .env 文件
type D:\ArchiveManagement\config\.env | findstr /I "DATABASE_URL POSTGRES_PASSWORD"
```

**示例输出**：
```
DATABASE_URL=postgresql://postgres:pg_20260303120054@localhost:5432/archive_management
POSTGRES_PASSWORD=pg_20260303120054
```

### 步骤 5: 检查 pg_hba.conf 认证方式

```powershell
# 查看 pg_hba.conf
type D:\ArchiveManagement\data\database\pg_hba.conf | findstr /V "^#" | findstr /V "^$"
```

**关键行**：
```
local   all   all   scram-sha-256
host    all   all   127.0.0.1/32   scram-sha-256
```

## 解决方案

### 方案 A: 修改 PostgreSQL 为 trust 认证（推荐 - 快速修复）

**适用于**：开发/测试环境，内网部署

#### 1. 停止 PostgreSQL 服务

```powershell
Stop-Service -Name PostgreSQL
```

#### 2. 修改 pg_hba.conf

```powershell
# 打开文件
notepad D:\ArchiveManagement\data\database\pg_hba.conf
```

**修改为**：
```conf
# 将 scram-sha-256 改为 trust
local   all   all                                     trust
host    all   all             127.0.0.1/32            trust
host    all   all             ::1/128                 trust
local   replication   all                             trust
host    replication   all             127.0.0.1/32    trust
host    replication   all             ::1/128         trust
```

#### 3. 启动 PostgreSQL 服务

```powershell
Start-Service -Name PostgreSQL
```

#### 4. 验证连接

```powershell
# 无密码连接测试
& "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d archive_management -c "SELECT username FROM \""User\"" WHERE username='admin';"
```

**预期输出**：
```
 username  
-----------
 admin
(1 row)
```

#### 5. 更新 .env 文件（可选）

```powershell
# DATABASE_URL 可以保留密码，也可以去掉
# trust 认证会忽略密码

# 保留密码的格式（不影响功能）：
# DATABASE_URL=postgresql://postgres:pg_20260303120054@localhost:5432/archive_management

# 去掉密码的格式：
# DATABASE_URL=postgresql://postgres@localhost:5432/archive_management
```

#### 6. 重启应用

```powershell
cd D:\ArchiveManagement\scripts
.\stop.bat
.\start.bat
```

#### 7. 测试登录

访问 http://localhost:3000，使用 `admin / admin123` 登录

### 方案 B: 为 postgres 用户设置密码（推荐 - 生产环境）

**适用于**：生产环境，需要密码认证

#### 1. 临时修改 pg_hba.conf 为 trust

```powershell
# 停止服务
Stop-Service -Name PostgreSQL

# 修改文件（见方案 A 步骤 2）
notepad D:\ArchiveManagement\data\database\pg_hba.conf

# 启动服务
Start-Service -Name PostgreSQL
```

#### 2. 设置 postgres 用户密码

```powershell
# 连接数据库
& "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d archive_management

# 在 psql 提示符下执行
ALTER USER postgres WITH PASSWORD '你的密码';
# 例如: ALTER USER postgres WITH PASSWORD 'SecurePassword123!';
\q
```

**注意**：密码需要与 `.env` 中的 `DATABASE_URL` 一致

#### 3. 恢复 pg_hba.conf 为 scram-sha-256

```powershell
# 停止服务
Stop-Service -Name PostgreSQL

# 修改文件
notepad D:\ArchiveManagement\data\database\pg_hba.conf

# 恢复为：
local   all   all   scram-sha-256
host    all   all   127.0.0.1/32   scram-sha-256

# 启动服务
Start-Service -Name PostgreSQL
```

#### 4. 验证密码认证

```powershell
# 使用密码连接（会提示输入密码）
& "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d archive_management -W
# 输入你设置的密码

# 或者通过环境变量
$env:PGPASSWORD="你的密码"
& "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d archive_management -c "SELECT version();"
```

#### 5. 更新 .env 文件

```powershell
# 编辑 .env
notepad D:\ArchiveManagement\config\.env

# 确保 DATABASE_URL 中的密码正确
DATABASE_URL=postgresql://postgres:你的密码@localhost:5432/archive_management
```

#### 6. 重启应用

```powershell
cd D:\ArchiveManagement\scripts
.\stop.bat
.\start.bat
```

### 方案 C: 使用 .pgpass 文件（推荐 - 自动化）

**适用于**：无密码脚本执行

#### 1. 创建 .pgpass 文件

```powershell
# 创建文件
echo "localhost:5432:*:postgres:你的密码" > $env:APPDATA\postgresql\pgpass.conf

# 设置权限（仅管理员可读）
icacls $env:APPDATA\postgresql\pgpass.conf /inheritance:r
icacls $env:APPDATA\postgresql\pgpass.conf /grant:r "$env:USERNAME:R"
```

#### 2. 测试连接

```powershell
# 无需输入密码
& "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d archive_management -c "SELECT version();"
```

## 常见问题

### Q1: 修改 pg_hba.conf 后服务无法启动

**检查语法**：
```powershell
# 测试配置文件语法
& "C:\Program Files\PostgreSQL\16\bin\pg_ctl.exe" validate -D "D:\ArchiveManagement\data\database"
```

**查看日志**：
```powershell
type "D:\ArchiveManagement\data\database\log\postgresql-*.log" | Select-Object -Last 50
```

### Q2: 数据库中没有 admin 用户

**手动创建**：
```powershell
# 连接数据库
& "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d archive_management

# 执行初始化 SQL
\i D:/ArchiveManagement/init-data/init-database.sql
```

### Q3: PM2 日志仍然没有输出

**检查 PM2 配置**：
```powershell
# 查看 PM2 配置
& "$env:APPDATA\npm\pm2.cmd" show archive-management

# 检查日志文件
type D:\ArchiveManagement\app\logs\combined.log
type D:\ArchiveManagement\app\logs\error.log
type D:\ArchiveManagement\app\logs\out.log
```

**手动启动测试**：
```powershell
# 停止 PM2
& "$env:APPDATA\npm\pm2.cmd" stop archive-management

# 手动运行（会输出到控制台）
cd D:\ArchiveManagement\app
node server.js

# 在另一个 PowerShell 窗口测试登录
# 查看第一个窗口的日志输出
```

### Q4: 仍然显示"用户名或密码错误"

**检查实际密码**：

admin 用户的密码哈希在 `init-data/init-database.sql` 中：
```sql
'$2b$12$LQzJtGhV8NHhZ8lJvU2xvkPt9qRqZ3BDSWvZ/KGFrFOFsWdLx/JqgKvMlPkTp9vVcDZaBGhZvJ9R2V6HK6vm'
```

这是 `admin123` 的 bcrypt 哈希。

**验证密码**：
```powershell
# 查看密码哈希
& "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d archive_management -c "SELECT username, password FROM \""User\"" WHERE username='admin';"
```

## 验证成功的标志

1. ✅ PostgreSQL 服务正常运行
2. ✅ 可以用 psql 无密码或密码连接数据库
3. ✅ 数据库中有 admin 用户
4. ✅ PM2 日志有输出
5. ✅ 登录成功后跳转到 /dashboard

## 下一步

修复后，建议：
1. 添加数据库连接日志（修改 lib/prisma.ts）
2. 添加认证日志（修改 auth.ts）
3. 使用结构化日志库（pino/winston）
4. 定期备份数据库
