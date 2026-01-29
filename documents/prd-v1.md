# 档案管理系统 最终开发方案
## 一、技术栈与核心架构
### 1. 核心技术栈清单
| 模块         | 技术选型                          | 核心作用                                                                 |
|--------------|-----------------------------------|--------------------------------------------------------------------------|
| 全栈框架     | Next.js 15 (App Router)           | 负责 UI 渲染、权限校验、API 路由、Server Actions 端到端开发              |
| 数据库/ORM   | PostgreSQL (Supabase) + Prisma    | 类型安全的数据库操作，自动生成类型定义，保障数据完整性                    |
| 搜索引擎     | Meilisearch                       | 多字段全文检索，支持即时搜索、分词、权重排序，替代传统 SQL LIKE 查询     |
| PDF 预览     | React-PDF-Viewer (基于 PDF.js)    | 专业 PDF 预览、缩放、翻页、打印，支持本地文件渲染                        |
| UI 组件      | shadcn/ui + Tailwind CSS          | 高可定制化组件库，匹配后台管理系统风格，保障样式稳定性                    |
| 身份认证     | NextAuth.js (Auth.js)             | RBAC 权限控制，Token 有效期 7 天，支持记住密码/忘记密码功能              |
| 存储         | 本地硬盘（Docker 目录挂载）       | 存储 PDF 文件，入库时重命名为 archiveID（cuid() 生成）                   |
| 监控部署     | Coolify                           | 自托管服务监控与部署管理                                                |
| 校验工具     | Zod                               | 前后端输入校验，防止注入攻击和脏数据入库                                |
### 2. 项目目录结构（高内聚低耦合）
```
archive-management/
├── app/                      # Next.js App Router 核心目录
│   ├── (auth)/               # 鉴权相关页面/路由
│   │   ├── login/            # 登录页面
│   │   └── api/auth/         # NextAuth.js 接口
│   ├── (archive)/            # 档案核心业务（路由分组）
│   │   ├── archives/         # 档案管理页面
│   │   ├── import/           # 档案入库页面
│   │   ├── logs/             # 操作日志页面
│   │   ├── users/            # 用户权限管理页面
│   │   ├── licenses/         # 授权管理页面
│   │   ├── search/           # 全局搜索页面（登录默认页）
│   │   └── api/              # 后端 API 路由（兜底使用）
│   ├── dashboard/            # 工作台/首页
│   └── layout.tsx            # 全局布局（侧边栏/顶部导航）
├── components/               # 通用 UI 组件
│   ├── ui/                   # shadcn/ui 组件（Button/Table/Dialog 等）
│   ├── archive/              # 档案业务组件（ArchiveTable/PdfPreview 等）
│   ├── auth/                 # 鉴权组件（LoginForm/PasswordReset 等）
│   └── layout/               # 布局组件（Sidebar/Header/Card 等）
├── lib/                      # 共享工具库
│   ├── prisma.ts            # Prisma 客户端实例
│   ├── meilisearch.ts        # Meilisearch 客户端实例
│   ├── validators/           # Zod 校验规则
│   └── utils/                # 通用工具函数（如生成 archiveID）
├── services/                 # 业务逻辑层
│   ├── archive.service.ts    # 档案增删改查/预览/下载逻辑
│   ├── import.service.ts     # 档案入库异步处理逻辑
│   ├── search.service.ts     # 全文检索逻辑
│   └── log.service.ts        # 操作日志记录逻辑
├── hooks/                    # 客户端状态管理 Hooks
│   ├── useArchive.ts         # 档案数据 Hooks
│   ├── usePdfPreview.ts      # PDF 预览 Hooks
│   └── useImportProgress.ts  # 入库进度 Hooks
├── prisma/                   # 数据库配置
│   ├── schema.prisma         # 数据模型定义（含 archiveID/唯一索引）
│   └── migrations/           # 数据库迁移文件
├── public/                   # 静态资源（Logo/图标等）
└── tailwind.config.js        # Tailwind CSS 主题配置（深蓝色主色调）
```

## 二、核心功能实现方案
### 1. 数据模型核心定义（Prisma Schema）
```prisma
// 档案主表
model Archive {
  archiveID        String   @id @default(cuid()) // 系统唯一ID（PDF文件名）
  archiveNo        String   @unique              // 档号（业务唯一）
  fondsNo          String   // 全宗号
  retentionPeriod  String   // 保管期限
  retentionCode    String   // 保管期限代码
  year             String   // 年度
  deptCode         String   // 机构问题代码
  boxNo            String   // 盒号
  pieceNo          String   // 件号
  title            String   // 题名
  deptIssue        String   // 机构问题
  responsible      String   // 责任者
  docNo            String   // 文号
  date             String   // 日期
  pageNo           String   // 页号
  remark           String?  // 备注
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
  importRecordId   String?
  importRecord     ImportRecord? @relation(fields: [importRecordId], references: [id])
  operationLogs    OperationLog[]
}

// 入库记录
model ImportRecord {
  id          String    @id @default(cuid())
  fileName    String    // 原文件名
  archiveId   String?   // 关联档案ID
  status      String    // 等待/进行中/完成/失败
  progress    Int       @default(0) // 入库进度(0-100)
  operator    String    // 操作人
  createdAt   DateTime  @default(now())
  archives    Archive[]
}

// 操作日志
model OperationLog {
  id          String    @id @default(cuid())
  operator    String    // 操作人
  operation   String    // 删除/修改/下载/入库
  target      String    // 档案号+文件名
  ip          String    // IP地址
  time        DateTime  @default(now())
  archiveId   String?
  archive     Archive?  @relation(fields: [archiveId], references: [archiveID])
}

// 用户表
model User {
  id          String    @id @default(cuid())
  username    String    @unique
  password    String    // 加密存储
  role        String    // 管理员/普通用户
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
}

// 授权表
model License {
  id          String    @id @default(cuid())
  deviceCode  String    @unique
  authCode    String    @unique
  expireTime  DateTime
  createdAt   DateTime  @default(now())
}
```

### 2. 核心页面功能实现
#### （1）登录页面（/app/(auth)/login/page.tsx）
- **UI 实现**：基于 shadcn/ui `Input`/`Button`/`Card` 组件，极简后台风格，居中布局，展示“档案管理系统”名称；
- **核心逻辑**：
  - Zod 校验用户名/密码格式，NextAuth.js 处理登录逻辑，生成 7 天有效期 Token；
  - 记住密码：通过 localStorage 存储用户名（密码加密），忘记密码：跳转重置表单（后端校验用户信息）；
  - 错误提示：使用 shadcn/ui `Alert` 组件，优雅提示“用户名/密码错误”。
  - 激活信息：显示有效期到 YYYY-MM-DD，如果过期则显示“激活“按钮，点击激活按钮弹窗，调用后端接口获取设备码，下方文本框可粘贴根据设备码生成的激活码，点击授权按钮，后端接口根据设备码和激活码验证合法性并根据激活码获取激活时长完成授权。激活成功后即可正常登录并使用系统。

#### （2）全局搜索页面（登录默认页 /app/(archive)/search/page.tsx）
- **UI 规范**：严格对齐 Google 极简风格，居中布局：
  - 顶部：系统 Logo + 名称；
  - 核心：宽 60% 自适应搜索框（提示文字“输入题名搜一下”），下方“档案搜索”按钮（浅灰底色，hover 加深）；
  - 交互：无关键词时按钮置灰，点击/回车触发搜索，按钮显示 Loader 加载动画。
- **检索逻辑**：
  - 调用 Meilisearch 全文检索接口，检索范围：档号、题名、机构问题、责任者、文号、备注；
  - 检索完成后拼接 URL 参数（`?searchKey=xxx`），跳转至档案管理列表页。

#### （3）档案管理页面（核心 /app/(archive)/archives/page.tsx）
##### ① 查询区域
- 基础查询：展示档号、题名（模糊匹配）、日期字段（shadcn/ui `Input`/`DatePicker`）；
- 高级查询：通过 shadcn/ui `Accordion` 展开剩余字段（全宗号、保管期限等）；
- 操作按钮：查询（深蓝色主按钮）、重置（浅灰次要按钮），支持按档案号/日期排序。

##### ② 列表区域
- 表格：复用 shadcn/ui `Table` 组件，展示附录所有档案字段，行高 `h-12`，hover 背景 `bg-slate-50`；
- 悬浮操作：行 hover 显示 Lucide Icons 图标按钮（预览/修改/删除/下载），搭配 shadcn/ui `Tooltip`；
- 批量操作：全选 Checkbox + Dropdown 菜单（批量删除/导出），分页使用 shadcn/ui `Pagination`；
- 搜索适配：解析 URL 中 `searchKey` 参数，展示“搜索结果：共 X 条 关键词：「xxx」”提示，新增“返回搜索页”按钮。

##### ③ PDF 预览弹窗
- **容器规范**：shadcn/ui `Dialog` 组件，尺寸 `max-w-[80vw] max-h-[75vh]`，遮罩层点击不关闭，ESC 可关闭；
- **布局**：
  - 头部：标题“档案预览：[档案号]-[题名]”，字号 `text-lg font-medium`；
  - 中间：React-PDF-Viewer 预览区域（dynamic 导入，禁用 SSR）；
  - 底部：缩放（+/-/100%）、翻页（上一页/下一页/页码跳转）、下载、关闭按钮。
- **异常处理**：
  - 无 PDF：显示“暂无可用的 PDF 预览文件”（shadcn/ui `Alert`）；
  - 加载失败：显示“文件加载失败，请重试”，提供“重新加载”按钮（重新请求 `{archiveID}.pdf` 文件）。

#### （4）档案入库页面（/app/(archive)/import/page.tsx）
- **文件选择**：shadcn/ui `Upload` 组件（自定义文件夹选择模式），读取目录及子目录 PDF 文件；
- **入库流程**：
  - 选中文件后点击“入库”，触发 Next.js Server Actions 异步入库流程，避免阻塞页面；
  - 生成 archiveID（cuid()），将 PDF 重命名为 `{archiveID}.pdf` 存储至配置目录；
- **进度展示**：shadcn/ui `Progress` 组件展示单文件进度，状态使用 `Badge` 组件（等待/进行中/完成/失败）；
- **入库记录**：表格展示历史记录（文件名、入库时间、状态、操作人），复用档案列表 Table 组件。

#### （5）操作日志/权限管理/授权管理/系统配置
- **操作日志**：列表展示操作人、类型、对象、时间、IP，支持按操作类型/时间范围筛选；
- **用户权限**：用户列表（用户名/角色/创建时间），新增/编辑/删除用户（表单用 shadcn/ui `Form` + Zod 校验）；
- **授权管理**：授权列表（设备码/授权码/有效期），新增授权时根据设备码生成唯一授权码，授权码算法实现两个功能，一个是合法性验证，一个是有效期。
- **配置管理**：key-value 结构，方便系统变量的存储和使用

### 3. 后端核心功能
#### （1）License 校验
- 全局中间件拦截所有请求，校验 License 有效期，通过本地缓存 License 信息（减轻数据库压力）；
- 校验失败：返回 403 错误，前端展示“授权已过期，请联系管理员”。

#### （2）性能优化
- 缓存层：本地缓存频繁访问的档案元数据（分类列表、热门搜索），减轻磁盘 I/O；
- 异步处理：入库/大文件操作通过 Server Actions 异步执行，避免页面阻塞；
- 幂等性：入库操作通过 archiveID 防止重复入库，接口请求加幂等标识。

## 三、UI 设计与交互规范
### 1. 样式规范（Tailwind CSS 定制）
```js
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: '#1e40af', // 主色调（深蓝色）
        secondary: '#3b82f6', // 辅助色
        neutral: {
          100: '#f3f4f6',
          200: '#e5e7eb',
          900: '#111827',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
};
```

### 2. 通用交互规范
- 敏感操作：删除/修改/入库确认使用 shadcn/ui `Dialog` 确认弹窗，确认按钮为红色变体；
- 异步操作：所有异步请求（入库/删除/检索）添加 Loading 状态 + shadcn/ui `Toast` 提示（操作成功/失败）；
- 响应式：基于 Tailwind 断点（sm/md/lg）适配 1366×768 等后台常用分辨率，布局无错乱；
- PDF 性能：React-PDF-Viewer 懒加载，禁用 SSR，通过 `dynamic` 导入：
  ```tsx
  const PDFViewer = dynamic(() => import('@/components/archive/pdf-viewer-core'), {
    ssr: false,
    loading: () => <div className="flex items-center justify-center h-full">加载预览组件中...</div>,
  });
  ```

## 四、后端核心保障
### 1. 数据完整性
- 档号（archiveNo）设置 Prisma 唯一索引，防止重复；
- archiveID 作为系统唯一标识，PDF 文件名与之一一对应，避免文件覆盖；
- Zod 校验所有输入字段，防止脏数据入库。

### 2. 性能优化
- Meilisearch 替代 SQL LIKE 查询，支持毫秒级全文检索；
- 本地缓存热门档案元数据，减少数据库查询；
- 异步处理大文件入库，避免阻塞主线程。

### 3. 安全性
- 密码加密存储（NextAuth.js + bcrypt），Token 鉴权控制接口访问；
- PostgreSQL 可选开启 RLS 行级安全，限制用户仅访问权限内档案；
- PDF 预览可禁用右键下载/添加水印，保障档案安全。

### 4. 幂等性设计
- 入库接口添加幂等标识（如文件 MD5 + 操作人），防止重复入库；
- 所有写操作（修改/删除）通过 archiveID 精准定位，避免误操作。

## 五、部署与维护规范
1. **部署方式**：通过 Coolify 自托管部署，Docker 挂载本地硬盘目录存储 PDF 文件；
2. **日志管理**：Prisma Middleware 自动记录所有敏感操作（删除/修改/下载/入库），支持按时间/操作人筛选；
3. **扩展性**：模块化目录结构，新增功能只需在对应模块下扩展（如新增“档案分类”仅需修改 `archive.service.ts` + 新增组件）；
4. **兼容性**：适配主流浏览器（Chrome/Firefox/Edge），PDF 预览兼容本地/服务器文件渲染。