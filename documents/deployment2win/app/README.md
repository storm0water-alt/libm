# 档案管理系统 Web应用

## 📋 部署说明

此目录包含**档案管理系统的预编译Web应用**，适用于Windows原生部署。

### 🎯 技术栈
- **Next.js 15** - React全栈框架 (生产构建)
- **Node.js 22** - JavaScript运行时
- **PM2** - 进程管理器
- **Prisma** - 数据库ORM
- **NextAuth.js** - 身份认证

### 📁 目录结构
```
app/
├── .next/                    # Next.js生产构建文件
├── node_modules/              # 依赖包
├── public/                   # 静态资源
├── data/                     # 数据存储目录
│   └── pdfs/                 # PDF档案文件
├── prisma/                   # 数据库配置和客户端
├── lib/                      # 应用库文件
├── server.js                 # 应用入口文件
├── ecosystem.config.js       # PM2配置文件
├── .env.template             # 环境变量模板
├── start.bat                 # 启动脚本
├── stop.bat                  # 停止脚本
└── README.md                 # 本文件
```

---

## 🚀 快速部署

### 1. 环境准备
确保已安装：
- **Node.js 22.12.2+**
- **PM2**: `npm install -g pm2`
- **PostgreSQL**: 数据库服务正常运行
- **Meilisearch**: 搜索服务正常运行

### 2. 配置环境变量
```cmd
# 复制环境变量模板
copy .env.template .env

# 编辑 .env 文件，配置数据库连接和其他参数
notepad .env
```

### 3. 启动应用
```cmd
# 方式一：使用启动脚本 (推荐)
start.bat

# 方式二：使用PM2直接启动
pm2 start ecosystem.config.js

# 方式三：直接运行
set NODE_ENV=production
node server.js
```

### 4. 验证部署
- 访问地址: http://localhost:3000
- 默认账号: admin / admin123

---

## ⚙️ 配置详解

### 环境变量配置 (.env)
关键配置项：

```env
# 数据库连接 (必需)
DATABASE_URL=postgresql://postgres:password@localhost:5432/archive_management

# NextAuth配置 (必需)
NEXTAUTH_SECRET=your_minimum_32_character_secret_key
NEXTAUTH_URL=http://localhost:3000

# 搜索引擎配置
MEILISEARCH_URL=http://localhost:7700
MEILISEARCH_MASTER_KEY=your_search_key

# 文件存储路径
ARCHIVE_STORAGE_PATH=./data/pdfs
```

### PM2配置 (ecosystem.config.js)
- **内存限制**: 1GB自动重启
- **日志轮转**: JSON格式，带时间戳
- **自动重启**: 异常退出后自动重启
- **监控**: 应用健康状态监控

---

## 🛠 应用管理

### 启动和停止
```cmd
# 启动应用
start.bat

# 停止应用
stop.bat

# 重启应用
pm2 restart archive-management

# 查看状态
pm2 status
```

### 日志管理
```cmd
# 查看实时日志
pm2 logs archive-management

# 查看错误日志
type logs\error.log

# 查看访问日志
type logs\out.log
```

### 监控和调试
```cmd
# 查看详细状态
pm2 describe archive-management

# 查看监控面板
pm2 monit

# 进入调试模式
pm2 logs archive-management --lines 100
```

---

## 📊 性能优化

### 内存管理
- **自动重启**: 内存超过1GB时自动重启
- **内存监控**: PM2实时监控内存使用
- **垃圾回收**: Node.js自动垃圾回收优化

### 并发处理
- **单实例模式**: 稳定性优先
- **异步处理**: 所有I/O操作异步化
- **连接池**: 数据库连接池优化

### 缓存策略
- **静态缓存**: Next.js自动静态资源缓存
- **数据缓存**: Redis可选缓存层
- **搜索缓存**: Meilisearch内置缓存

---

## 🔧 故障排查

### 应用无法启动
```cmd
# 1. 检查环境变量
type .env

# 2. 检查端口占用
netstat -an | findstr :3000

# 3. 检查数据库连接
node -e "console.log(process.env.DATABASE_URL)"

# 4. 检查Node.js版本
node --version
```

### 常见问题解决

#### 数据库连接失败
1. 确认PostgreSQL服务运行: `net start PostgreSQL`
2. 检查连接字符串格式
3. 确认数据库用户权限
4. 验证SSL证书配置

#### 搜索功能异常
1. 确认Meilisearch服务运行: `net start Meilisearch`
2. 检查主密钥配置
3. 验证搜索索引是否创建

#### 文件上传失败
1. 检查存储目录权限
2. 确认磁盘空间充足
3. 验证文件大小限制

---

## 📈 监控和维护

### 日志文件位置
```
logs/
├── combined.log      # 综合日志
├── out.log          # 标准输出
├── error.log        # 错误日志
└── pm2/             # PM2进程日志
```

### 定期维护
```cmd
# 清理旧日志 (保留最近30天)
forfiles /p logs /m *.log /d -30 /c "cmd /c del @path"

# 更新依赖包
npm update

# 重新生成Prisma客户端
npx prisma generate

# 检查数据库连接
npx prisma db pull
```

### 备份重要文件
```cmd
# 备份配置文件
copy .env ..\backup\env-backup-%date%.txt
copy ecosystem.config.js ..\backup\

# 备份数据文件
xcopy data\pdfs ..\backup\pdfs\ /E /I /Y
```

---

## 🆘 技术支持

### 信息收集
```cmd
# 生成系统信息报告
systeminfo > system-info.txt

# 生成Node.js环境报告
node -e "console.log(JSON.stringify(process.versions, null, 2))" > node-info.txt

# 生成PM2状态报告
pm2 report
```

### 联系支持时请提供
1. **系统信息**: Windows版本，Node.js版本
2. **错误日志**: `logs/error.log` 的最新内容
3. **配置信息**: `.env` 文件 (隐藏敏感信息)
4. **问题描述**: 详细的错误现象和重现步骤

---

## 📚 相关文档

- **完整部署方案**: `../README.md`
- **系统安装脚本**: `../scripts/install.ps1`
- **服务管理脚本**: `../scripts/`
- **数据库初始化**: `../init-data/`

---

**版本**: 1.0.0 (Windows原生部署版)  
**更新时间**: 2026-01-31  
**兼容性**: Windows 10+ / Windows Server 2019+  
**依赖要求**: Node.js 22+, PostgreSQL 16+, Meilisearch 1.8+