# Windows 登录失败 - 命令参考卡

## 🚨 问题诊断（1 分钟）

```powershell
# 1. 进入脚本目录
cd D:\ArchiveManagement\scripts

# 2. 运行修复脚本（自动诊断）
.\fix-postgres-auth.bat

# 3. 选择 [3] 仅诊断，查看问题
```

---

## 🚀 快速修复（5 分钟）

```powershell
# 1. 运行修复脚本
.\fix-postgres-auth.bat

# 2. 选择 [1] 改为 trust 认证

# 3. 按 Y 重启应用

# 4. 测试登录
# 浏览器访问 http://localhost:3000
# 用户名: admin
# 密码: admin123
```

---

## ✅ 验证修复（2 分钟）

```powershell
# 1. 运行验证脚本
.\verify-login.ps1

# 2. 或手动验证
# 测试数据库连接
& "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d archive_management -c "SELECT username FROM \""User\"" WHERE username='admin';"

# 测试应用健康
curl http://localhost:3000/api/health

# 浏览器测试
# http://localhost:3000/login
```

---

## 📋 常用命令

### PostgreSQL
```powershell
# 启动/停止/重启
Start-Service -Name PostgreSQL
Stop-Service -Name PostgreSQL
Restart-Service -Name PostgreSQL

# 连接数据库
& "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d archive_management

# 查看用户
psql> SELECT username, role, status FROM "User";

# 初始化数据
psql> \i D:/ArchiveManagement/init-data/init-database.sql
```

### PM2
```powershell
# 启动/停止/重启应用
& "$env:APPDATA\npm\pm2.cmd" start archive-management
& "$env:APPDATA\npm\pm2.cmd" stop archive-management
& "$env:APPDATA\npm\pm2.cmd" restart archive-management

# 查看日志
& "$env:APPDATA\npm\pm2.cmd" logs archive-management

# 查看状态
& "$env:APPDATA\npm\pm2.cmd" status
```

### 应用脚本
```powershell
cd D:\ArchiveManagement\scripts

# 启动服务
.\start.bat

# 停止服务
.\stop.bat

# 重启服务
.\restart.bat

# 查看日志
.\logs.bat

# 健康检查
.\health.bat

# 数据库备份
.\backup.bat

# 查看状态
.\status.bat
```

---

## 🔧 手动修复（如果脚本失败）

```powershell
# 1. 停止 PostgreSQL
Stop-Service -Name PostgreSQL

# 2. 修改配置
notepad D:\ArchiveManagement\data\database\pg_hba.conf

# 3. 将 scram-sha-256 改为 trust
# local   all   all   trust
# host    all   all   127.0.0.1/32   trust

# 4. 启动 PostgreSQL
Start-Service -Name PostgreSQL

# 5. 重启应用
cd D:\ArchiveManagement\scripts
.\stop.bat && .\start.bat
```

---

## 📝 日志位置

```powershell
# PM2 日志
type D:\ArchiveManagement\app\logs\combined.log
type D:\ArchiveManagement\app\logs\error.log

# PostgreSQL 日志
type D:\ArchiveManagement\data\database\log\postgresql-*.log

# 实时日志
& "$env:APPDATA\npm\pm2.cmd" logs archive-management --lines 100
```

---

## 📞 需要帮助？

1. **快速修复**：`QUICK-FIX.md`
2. **详细诊断**：`DIAGNOSTIC-STEPS.md`
3. **完整方案**：`LOGIN-FIX-SUMMARY.md`
4. **运行脚本**：`scripts\fix-postgres-auth.bat`

---

**记住**：大部分情况下，运行 `fix-postgres-auth.bat` 选择选项 1 即可解决问题！
