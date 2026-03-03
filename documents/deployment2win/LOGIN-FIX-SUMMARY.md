# Windows 登录失败问题 - 完整解决方案

## 📋 问题总结

### 症状
1. 前端显示"用户名或密码错误"
2. Network 响应：`{"success":false,"error":"ç"¨æˆ·å"}` （乱码）
3. PM2 和应用日志都没有新输出
4. 数据库查询命令执行失败

### 根本原因

**PostgreSQL 认证配置不匹配**：

1. **安装时**：`initdb -A trust`（不设置密码）
2. **运行时**：`pg_hba.conf` 使用 `scram-sha-256`（要求密码）
3. **结果**：
   - `postgres` 用户没有密码
   - `.env` 中的 `DATABASE_URL` 有密码但无效
   - Prisma 无法连接数据库
   - `authenticateUser()` 失败
   - 返回"用户名或密码错误"

### 为什么没有日志？

从代码分析发现：
1. `auth.ts authorize()` 返回 `null` 时不记录日志
2. `middleware.ts` 完全没有日志
3. `Prisma` 初始化没有错误处理
4. PM2 可能没有正确捕获 `console.error`

---

## ✅ 已提供的解决方案

### 1. 自动修复脚本

**位置**：`documents/deployment2win/scripts/`

| 文件 | 用途 |
|------|------|
| `fix-postgres-auth.ps1` | 主修复脚本（PowerShell） |
| `fix-postgres-auth.bat` | 批处理入口 |
| `verify-login.ps1` | 登录验证脚本 |

**功能**：
- ✅ 自动诊断 PostgreSQL 认证问题
- ✅ 提供 3 种修复方案：
  - 方案 1：改为 trust 认证（快速）
  - 方案 2：设置密码（安全）
  - 方案 3：仅诊断
- ✅ 自动备份配置文件
- ✅ 测试数据库连接
- ✅ 检查 admin 用户
- ✅ 更新 .env 文件
- ✅ 重启应用

### 2. 文档

**位置**：`documents/deployment2win/`

| 文件 | 内容 |
|------|------|
| `QUICK-FIX.md` | 快速修复指南（5 分钟） |
| `DIAGNOSTIC-STEPS.md` | 详细诊断步骤 |
| `ENCODING-FIX.md` | 编码问题修复（已存在） |
| `README.md` | 已更新，添加快速修复链接 |

### 3. 部署包

**最新版本**：`output/archive-management-v20260303121900-offline.zip`

**包含**：
- ✅ 修复后的 `ecosystem.config.js`（UTF-8 环境变量）
- ✅ 修复后的 `login/actions.ts`（客户端重定向）
- ✅ 所有修复脚本和文档
- ✅ Prisma Windows 二进制文件

---

## 🚀 用户操作步骤

### 方案 A：自动修复（推荐）

```powershell
# 1. 解压最新部署包
Expand-Archive archive-management-v20260303121900-offline.zip -DestinationPath D:\

# 2. 进入脚本目录
cd D:\ArchiveManagement\scripts

# 3. 运行修复脚本
.\fix-postgres-auth.bat

# 4. 选择选项 [1] 改为 trust 认证

# 5. 按提示重启应用

# 6. 验证修复
.\verify-login.ps1

# 7. 测试登录
# 浏览器访问 http://localhost:3000
# 用户名: admin
# 密码: admin123
```

### 方案 B：手动修复（如果自动修复失败）

```powershell
# 1. 停止 PostgreSQL
Stop-Service -Name PostgreSQL

# 2. 修改配置文件
notepad D:\ArchiveManagement\data\database\pg_hba.conf

# 3. 将所有 scram-sha-256 改为 trust：
# local   all   all   trust
# host    all   all   127.0.0.1/32   trust

# 4. 启动 PostgreSQL
Start-Service -Name PostgreSQL

# 5. 测试连接
& "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d archive_management -c "SELECT username FROM \""User\"" WHERE username='admin';"

# 6. 重启应用
cd D:\ArchiveManagement\scripts
.\stop.bat
.\start.bat

# 7. 测试登录
# 浏览器访问 http://localhost:3000
```

---

## 📊 修复验证清单

修复完成后，请检查以下项目：

### 1. PostgreSQL 服务
```powershell
Get-Service -Name PostgreSQL
# 应该显示: Running
```

### 2. 数据库连接
```powershell
& "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d archive_management -c "SELECT version();"
# 应该显示 PostgreSQL 版本信息
```

### 3. admin 用户
```powershell
& "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d archive_management -c "SELECT username FROM \""User\"" WHERE username='admin';"
# 应该显示: admin
```

### 4. 应用健康检查
```powershell
Invoke-WebRequest -Uri http://localhost:3000/api/health | Select-Object -ExpandProperty Content
# 应该显示: {"status":"ok","checks":{"database":"ok",...}}
```

### 5. 登录测试
- ✅ 访问 http://localhost:3000/login
- ✅ 输入 `admin / admin123`
- ✅ 点击登录
- ✅ 应该跳转到 `/dashboard` 页面
- ✅ Network 响应应该是正常 JSON（非乱码）

### 6. PM2 日志
```powershell
& "$env:APPDATA\npm\pm2.cmd" logs archive-management --lines 50
# 应该能看到登录相关的日志（如果有添加日志）
```

---

## 🔧 后续优化建议

### 1. 添加数据库连接日志

修改 `archive-management/lib/prisma.ts`：

```typescript
const prismaClientSingleton = () => {
  const client = new PrismaClient({
    log: [
      { level: 'query', emit: 'event' },
      { level: 'error', emit: 'stdout' },
      { level: 'warn', emit: 'stdout' },
    ],
  });

  // 添加连接日志
  client.$connect()
    .then(() => console.log('[Prisma] Database connected successfully'))
    .catch((err) => console.error('[Prisma] Database connection failed:', err));

  return client;
};
```

### 2. 添加认证日志

修改 `archive-management/auth.ts`：

```typescript
async authorize(credentials) {
  console.log('[NextAuth] Authorize called for user:', credentials?.username);
  
  if (!credentials?.username || !credentials?.password) {
    console.error('[NextAuth] Missing credentials');
    return null;
  }

  const authResult = await authenticateUser(credentials.username, credentials.password);
  
  if (!authResult.success || !authResult.user) {
    console.error('[NextAuth] Authentication failed:', authResult.error);
    return null;
  }
  
  console.log('[NextAuth] Authentication successful for user:', authResult.user.username);
  return { ... };
}
```

### 3. 使用结构化日志

安装 pino 或 winston：

```powershell
cd archive-management
npm install pino pino-pretty
```

创建 `lib/logger.ts`：

```typescript
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
    },
  },
});
```

### 4. 移除重复认证

当前流程：
```
loginAction() → authenticateUser() [第 1 次]
            → signIn() → authorize() → authenticateUser() [第 2 次，重复！]
```

优化建议：
- 移除 `loginAction` 中的 `authenticateUser()` 调用
- 只依赖 NextAuth 的 `authorize()` 进行认证
- 或者移除 NextAuth，完全用 Server Action 处理

---

## 📚 相关文档

| 文档 | 位置 | 说明 |
|------|------|------|
| 快速修复 | `QUICK-FIX.md` | 5 分钟快速解决方案 |
| 诊断步骤 | `DIAGNOSTIC-STEPS.md` | 详细诊断和修复步骤 |
| 编码修复 | `ENCODING-FIX.md` | UTF-8 编码问题修复 |
| 部署指南 | `README.md` | 完整部署文档 |
| 环境变量 | `config/.env.template` | 环境变量模板 |

---

## 📞 故障排查

如果修复后仍然有问题：

1. **查看详细日志**：
   ```powershell
   type D:\ArchiveManagement\app\logs\combined.log
   type D:\ArchiveManagement\app\logs\error.log
   & "$env:APPDATA\npm\pm2.cmd" logs archive-management
   ```

2. **检查数据库**：
   ```powershell
   & "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d archive_management -c "SELECT * FROM \""User\"" WHERE username='admin';"
   ```

3. **重新初始化数据**：
   ```powershell
   & "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d archive_management -f D:\ArchiveManagement\init-data\init-database.sql
   ```

4. **完全重置**：
   ```powershell
   cd D:\ArchiveManagement\scripts
   .\stop.bat
   # 删除数据库
   & "C:\Program Files\PostgreSQL\16\bin\dropdb.exe" -U postgres archive_management
   # 重新安装
   .\install.bat
   ```

---

## ✅ 成功标志

修复成功的标志：
- ✅ PostgreSQL 服务运行正常
- ✅ 可以无密码（或密码）连接数据库
- ✅ 数据库中有 admin 用户
- ✅ 应用健康检查返回 `{"status":"ok"}`
- ✅ 登录成功后跳转到 /dashboard
- ✅ Network 响应是正常 JSON（非乱码）
- ✅ PM2 日志有输出（如果添加了日志）

---

**最后更新**：2026-03-03  
**部署包版本**：v20260303121900  
**文档作者**：Sisyphus AI Agent
