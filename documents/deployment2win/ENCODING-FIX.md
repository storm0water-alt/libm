# Windows 登录失败修复方案

## 问题诊断

**现象：**
- 前端显示"用户名或密码错误"
- Network 响应内容为乱码： `ç"¨æˆ·å`
- HTTP 状态码为 200
- Server Actions 返回 RSC payload 格式

**根本原因:**
1. **Windows 系统编码**: Windows 默认使用 GBK (CP936) 编码
2. **Node.js 环境未设置**: PM2 进程未配置 UTF-8 环境变量
3. **RSC Payload 编码问题**: Next.js Server Actions 的响应格式对编码敏感

## 已修复的文件

### 1. `app/(auth)/login/actions.ts`
- 移除了 `redirect()` 调用
- 改为返回 `redirectTo` 字段，- 使用客户端重定向 `router.push()`

### 2. `components/auth/login-form.tsx`
- 添加了对 `redirectTo` 的处理
- 使用 `router.push()` 和 `router.refresh()` 进行页面跳转

### 3. `documents/deployment2win/app/ecosystem.config.js`
- 添加了 UTF-8 环境变量:
  ```javascript
  env: {
    LANG: "C.UTF-8",
    LC_ALL: "C.UTF-8",
  }
  ```

## 部署步骤（Windows 服务器)

### 步骤 1: 停止服务
```powershell
cd D:\ArchiveManagement\scripts
.\\stop.bat
```

### 步骤 2: 备份配置文件
```powershell
Copy-Item D:\ArchiveManagement\config\.env D:\ArchiveManagement\config\.env.backup
```

### 步骤 3: 更新应用文件
```powershell
# 将新的 app/ 目录内容复制到部署目录
Copy-Item -Path "新版本\app\*" -Destination "D:\ArchiveManagement\app" -Recurse -Force
```

或者使用 upgrade.bat 脚本（如果已存在）

### 步骤 4: 重启服务
```powershell
.\\start.bat
```

### 步骤 5: 验证修复
1. 访问 http://localhost:3000
2. 尝试登录: admin / admin123
3. 检查 Network 面板的响应
   - 应该看到正常的 JSON 格式（非乱码）
   - 中文错误信息正常显示
   - 登录成功后自动跳转到 /dashboard

## 验证编码设置

在 Windows PowerShell 中检查 Node.js 进程的环境变量：

```powershell
# 进入 PM2 管理界面
& "$env:APPDATA\npm\pm2.cmd" env

# 查看 archive-management 应用的环境变量
& "$env:APPDATA\npm\pm2.cmd" env 0 | grep -E "LANG|LC_ALL"

# 或者直接查看进程信息
Get-Process -Name node | Select-Object Environment
```

应该输出:
```
LANG        LC_ALL    
----        -------
C.UTF-8    C.UTF-8
```

## 技术说明

### 为什么会出现乱码?

1. **Windows GBK 编码**: Windows 中文系统默认使用 GBK (CP936) 编码
2. **Node.js 继承**: 没有明确设置时, Node.js 使用系统默认编码
3. **RSC Payload**: Server Actions 返回的 React Server Components 格式包含中文文本
4. **编码转换错误**: UTF-8 编码的中文被当作 GBK 解码,导致乱码

### 为什么添加 LANG 和 LC_ALL?

- `LANG`: 设置默认语言环境
- `LC_ALL`: 覆盖所有本地化设置,确保使用 UTF-8
- 这两个环境变量强制 Node.js 使用 UTF-8 处理所有文本

### 为什么移除 redirect()?

Next.js 的 `redirect()` 在 Server Action 中:
1. 抛出 NEXT_REDIRECT 错误
2. 触发 RSC payload 格式响应
3. 编码环境下容易出现乱码

改用客户端重定向:
1. 返回标准 JSON 格式
2. 避免 RSC payload
3. 编码更加可控

## 壔告事项

### Windows 代码页

如果日志仍然显示乱码,可以在 PowerShell 中设置控制台编码:

```powershell
chcp 65001  # 设置控制台为 UTF-8
```

### 防火墙

确保以下端口可访问:
- 3000: Next.js 应用
- 5432: PostgreSQL 数据库
- 7700: Meilisearch 搜索服务

### 数据库连接

如果登录失败，检查:
1. PostgreSQL 服务是否运行:```powershell
Get-Service -Name PostgreSQL
```

2. 数据库连接字符串是否正确
```powershell
type D:\ArchiveManagement\config\.env
# 查看 DATABASE_URL
```

3. 用户是否存在
```powersql
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d archive_management -c "SELECT username FROM \"User\" WHERE username='admin';"
```

## 做如问题

如果修复后仍然有问题:

1. **查看 PM2 日志**
```powershell
& "$env:APPDATA\npm\pm2.cmd" logs archive-management --lines 100
```

2. **查看应用日志**
```powershell
type D:\ArchiveManagement\logs\combined.log
```

3. **联系支持**
   提供以下信息:
   - PM2 日志输出
   - 应用日志内容
   - 错误截图
