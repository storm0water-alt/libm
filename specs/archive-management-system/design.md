# 档案管理系统高保真产品UI Design Specification

## 1. 设计概述

### 1.1 设计原则
- **简洁性**: 界面布局清晰，功能区域明确
- **一致性**: 保持整个系统的视觉和交互一致性
- **专业性**: 体现档案管理系统的专业性和严谨性
- **易用性**: 操作流程简单直观，降低学习成本

### 1.2 技术架构设计
- **前端框架**: Vue3 + Element Plus
- **状态管理**: Vuex/Pinia
- **路由管理**: Vue Router
- **样式方案**: Scss + CSS Variables
- **构建工具**: Vite

## 2. 整体架构设计

### 2.1 目录结构
```
src/
├── components/          # 公共组件
│   ├── common/         # 通用组件
│   ├── forms/          # 表单组件
│   └── layout/         # 布局组件
├── views/              # 页面组件
│   ├── Login/          # 登录页面
│   ├── Dashboard/      # 工作台
│   ├── Archive/        # 档案管理
│   ├── Import/         # 入库管理
│   ├── Logs/           # 操作日志
│   └── Users/          # 用户管理
├── router/             # 路由配置
├── store/              # 状态管理
├── utils/              # 工具函数
├── styles/             # 全局样式
└── assets/             # 静态资源
```

### 2.2 组件架构
```
App.vue
├── Layout.vue (主布局)
│   ├── Header.vue (顶部导航)
│   ├── Sidebar.vue (侧边栏)
│   └── MainContent.vue (主内容区)
│       └── [具体页面组件]
└── Login.vue (登录页面)
```

## 3. 视觉设计规范

### 3.1 色彩方案
```scss
// 主色调 - 深蓝色系
$primary-color: #1e3a8a;        // 主色
$primary-light: #3b82f6;       // 浅主色
$primary-dark: #1e2a5a;        // 深主色

// 辅助色
$success-color: #10b981;        // 成功
$warning-color: #f59e0b;        // 警告
$danger-color: #ef4444;         // 危险
$info-color: #06b6d4;           // 信息

// 中性色
$text-primary: #111827;         // 主文字
$text-secondary: #6b7280;       // 次文字
$text-disabled: #9ca3af;        // 禁用文字
$border-color: #e5e7eb;         // 边框
$background-color: #f9fafb;     // 背景
$card-background: #ffffff;      // 卡片背景

// 深色模式扩展
$dark-bg: #1f2937;
$dark-surface: #374151;
$dark-text: #f9fafb;
```

### 3.2 字体规范
```scss
// 字体大小
$font-size-xs: 12px;
$font-size-sm: 14px;
$font-size-base: 16px;
$font-size-lg: 18px;
$font-size-xl: 20px;
$font-size-2xl: 24px;
$font-size-3xl: 30px;

// 字体粗细
$font-weight-normal: 400;
$font-weight-medium: 500;
$font-weight-semibold: 600;
$font-weight-bold: 700;

// 行高
$line-height-tight: 1.25;
$line-height-normal: 1.5;
$line-height-relaxed: 1.75;
```

### 3.3 间距规范
```scss
// 间距系统 (8px基准)
$spacing-1: 4px;
$spacing-2: 8px;
$spacing-3: 12px;
$spacing-4: 16px;
$spacing-5: 20px;
$spacing-6: 24px;
$spacing-8: 32px;
$spacing-10: 40px;
$spacing-12: 48px;
$spacing-16: 64px;

// 圆角
$border-radius-sm: 4px;
$border-radius-base: 6px;
$border-radius-lg: 8px;
$border-radius-xl: 12px;
```

### 3.4 阴影规范
```scss
// 阴影层级
$shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
$shadow-base: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
$shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
$shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
$shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
```

## 4. 页面详细设计

### 4.1 登录页面设计

#### 4.1.1 布局结构
```vue
<template>
  <div class="login-container">
    <div class="login-background">
      <!-- 背景装饰元素 -->
    </div>
    <div class="login-card">
      <div class="login-header">
        <h1 class="system-title">档案管理系统</h1>
        <p class="system-subtitle">Archive Management System</p>
      </div>
      <el-form class="login-form" :model="loginForm" :rules="rules">
        <!-- 表单字段 -->
      </el-form>
    </div>
  </div>
</template>
```

#### 4.1.2 样式设计
```scss
.login-container {
  height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
}

.login-card {
  background: white;
  border-radius: $border-radius-xl;
  box-shadow: $shadow-xl;
  padding: $spacing-8;
  width: 400px;
  max-width: 90vw;
}

.system-title {
  font-size: $font-size-3xl;
  font-weight: $font-weight-bold;
  color: $primary-color;
  text-align: center;
  margin-bottom: $spacing-2;
}
```

### 4.2 主布局设计

#### 4.2.1 布局组件结构
```vue
<template>
  <div class="layout-container">
    <AppHeader class="layout-header" />
    <div class="layout-body">
      <AppSidebar class="layout-sidebar" />
      <main class="layout-main">
        <router-view />
      </main>
    </div>
  </div>
</template>
```

#### 4.2.2 响应式布局
```scss
.layout-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.layout-body {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.layout-sidebar {
  width: 240px;
  background: $dark-bg;
  transition: width 0.3s ease;

  &.collapsed {
    width: 64px;
  }
}

.layout-main {
  flex: 1;
  background: $background-color;
  overflow: auto;
  padding: $spacing-6;
}

// 响应式设计
@media (max-width: 768px) {
  .layout-sidebar {
    position: fixed;
    left: -240px;
    height: 100%;
    z-index: 1000;

    &.mobile-open {
      left: 0;
    }
  }

  .layout-main {
    margin-left: 0;
  }
}
```

### 4.3 工作台页面设计

#### 4.3.1 组件结构
```vue
<template>
  <div class="dashboard">
    <!-- 统计卡片区域 -->
    <div class="stats-grid">
      <StatCard
        v-for="stat in statsData"
        :key="stat.title"
        :title="stat.title"
        :value="stat.value"
        :icon="stat.icon"
        :color="stat.color"
      />
    </div>

    <!-- 图表区域 -->
    <div class="charts-section">
      <div class="chart-container">
        <h3>档案类型分布</h3>
        <ArchiveTypeChart />
      </div>
      <div class="chart-container">
        <h3>操作趋势</h3>
        <OperationTrendChart />
      </div>
    </div>
  </div>
</template>
```

#### 4.3.2 统计卡片设计
```scss
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: $spacing-6;
  margin-bottom: $spacing-8;
}

.stat-card {
  background: white;
  border-radius: $border-radius-lg;
  padding: $spacing-6;
  box-shadow: $shadow-base;
  border-left: 4px solid;

  &.primary { border-left-color: $primary-color; }
  &.success { border-left-color: $success-color; }
  &.warning { border-left-color: $warning-color; }

  .stat-icon {
    width: 48px;
    height: 48px;
    border-radius: $border-radius-lg;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: $spacing-4;
  }
}
```

### 4.4 档案管理页面设计

#### 4.4.1 搜索区域设计
```vue
<template>
  <div class="archive-management">
    <!-- 搜索区域 -->
    <el-card class="search-card">
      <el-form :model="searchForm" inline>
        <el-form-item label="档案号">
          <el-input
            v-model="searchForm.archiveId"
            placeholder="请输入档案号"
            clearable
          />
        </el-form-item>
        <el-form-item label="文件名">
          <el-input
            v-model="searchForm.fileName"
            placeholder="请输入文件名"
            clearable
          />
        </el-form-item>
        <el-form-item label="建档日期">
          <el-date-picker
            v-model="searchForm.dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">
            <el-icon><Search /></el-icon> 搜索
          </el-button>
          <el-button @click="handleReset">
            <el-icon><Refresh /></el-icon> 重置
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 操作区域 -->
    <div class="action-bar">
      <el-button type="primary" @click="handleAdd">
        <el-icon><Plus /></el-icon> 新增档案
      </el-button>
      <el-button type="success" @click="handleBatchExport" :disabled="!selectedRows.length">
        <el-icon><Download /></el-icon> 批量导出
      </el-button>
      <el-button type="danger" @click="handleBatchDelete" :disabled="!selectedRows.length">
        <el-icon><Delete /></el-icon> 批量删除
      </el-button>
    </div>
  </div>
</template>
```

#### 4.4.2 表格设计
```scss
.archive-table {
  background: white;
  border-radius: $border-radius-lg;
  box-shadow: $shadow-base;

  .el-table__header {
    background: $background-color;
    font-weight: $font-weight-semibold;
  }

  .table-actions {
    display: flex;
    gap: $spacing-2;

    .action-btn {
      padding: $spacing-1 $spacing-2;
      border-radius: $border-radius-sm;
      transition: all 0.2s ease;

      &:hover {
        transform: translateY(-1px);
        box-shadow: $shadow-sm;
      }
    }
  }
}
```

### 4.5 PDF预览组件设计

#### 4.5.1 组件结构
```vue
<template>
  <el-dialog
    v-model="visible"
    title="PDF预览"
    width="80%"
    :before-close="handleClose"
  >
    <div class="pdf-preview-container">
      <div class="pdf-toolbar">
        <el-button-group>
          <el-button @click="zoomOut">
            <el-icon><ZoomOut /></el-icon>
          </el-button>
          <el-button @click="resetZoom">
            {{ Math.round(scale * 100) }}%
          </el-button>
          <el-button @click="zoomIn">
            <el-icon><ZoomIn /></el-icon>
          </el-button>
        </el-button-group>

        <el-button-group>
          <el-button @click="prevPage" :disabled="currentPage <= 1">
            上一页
          </el-button>
          <el-button>
            {{ currentPage }} / {{ totalPages }}
          </el-button>
          <el-button @click="nextPage" :disabled="currentPage >= totalPages">
            下一页
          </el-button>
        </el-button-group>

        <el-button @click="fullscreen">
          <el-icon><FullScreen /></el-icon> 全屏
        </el-button>
      </div>

      <div class="pdf-content" ref="pdfContainer">
        <canvas ref="pdfCanvas" />
      </div>
    </div>
  </el-dialog>
</template>
```

## 5. 组件库设计

### 5.1 通用组件

#### 5.1.1 StatCard 统计卡片
```vue
<template>
  <div class="stat-card" :class="[`stat-card--${color}`]">
    <div class="stat-card__icon">
      <el-icon :size="24"><component :is="icon" /></el-icon>
    </div>
    <div class="stat-card__content">
      <h3 class="stat-card__title">{{ title }}</h3>
      <div class="stat-card__value">{{ formattedValue }}</div>
      <div class="stat-card__trend" v-if="trend">
        <el-icon><ArrowUp v-if="trend > 0" /><ArrowDown v-else /></el-icon>
        {{ Math.abs(trend) }}%
      </div>
    </div>
  </div>
</template>
```

#### 5.1.2 SearchableTable 可搜索表格
```vue
<template>
  <div class="searchable-table">
    <div class="searchable-table__header">
      <slot name="header">
        <div class="search-form">
          <el-form :model="searchForm" inline>
            <slot name="search-form" :form="searchForm" />
          </el-form>
        </div>
        <div class="table-actions">
          <slot name="actions" :selection="selection" />
        </div>
      </slot>
    </div>

    <el-table
      ref="tableRef"
      :data="tableData"
      :loading="loading"
      @selection-change="handleSelectionChange"
    >
      <slot />
    </el-table>

    <div class="searchable-table__pagination">
      <el-pagination
        v-model:current-page="pagination.page"
        v-model:page-size="pagination.size"
        :total="pagination.total"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next, jumper"
      />
    </div>
  </div>
</template>
```

### 5.2 业务组件

#### 5.2.1 ArchiveCard 档案卡片
```vue
<template>
  <el-card class="archive-card" @click="handleClick">
    <div class="archive-card__header">
      <el-icon class="archive-card__icon"><Document /></el-icon>
      <el-tag :type="statusType" size="small">{{ status }}</el-tag>
    </div>

    <div class="archive-card__content">
      <h4 class="archive-card__title">{{ fileName }}</h4>
      <p class="archive-card__meta">
        <span>档案号: {{ archiveId }}</span>
        <span>{{ formatDate(createDate) }}</span>
      </p>
      <p class="archive-card__description">{{ description }}</p>
    </div>

    <div class="archive-card__footer">
      <el-button-group>
        <el-button size="small" @click.stop="handlePreview">
          <el-icon><View /></el-icon>
        </el-button>
        <el-button size="small" @click.stop="handleEdit">
          <el-icon><Edit /></el-icon>
        </el-button>
        <el-button size="small" @click.stop="handleDownload">
          <el-icon><Download /></el-icon>
        </el-button>
      </el-button-group>
    </div>
  </el-card>
</template>
```

## 6. 交互设计

### 6.1 动画效果
```scss
// 过渡动画
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-enter-active {
  transition: transform 0.3s ease;
}

.slide-enter-from {
  transform: translateX(-100%);
}

// 悬停效果
.hover-lift {
  transition: transform 0.2s ease, box-shadow 0.2s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: $shadow-lg;
  }
}

// 加载动画
.loading-spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
```

### 6.2 响应式设计
```scss
// 断点系统
$breakpoints: (
  sm: 640px,
  md: 768px,
  lg: 1024px,
  xl: 1280px,
  2xl: 1536px
);

@mixin respond-to($breakpoint) {
  @media (min-width: map-get($breakpoints, $breakpoint)) {
    @content;
  }
}

// 响应式网格
.responsive-grid {
  display: grid;
  gap: $spacing-4;
  grid-template-columns: 1fr;

  @include respond-to(sm) {
    grid-template-columns: repeat(2, 1fr);
  }

  @include respond-to(lg) {
    grid-template-columns: repeat(3, 1fr);
  }

  @include respond-to(xl) {
    grid-template-columns: repeat(4, 1fr);
  }
}
```

## 7. 性能优化设计

### 7.1 组件懒加载
```javascript
// 路由懒加载
const routes = [
  {
    path: '/archive',
    component: () => import('@/views/Archive/index.vue')
  },
  {
    path: '/import',
    component: () => import('@/views/Import/index.vue')
  }
];

// 组件懒加载
const PDFPreview = defineAsyncComponent(() =>
  import('@/components/PDFPreview.vue')
);
```

### 7.2 虚拟滚动
```vue
<template>
  <el-table
    :data="visibleData"
    height="400"
    virtual-scrolling
  >
    <!-- 表格列定义 -->
  </el-table>
</template>

<script>
import { computed } from 'vue';

export default {
  props: {
    data: Array,
    itemHeight: { type: Number, default: 50 },
    containerHeight: { type: Number, default: 400 }
  },
  setup(props) {
    const visibleData = computed(() => {
      // 虚拟滚动逻辑
      const start = Math.floor(scrollTop / props.itemHeight);
      const visibleCount = Math.ceil(props.containerHeight / props.itemHeight);
      const end = start + visibleCount;
      return props.data.slice(start, end);
    });

    return { visibleData };
  }
};
</script>
```

## 8. 可访问性设计

### 8.1 键盘导航
```vue
<template>
  <div class="accessible-menu" role="navigation">
    <ul class="menu-list">
      <li v-for="item in menuItems" :key="item.id">
        <button
          class="menu-item"
          :class="{ active: item.id === activeId }"
          @click="handleClick(item)"
          @keydown.enter="handleClick(item)"
          @keydown.space="handleClick(item)"
          :aria-current="item.id === activeId ? 'page' : undefined"
        >
          {{ item.label }}
        </button>
      </li>
    </ul>
  </div>
</template>
```

### 8.2 屏幕阅读器支持
```vue
<template>
  <div class="search-results" role="region" aria-label="搜索结果">
    <h2 id="results-heading">找到 {{ totalCount }} 条结果</h2>
    <ul
      class="results-list"
      aria-labelledby="results-heading"
      role="list"
    >
      <li
        v-for="(item, index) in results"
        :key="item.id"
        role="listitem"
        :aria-setsize="results.length"
        :aria-posinset="index + 1"
      >
        <div class="result-item">
          <h3>{{ item.title }}</h3>
          <p>{{ item.description }}</p>
        </div>
      </li>
    </ul>
  </div>
</template>
```

## 9. 状态管理设计

### 9.1 Store结构
```javascript
// store/modules/archive.js
export const useArchiveStore = defineStore('archive', {
  state: () => ({
    archives: [],
    loading: false,
    searchForm: {
      archiveId: '',
      fileName: '',
      dateRange: null
    },
    pagination: {
      page: 1,
      size: 20,
      total: 0
    }
  }),

  getters: {
    filteredArchives: (state) => {
      // 过滤逻辑
    }
  },

  actions: {
    async fetchArchives() {
      this.loading = true;
      try {
        const response = await archiveAPI.list(this.searchForm, this.pagination);
        this.archives = response.data;
        this.pagination.total = response.total;
      } finally {
        this.loading = false;
      }
    },

    async deleteArchive(id) {
      try {
        await archiveAPI.delete(id);
        this.archives = this.archives.filter(item => item.id !== id);
      } catch (error) {
        ElMessage.error('删除失败');
      }
    }
  }
});
```

这个设计规范提供了完整的UI设计指导，包括视觉设计、组件设计、交互设计和性能优化等各个方面，确保开发团队能够构建出一致、专业、高效的档案管理系统界面。