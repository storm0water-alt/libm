# Windows 登录失败快速修复指南

## ⚠️ 问题症状

1. **前端显示**："用户名或密码错误"
2. **Network 响应**：`{"success":false,"error":"ç"¨æˆ·å"}` （乱码）
3. **PM2 日志**：没有新输出，停留在启动日志
4. **数据库查询命令失败**

---

## 🎯 根本原因

**PostgreSQL 认证配置不匹配**：

- `pg_hba.conf` 使用 `scram-sha-256`（要求密码）
- 但 `postgres` 用户没有密码（安装时用 `-A trust`）
- Prisma 连接失败 → 登录失败

---

## 🚀 快速修复（5 分钟）

### 方案 A：改为 trust 认证（推荐）

```powershell
# 1. 进入脚本目录
cd D:\ArchiveManagement\scripts

# 2. 运行修复脚本
.\fix-postgres-auth.bat

# 或直接运行 PowerShell 脚本
PowerShell -ExecutionPolicy Bypass -File .\fix-postgres-auth.ps1

# 3. 选择选项 [1] 改为 trust 认证

# 4. 重启应用（脚本会提示）
```

### 方案 B：手动修复

```powershell
# 1. 停止服务
Stop-Service -Name PostgreSQL

# 2. 修改配置文件
notepad D:\ArchiveManagement\data\database\pg_hba.conf

# 将所有 scram-sha-256 改为 trust：
# local   all   all   trust
# host    all   all   127.0.0.1/32   trust

# 3. 启动服务
Start-Service -Name PostgreSQL

# 4. 测试连接
& "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d archive_management -c "SELECT username FROM \""User\"" WHERE username='admin';"

# 5. 重启应用
cd D:\ArchiveManagement\scripts
.\restart.bat
```

---

## ✅ 验证修复

```powershell
# 运行验证脚本
cd D:\ArchiveManagement\scripts
.\verify-login.ps1

# 或手动测试
# 1. 访问 http://localhost:3000
# 2. 登录：admin / admin123
# 3. 应该跳转到 /dashboard
```

---

## 📋 完整诊断步骤

如果快速修复失败，请参考：

**详细诊断文档**：`DIAGNOSTIC-STEPS.md`

包含：
- ✅ 5 个诊断步骤
- ✅ 3 个解决方案（trust/密码/pgpass）
- ✅ 常见问题 FAQ
- ✅ 日志分析方法

---

## 🔧 其他解决方案

### 方案 C：设置密码（生产环境推荐）

```powershell
# 1. 运行修复脚本
.\fix-postgres-auth.ps1

# 2. 选择选项 [2] 为 postgres 设置密码

# 3. 输入新密码（记住它！）

# 4. 脚本会自动：
#    - 临时切换到 trust
#    - 设置密码
#    - 恢复 scram-sha-256
#    - 更新 .env 文件
```

---

## 📝 日志位置

```powershell
# PM2 日志
type D:\ArchiveManagement\app\logs\combined.log
type D:\ArchiveManagement\app\logs\error.log

# PostgreSQL 日志
type D:\ArchiveManagement\data\database\log\postgresql-*.log

# 查看 PM2 实时日志
& "$env:APPDATA\npm\pm2.cmd" logs archive-management
```

---

## ❓ 常见问题

### Q1: 修复后仍然显示"用户名或密码错误"

**检查**：
1. 数据库中是否有 admin 用户？
   ```powershell
   & "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d archive_management -c "SELECT username FROM \""User\"";"
   ```

2. 如果没有，初始化数据：
   ```powershell
   & "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d archive_management -f D:\ArchiveManagement\init-data\init-database.sql
   ```

### Q2: 响应仍然是乱码

**检查**：
1. ecosystem.config.js 中是否设置了 UTF-8？
   ```powershell
   type D:\ArchiveManagement\app\ecosystem.config.js | findstr "LANG"
   ```
   
   应该看到：
   ```javascript
   LANG: 'C.UTF-8',
   LC_ALL: 'C.UTF-8'
   ```

2. 如果没有，手动添加后重启应用

### Q3: PM2 日志仍然没有输出

**可能原因**：
- PM2 没有正确捕获 console.error
- 需要添加结构化日志（pino/winston）

**临时方案**：
```powershell
# 手动运行应用（会输出到控制台）
cd D:\ArchiveManagement\app
node server.js

# 在另一个窗口测试登录，查看日志
```

---

## 🛡️ 安全建议

### 开发/测试环境
- ✅ 使用 trust 认证（简单快速）
- ⚠️ 仅限内网访问

### 生产环境
- ✅ 使用密码认证（scram-sha-256）
- ✅ 定期更换 postgres 密码
- ✅ 限制数据库访问 IP
- ✅ 启用防火墙规则

---

## 📞 需要帮助？

1. **查看详细文档**：`DIAGNOSTIC-STEPS.md`
2. **运行验证脚本**：`.\verify-login.ps1`
3. **查看日志**：`.\logs.bat`
4. **联系支持**：提供日志文件和错误截图

---

## 📚 相关文档

- **诊断步骤**：`DIAGNOSTIC-STEPS.md`
- **编码修复**：`ENCODING-FIX.md`
- **部署指南**：`README.md`
- **应用配置**：`../config/.env.template`

---

**最后更新**：2026-03-03
