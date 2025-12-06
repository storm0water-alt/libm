# 档案管理系统 - Archive Management System

一个基于Vue3 + Element Plus的现代化档案管理系统UI，提供完整的档案管理、入库、查询和操作审计功能。

## 🚀 快速开始

### 环境要求

- Node.js >= 20.19.0
- npm >= 9.0.0

### 安装依赖

```bash
npm install
```

### 启动开发服务器

```bash
npm run dev
```

系统将在 http://localhost:5173 启动

### 构建生产版本

```bash
npm run build
```

### 预览生产版本

```bash
npm run preview
```

## 📋 功能特性

### 核心功能

- **用户认证系统** - 安全的登录/登出，支持记住密码
- **工作台仪表板** - 数据统计概览，快捷操作入口
- **档案管理** - 完整的档案CRUD操作，支持多条件搜索
- **批量操作** - 批量删除、导出等操作
- **文件入库** - 外部设备文件扫描和批量导入
- **PDF预览** - 内置PDF预览器，支持缩放、翻页、全屏
- **操作日志** - 完整的操作审计和日志查询
- **用户权限管理** - 基于角色的权限控制

### 技术特性

- **响应式设计** - 完美适配桌面端和移动端
- **暗色模式** - 支持明暗主题切换
- **类型安全** - 完整的TypeScript支持
- **组件化架构** - 高度可复用的组件设计
- **国际化支持** - 中文界面和提示

## 🎨 界面展示

### 登录页面
- 现代化的登录界面设计
- 验证码支持
- 演示账号快速登录

### 工作台
- 数据统计卡片
- 操作趋势图表
- 最近档案和操作记录

### 档案管理
- 多条件高级搜索
- 表格排序和分页
- PDF文件预览
- 批量操作支持

### 文件入库
- 外部设备文件扫描
- 实时入库进度显示
- 入库记录管理

## 🔐 演示账号

系统提供以下演示账号：

- **管理员**: admin / admin123
- **普通用户**: user / user123

## 📁 项目结构

```
src/
├── components/          # 公共组件
│   ├── common/         # 通用组件
│   ├── layout/         # 布局组件
│   └── business/       # 业务组件
├── views/              # 页面组件
│   ├── Login/          # 登录页面
│   ├── Dashboard/      # 工作台
│   ├── Archive/        # 档案管理
│   ├── Import/         # 入库管理
│   ├── Logs/           # 操作日志
│   └── Users/          # 用户管理
├── stores/             # 状态管理
├── utils/              # 工具函数
├── styles/             # 全局样式
└── types/              # TypeScript类型
```

## 🛠️ 技术栈

- **前端框架**: Vue 3.5+
- **UI组件库**: Element Plus 2.11+
- **状态管理**: Pinia 3.0+
- **路由管理**: Vue Router 4.6+
- **样式方案**: Sass + CSS Variables
- **构建工具**: Vite 7.2+
- **类型检查**: TypeScript 5.9+
- **PDF处理**: PDF.js 5.4+

## 🎯 核心组件说明

### StatCard 统计卡片
用于显示数据统计信息，支持趋势指示和点击交互：

```vue
<StatCard
  :data="{
    title: '档案总数',
    value: '1,234',
    icon: 'Document',
    color: 'primary',
    trend: 12.5
  }"
  @click="handleClick"
/>
```

### SearchableTable 可搜索表格
集成了搜索、分页、排序和批量操作的表格组件：

```vue
<SearchableTable
  :data="tableData"
  :columns="tableColumns"
  :search-conditions="searchConditions"
  :pagination="pagination"
  @search="handleSearch"
  @selection-change="handleSelection"
/>
```

### PDFPreview PDF预览器
功能完整的PDF预览组件：

```vue
<PDFPreview
  v-model:visible="pdfVisible"
  :url="pdfUrl"
  :title="documentTitle"
/>
```

## 🔧 配置说明

### 环境变量配置

创建 `.env.local` 文件配置环境变量：

```env
VITE_API_BASE_URL=http://localhost:3000/api
VITE_APP_TITLE=档案管理系统
VITE_MOCK_API=true
```

### Vite配置优化

项目已配置了以下优化：

- 依赖预构建优化
- 代码分割和懒加载
- 开发服务器配置
- 生产构建优化

## 📱 响应式设计

系统采用移动优先的响应式设计：

- **桌面端**: 1920*1080+ 分辨率优化
- **平板端**: 768px+ 适配
- **移动端**: 320px+ 基础支持

## 🌈 主题定制

### 主色调
- 主色: #1e3a8a (深蓝色)
- 成功色: #10b981
- 警告色: #f59e0b
- 危险色: #ef4444
- 信息色: #06b6d4

### 暗色模式
系统支持完整的暗色模式切换，包括：
- 自动跟随系统主题
- 手动切换
- 组件级暗色适配

## 🔍 开发指南

### IDE推荐配置

- **VS Code** + [Vue (Official)](https://marketplace.visualstudio.com/items?itemName=Vue.volar)
- 禁用 Vetur 插件
- 启用 Vue.js devtools

### 浏览器开发工具

- **Chrome**: [Vue.js devtools](https://chromewebstore.google.com/detail/vuejs-devtools/nhdogjmejiglipccpnnnanhbledajbpd)
- **Firefox**: [Vue.js devtools](https://addons.mozilla.org/en-US/firefox/addon/vue-js-devtools/)

### 添加新页面

1. 在 `src/views/` 下创建页面组件
2. 在 `src/router/index.ts` 中添加路由配置
3. 在侧边栏菜单中添加导航项

### 使用全局状态

```typescript
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
await authStore.login(loginForm)
```

### 调用API

```typescript
import { http } from '@/utils/request'

const data = await http.get('/api/archives')
```

## 🚧 部署说明

### 构建生产版本

```bash
npm run build
```

构建产物在 `dist/` 目录下。

### 部署到服务器

1. 将 `dist/` 目录部署到Web服务器
2. 配置服务器支持SPA路由（或使用hash路由）
3. 配置API代理（如果前后端分离）

### Nginx配置示例

```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /path/to/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://backend-server;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## 🐛 常见问题

### 1. 开发服务器启动失败
确保Node.js版本 >= 20.19.0，并删除 `node_modules` 重新安装依赖。

### 2. PDF预览不显示
确保PDF.js worker配置正确，检查网络请求是否有错误。

### 3. 样式不生效
确保Sass依赖已正确安装，检查样式文件路径。

## 📄 许可证

本项目采用 MIT 许可证。

## 🤝 贡献

欢迎提交Issue和Pull Request来完善这个项目。

## 📞 联系方式

如有问题或建议，请通过以下方式联系：

- 提交GitHub Issue
- 发送邮件至项目维护者

---

**档案管理系统** - 让档案管理更简单高效！
