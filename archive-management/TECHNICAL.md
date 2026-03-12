# 档案管理系统技术文档

## 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | Next.js 15 (App Router) + React 18 |
| 语言 | TypeScript 5.9 |
| 数据库 | PostgreSQL + Prisma ORM 5.22 |
| 搜索引擎 | Meilisearch |
| 认证 | NextAuth.js v5 (JWT) |
| UI | shadcn/ui + Radix UI + Tailwind CSS 4 |
| 测试 | Vitest (单元) + Playwright (E2E) |
| 构建 | Standalone output (Docker 部署) |

---

## 系统架构

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Next.js    │────>│  Services   │────>│  PostgreSQL │
│  App Router │     │  业务逻辑层  │     │  + Prisma   │
└─────────────┘     └─────────────┘     └─────────────┘
       │                   │
       │                   ▼
       │            ┌─────────────┐
       │            │ Meilisearch │
       │            └─────────────┘
       ▼
┌─────────────┐
│ File Storage│  (Bucket: /data/pdfs/{year}-{bucket}/)
└─────────────┘
```

---

## 目录结构

```
archive-management/
├── app/                      # Next.js App Router
│   ├── (auth)/               # 认证页面 (login, password-reset)
│   ├── (archive)/            # 业务页面 (需登录)
│   │   ├── archives/         # 档案管理 (列表/详情/新建/编辑)
│   │   ├── dashboard/        # 数据看板
│   │   ├── search/           # 全文搜索
│   │   ├── users/            # 用户管理 [Admin]
│   │   ├── config/           # 系统配置 [Admin]
│   │   ├── licenses/         # 授权管理 [Admin]
│   │   ├── logs/             # 操作日志
│   │   └── import/           # 批量导入
│   ├── api/                  # API 路由
│   │   ├── archives/         # 档案 CRUD + 导出 + PDF
│   │   ├── search/           # 搜索 API
│   │   ├── auth/[...nextauth]# NextAuth 处理器
│   │   ├── licenses/         # 授权管理
│   │   ├── users/            # 用户管理
│   │   ├── config/           # 配置管理
│   │   ├── logs/             # 日志查询
│   │   ├── import/           # 批量导入
│   │   ├── upload/chunk/     # 分片上传
│   │   └── health/           # 健康检查
│   └── pdfs/                 # PDF 文件服务
├── components/               # React 组件
│   ├── ui/                   # 基础 UI 组件 (shadcn/ui)
│   ├── archive/              # 档案相关组件
│   ├── auth/                 # 认证相关组件
│   ├── config/               # 配置相关组件
│   ├── licenses/             # 授权相关组件
│   ├── search/               # 搜索相关组件
│   ├── pdf/                  # PDF 查看器
│   └── sidebar/              # 侧边栏导航
├── services/                 # 业务逻辑层
│   ├── archive.service.ts    # 档案 CRUD + 导入/导出
│   ├── auth.service.ts       # 用户认证
│   ├── user.service.ts       # 用户管理
│   ├── license.service.ts    # 授权管理 (AES-256-GCM)
│   ├── config.service.ts     # 系统配置
│   ├── log.service.ts        # 操作日志
│   ├── meilisearch.service.ts# 搜索引擎集成
│   ├── import.service.ts     # PDF 批量导入
│   └── csv-import.service.ts # CSV 导入
├── lib/                      # 工具库
│   ├── prisma.ts             # Prisma 客户端
│   ├── prisma-middleware.ts  # Prisma 中间件 (操作日志)
│   ├── permissions.ts        # 权限控制
│   ├── meilisearch.ts        # Meilisearch 客户端
│   ├── config.ts             # 配置工具
│   ├── license-cache.ts      # 授权缓存
│   ├── config-cache.ts       # 配置缓存
│   ├── device-fingerprint.ts # 设备指纹
│   └── utils/                # 通用工具
├── hooks/                    # React Hooks
│   └── use-device-fingerprint.ts
├── prisma/                   # 数据库
│   ├── schema.prisma         # 数据模型定义
│   └── seed.ts               # 初始数据
├── auth.ts                   # NextAuth 配置
└── middleware.ts             # 路由保护中间件
```

---

## 服务层

| 服务 | 文件 | 职责 |
|------|------|------|
| ArchiveService | archive.service.ts | 档案 CRUD、批量导入导出、统计 |
| AuthService | auth.service.ts | 用户认证、密码验证 |
| UserService | user.service.ts | 用户管理、状态控制 |
| LicenseService | license.service.ts | 授权生成/验证/激活 (AES-256-GCM) |
| ConfigService | config.service.ts | 系统配置 KV 存储 |
| LogService | log.service.ts | 操作日志查询导出 |
| MeilisearchService | meilisearch.service.ts | 全文搜索、索引管理 |
| ImportService | import.service.ts | PDF 批量导入、进度追踪 |
| CsvImportService | csv-import.service.ts | CSV 数据导入 |

---

## 数据模型 (Prisma Schema)

### ER 关系

```
User ──< ImportRecord ──< Archive
  │                              │
  └────< OperationLog >─────────┘

SystemConfig ──< ConfigHistory
License
```

### 核心表

**User（用户）**
```prisma
model User {
  id            String   @id @default(cuid())
  username      String   @unique
  password      String            // bcrypt 哈希
  role          String   @default("user")     // admin | user
  status        String   @default("enabled")  // enabled | disabled
  lastLoginAt   DateTime?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}
```

**Archive（档案）**
```prisma
model Archive {
  archiveID       String   @id @default(cuid())
  archiveNo       String   @unique    // 档号（业务主键）
  fondsNo         String              // 全宗号
  retentionPeriod String              // 保管期限
  retentionCode   String              // 保管代码
  year            String              // 年度
  deptCode        String              // 部门代码
  boxNo           String              // 盒号
  pieceNo         String              // 件号
  title           String              // 题名
  deptIssue       String              // 责任者
  responsible     String              // 经办人
  docNo           String              // 文号
  date            String              // 日期
  pageNo          String              // 页数
  remark          String?
  fileUrl         String?             // PDF 路径
  importRecordId  String?
  importRecord    ImportRecord?
  operationLogs   OperationLog[]
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([archiveNo, fondsNo, year, title, createdAt])
}
```

**License（授权）**
```prisma
model License {
  id         String   @id @default(cuid())
  name       String   @default("未命名授权")
  deviceCode String   @unique    // 设备码
  authCode   String   @unique    // 激活码 (AES-256-GCM)
  expireTime DateTime            // 过期时间
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  @@index([deviceCode, expireTime])
}
```

**其他模型**
- **ImportRecord** - 导入记录 (PDF/CSV 批量导入进度追踪)
- **OperationLog** - 操作日志 (审计追踪)
- **SystemConfig** - 系统配置 (KV 存储)
- **ConfigHistory** - 配置变更历史

---

## 接口设计

### 认证 `/api/auth`

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/auth/signin` | 登录 |
| POST | `/api/auth/signout` | 登出 |

### 档案 `/api/archives`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/archives` | 列表（分页、筛选） |
| POST | `/api/archives` | 创建 |
| GET | `/api/archives/:id` | 详情 |
| PUT | `/api/archives/:id` | 更新 |
| DELETE | `/api/archives/:id` | 删除 |
| GET | `/api/archives/:id/pdf` | 获取 PDF |
| GET | `/api/archives/export` | 导出（CSV/ZIP） |

### 搜索 `/api/search`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/search?q={query}` | 全文搜索 |
| POST | `/api/search/init` | 初始化索引 |

### 导入 `/api/import`

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/import` | PDF 批量导入 |
| POST | `/api/import/csv` | CSV 导入 |
| POST | `/api/import/csv/validate` | CSV 验证 |
| GET | `/api/import/:id` | 导入进度 |
| GET | `/api/import/csv/:recordId` | CSV 导入详情 |

### 用户管理 `/api/users` [Admin]

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/users` | 用户列表 |
| POST | `/api/users` | 创建 |
| PUT | `/api/users/:id` | 更新 |
| DELETE | `/api/users/:id` | 删除 |

### 其他

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/logs` | 操作日志 |
| GET | `/api/logs/export` | 导出日志 |
| GET | `/api/dashboard/stats` | 仪表盘统计 |
| GET | `/api/config` | 系统配置 [Admin] |
| GET | `/api/licenses` | 许可证管理 [Admin] |
| GET | `/api/health` | 健康检查 |

---

## 认证授权

### 流程

```
请求 → 中间件 → 检查 JWT → 检查权限 → 业务处理
```

### 权限

| 角色 | 权限范围 |
|------|---------|
| admin | 全部功能 |
| user | 档案、搜索、导入、日志（只读） |

### 路由保护 (middleware.ts)

```typescript
// 公开路由
const publicRoutes = ["/login", "/api/auth", "/_next", "/api/health"];

// 管理员路由
const ADMIN_ROUTES = ["/users", "/config"];
```

---

## 核心模块

### 1. 档案服务 (archive.service.ts)

```typescript
// 主要函数
queryArchives(params)      // 分页查询
getArchiveById(id)         // 按 ID 获取
getArchiveByNo(archiveNo)  // 按档号获取
createArchive(data)        // 创建 (含重复检测)
updateArchive(id, data)    // 更新
deleteArchive(id)          // 删除 (含日志记录)
batchDeleteArchives(ids)   // 批量删除
importArchives(archives)   // 批量导入
getArchiveFilters()        // 获取筛选选项
getArchiveStats()          // 统计数据
```

### 2. 搜索服务 (meilisearch.service.ts)

```typescript
// 主要函数
searchArchives(query, options)  // 搜索 (自动降级到 Prisma)
indexArchive(archive)           // 索引单个
batchIndexArchives(archives)    // 批量索引
deleteFromIndex(archiveId)      // 删除索引
initializeMeilisearch()         // 初始化索引

// 降级策略: Meilisearch 不可用时自动回退到 Prisma 查询
```

### 3. 授权系统 (license.service.ts)

```typescript
// 加密: AES-256-GCM + Base64 URL-safe
// 格式: XXXX.XXXX.XXXX... (4字符分组)

generateDeviceCode(fingerprint)      // 生成设备码
generateAuthCode(deviceCode, days)   // 生成激活码
validateAuthCode(authCode)           // 验证激活码
activateLicense(deviceCode, authCode)// 激活授权
checkLicense(deviceCode)             // 检查授权状态 (含缓存)
renewLicense(licenseId, days)        // 续期
```

### 4. 操作日志 (Prisma Middleware)

自动记录 Archive 的 create/update/delete 操作

---

## 文件存储

**Bucket 策略**：按年份 + 哈希分目录存储

```
/data/pdfs/{year}-{bucket}/{archiveID}.pdf

示例：
/data/pdfs/2026-0/clh12345.pdf
/data/pdfs/2011-9/clh67890.pdf
```

Bucket 编号 = 档号哈希 % 10

---

## 环境变量

```env
# 数据库
DATABASE_URL="postgresql://user:pass@host:5432/db"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key"

# Meilisearch
MEILISEARCH_URL="http://localhost:7700"
MEILISEARCH_API_KEY="master-key"
MEILISEARCH_INDEX_NAME="archives"

# 存储
PDF_STORAGE_PATH="/data/pdfs"

# 授权 (可选, 有默认值)
LICENSE_SECRET_KEY="your-license-key"
```

---

## 常用命令

```bash
# 开发
npm run dev              # 启动开发服务器
npm run build            # 构建生产版本
npm start                # 启动生产服务器

# 数据库
npx prisma generate      # 生成 Prisma 客户端
npx prisma migrate dev   # 开发迁移
npx prisma migrate deploy# 生产迁移
npm run db:seed          # 填充初始数据

# 测试
npm run test             # 运行单元测试
npm run test:ui          # Vitest UI
npm run test:e2e         # 运行 E2E 测试
npm run lint             # 代码检查
```

---

## 测试账号

| 角色 | 用户名 | 密码 |
|------|--------|------|
| 管理员 | admin | admin123 |
| 普通用户 | user | user123 |

---

## 扩展指南

### 添加新 API 端点
1. 在 `app/api/` 下创建路由文件
2. 在 `services/` 中添加业务逻辑
3. 更新 Prisma schema (如需新模型)

### 添加新页面
1. 在 `app/(archive)/` 下创建页面
2. 在 `components/sidebar/sidebar.tsx` 添加导航项
3. 如需管理员权限，在 `lib/permissions.ts` 添加路由

### 添加新组件
1. 在 `components/` 对应目录下创建
2. 使用 shadcn/ui 基础组件构建

---

*文档更新时间: 2026-03-12*
