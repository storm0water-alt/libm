# 正成档案管理系统

一个基于 Next.js 构建的现代化档案管理系统，支持全文搜索、分类管理和标签系统。

## 功能特性

- 🔍 **全文搜索** - 基于 Meilisearch 的高性能全文搜索
- 📁 **档案管理** - 完整的档案增删改查功能
- 🏷️ **分类标签** - 灵活的分类和标签筛选系统
- 👥 **用户管理** - 基于角色的权限控制（管理员/普通用户）
- 📊 **数据看板** - 实时统计和操作日志
- 📥 **批量导入** - 支持批量导入档案数据

## 技术栈

- **前端框架**: Next.js 15 (App Router)
- **UI 组件**: shadcn/ui + Tailwind CSS
- **数据库**: PostgreSQL + Prisma ORM
- **搜索引擎**: Meilisearch
- **身份认证**: NextAuth.js
- **容器化**: Docker + Docker Compose

## 快速开始

### 前置要求

- Node.js 18+
- PostgreSQL 14+
- Docker 和 Docker Compose（用于 Meilisearch）

### 1. 克隆项目

```bash
git clone <repository-url>
cd archive-management
```

### 2. 安装依赖

```bash
npm install
```

### 3. 配置环境变量

复制 `.env.example` 到 `.env` 并配置：

```bash
cp .env.example .env
```

编辑 `.env` 文件：

```env
# 数据库配置
DATABASE_URL="postgresql://user:password@localhost:5432/archive_db"

# NextAuth 配置
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"

# Meilisearch 配置
MEILISEARCH_URL="http://localhost:7700"
MEILISEARCH_API_KEY="your-master-key-here"
MEILISEARCH_INDEX_NAME="archives"
```

### 4. 启动 Meilisearch

使用 Docker Compose 启动 Meilisearch：

```bash
docker-compose up -d meilisearch
```

这将在 `http://localhost:7700` 启动 Meilisearch 服务。

### 5. 初始化数据库

```bash
# 生成 Prisma Client
npx prisma generate

# 运行数据库迁移
npx prisma migrate deploy

# 填充初始数据（包括测试用户、示例档案和 Meilisearch 索引）
npm run db:seed
```

### 6. 启动开发服务器

```bash
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000) 查看应用。

## 测试账号

运行 `npm run db:seed` 后，可以使用以下测试账号：

- **管理员**: `admin` / `admin123`
- **普通用户**: `user` / `user123`

## Meilisearch 配置

### 环境变量说明

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `MEILISEARCH_URL` | Meilisearch 服务地址 | `http://localhost:7700` |
| `MEILISEARCH_API_KEY` | Meilisearch 主密钥 | - |
| `MEILISEARCH_INDEX_NAME` | 索引名称 | `archives` |

### 索引设置

系统会自动配置 Meilisearch 索引，包括：

- **可搜索字段**: title（权重最高）、archiveNo、docNo、deptIssue、responsible、remark
- **可过滤字段**: category、tags、status、year
- **可排序字段**: createdAt、title
- **容错设置**: 支持拼写错误和中文分词

### 重建索引

如果需要重建搜索索引：

```bash
# 方法 1: 运行 seed 脚本（会重建数据库和索引）
npm run db:seed

# 方法 2: 仅索引现有档案
# 在代码中调用 batchIndexArchives() 方法
```

## Docker 部署

### 使用 Docker Compose

```bash
# 构建并启动所有服务
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

### 服务端口

- 应用服务: `http://localhost:3000`
- Meilisearch: `http://localhost:7700`
- PostgreSQL: `localhost:5432`

## 常见问题

### Meilisearch 连接失败

1. 确认 Docker 已启动
2. 检查 Meilisearch 容器是否运行: `docker ps`
3. 验证环境变量配置是否正确
4. 查看 Meilisearch 日志: `docker-compose logs meilisearch`

### 搜索不工作

1. 确认 Meilisearch 正在运行
2. 检查索引是否已创建: 访问 `http://localhost:7700/indexes`
3. 重新运行 seed 脚本初始化索引
4. 查看应用日志中的错误信息

### 数据库迁移失败

1. 检查 PostgreSQL 是否正在运行
2. 验证 `DATABASE_URL` 配置是否正确
3. 手动运行: `npx prisma migrate reset`

## 开发指南

### 项目结构

```
archive-management/
├── app/                    # Next.js App Router 页面
├── components/             # React 组件
├── lib/                    # 工具库
├── services/               # 业务逻辑层
├── prisma/                 # 数据库 schema 和迁移
└── public/                 # 静态资源
```

### 代码规范

项目使用 ESLint 和 TypeScript 进行代码质量控制。

```bash
# 运行代码检查
npm run lint

# 运行测试
npm run test
```

## 构建生产版本

```bash
# 构建应用
npm run build

# 启动生产服务器
npm start
```

## 许可证

本项目仅供内部使用。

---


# Windows 离线安装 PM2 完整教程
你有**Windows 系统 + 已安装 Node.js**，**完全断网**，我给你一套**零依赖、纯离线、一步到位**的 PM2 安装方法，不用联网、不用配置镜像，直接复制文件就能用。

## 前置条件
1. Windows 电脑（已安装 Node.js 和 npm，能执行 `node -v` / `npm -v`）
2. 一台**能联网的电脑**（用来下载 PM2 离线包，下载后拷贝到目标 Windows 机器）
3. U盘/移动硬盘（用于拷贝文件）

---

## 步骤 1：在联网电脑上下载 PM2 完整离线包
### 方法：直接下载官方打包好的完整离线依赖包（最省心）
我给你直接用**npm 打包离线依赖**的方式，一次性下载 **pm2 + 所有依赖**，打包成一个压缩包。

在**联网电脑**上打开命令行，执行：
```bash
# 创建一个临时文件夹
mkdir pm2-offline
cd pm2-offline

# 下载 pm2 及其所有依赖（不安装，只下载）
npm pack pm2 --verbose
```

执行完后，文件夹里会生成一个类似：
`pm2-5.3.0.tgz`（版本号可能不同）

**把这个 .tgz 文件拷贝到你的离线 Windows 机器上**（比如放到 `D:\pm2-offline\`）

---

## 步骤 2：离线 Windows 机器上安装
### 1. 把下载好的 `pm2-x.x.x.tgz` 放到一个目录
例如：
```
D:\pm2-offline\pm2-5.3.0.tgz
```

### 2. 打开 CMD 或 PowerShell，进入该目录
```bash
cd D:\pm2-offline
```

### 3. 执行离线安装命令（核心）
```bash
npm install pm2-5.3.0.tgz -g --offline
```

✅ **关键参数**
- `-g`：全局安装（让 pm2 变成系统命令）
- `--offline`：强制离线模式，**绝对不联网**

---

## 步骤 3：验证安装是否成功
安装完成后，直接执行：
```bash
pm2 -v
```

出现版本号（如 `5.3.0`）= **安装成功！**

测试启动一个进程：
```bash
pm2 start npm --name "test" -- run start
```

---

## 常见问题（必看）
### 1. 报错：npm 不是内部命令
解决：你的 Node.js 没配置环境变量
- 找到 Node.js 安装目录（默认 `C:\Program Files\nodejs\`）
- 把这个路径添加到 Windows **系统环境变量 Path**
- 重启 CMD 即可

### 2. 安装时报错“缺少依赖”
原因：你只下载了 pm2，没下载完整依赖
解决：**必须用我上面的 `npm pack pm2` 命令下载**，它会自动打包所有依赖。

### 3. 安装成功但 pm2 命令无效
解决：重新打开一个 CMD，Windows 环境变量需要重启终端生效。

---

## 极简总结
1. 联网电脑：`npm pack pm2` 生成离线包
2. 拷贝到离线 Windows
3. 离线执行：`npm install pm2xxx.tgz -g --offline`
4. 验证：`pm2 -v`

全程**不需要网络、不需要镜像、不需要额外工具**，纯原生 npm 离线安装。

---

### 总结
1. 用**联网电脑**执行 `npm pack pm2` 获取完整离线包
2. 拷贝到离线 Windows 机器
3. 执行 `npm install 包名.tgz -g --offline` 完成安装
4. 验证 `pm2 -v` 即可使用