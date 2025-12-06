<script setup lang="ts">
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useAppStore } from '@/stores/app'
import type { MenuItem } from '@/types'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const appStore = useAppStore()

// 菜单配置
const menuItems = computed<MenuItem[]>(() => [
  {
    id: 'dashboard',
    title: '工作台',
    icon: 'House',
    path: '/dashboard'
  },
  {
    id: 'archive',
    title: '档案管理',
    icon: 'Document',
    path: '/archive'
  },
  {
    id: 'import',
    title: '入库管理',
    icon: 'Upload',
    path: '/import'
  },
  {
    id: 'logs',
    title: '操作日志',
    icon: 'List',
    path: '/logs'
  },
  {
    id: 'users',
    title: '用户管理',
    icon: 'User',
    path: '/users',
    requireAdmin: true
  }
])

// 过滤菜单项（根据权限）
const filteredMenuItems = computed(() => {
  return menuItems.value.filter(item => {
    // 检查管理员权限
    if (item.requireAdmin && !authStore.isAdmin) {
      return false
    }
    return true
  })
})

// 当前激活的菜单
const activeMenu = computed(() => {
  return route.path
})

// 处理菜单点击
const handleMenuClick = (index: string) => {
  router.push(index)
}

// 根据图标名称获取组件
const getIconComponent = (iconName: string) => {
  // 这里可以通过动态导入获取图标组件
  // 暂时返回null，在模板中使用动态组件
  return null
}
</script>

<template>
  <div class="app-sidebar">
    <!-- Logo区域 -->
    <div class="sidebar-logo">
      <transition name="sidebar-logo-fade">
        <div v-if="!appStore.sidebarCollapsed" class="logo-content">
          <i class="bi bi-archive-fill logo-icon"></i>
          <span class="logo-text">正成档案管理</span>
        </div>
        <div v-else class="logo-content-collapsed">
          <i class="bi bi-archive-fill logo-icon-collapsed"></i>
        </div>
      </transition>
    </div>

    <!-- 菜单区域 -->
    <nav class="sidebar-menu">
      <el-menu
        :default-active="activeMenu"
        :collapse="appStore.sidebarCollapsed"
        :unique-opened="true"
        background-color="transparent"
        text-color="var(--text-secondary)"
        active-text-color="var(--primary-color)"
        @select="handleMenuClick"
      >
        <el-menu-item
          v-for="item in filteredMenuItems"
          :key="item.id"
          :index="item.path"
        >
          <el-icon>
            <component :is="item.icon" />
          </el-icon>
          <template #title>
            <span class="menu-title">{{ item.title }}</span>
          </template>
        </el-menu-item>
      </el-menu>
    </nav>

    <!-- 底部信息 -->
    <div class="sidebar-footer">
      <transition name="sidebar-footer-fade">
        <div v-if="!appStore.sidebarCollapsed" class="footer-content">
          <div class="version-info">
            <span class="version-text">v1.0.0</span>
          </div>
        </div>
        <div v-else class="footer-content-collapsed">
          <el-tooltip content="正成档案管理系统 v1.0.0" placement="right">
            <div class="version-dot"></div>
          </el-tooltip>
        </div>
      </transition>
    </div>
  </div>
</template>

<style scoped>
.app-sidebar {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--el-bg-color-overlay);
  border-right: 1px solid var(--el-border-color-light);
  transition: all 0.3s ease;
}

.sidebar-logo {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 16px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  overflow: hidden;
}

.logo-content,
.logo-content-collapsed {
  display: flex;
  align-items: center;
  gap: 12px;
  white-space: nowrap;
}

.logo-content {
  justify-content: flex-start;
}

.logo-content-collapsed {
  justify-content: center;
}

.logo-icon {
  font-size: 32px;
  color: var(--primary-color);
  flex-shrink: 0;
}

.logo-icon-collapsed {
  font-size: 24px;
  color: var(--primary-color);
  flex-shrink: 0;
}

.logo-text {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
}

.sidebar-menu {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
}

/* 自定义菜单样式 */
:deep(.el-menu) {
  border: none;
  background: transparent;
}

:deep(.el-menu-item) {
  height: 48px;
  line-height: 48px;
  margin: 4px 8px;
  border-radius: var(--border-radius-base);
  transition: all 0.2s ease;
}

:deep(.el-menu-item:hover) {
  background-color: var(--el-fill-color-light);
  color: var(--primary-color);
}

:deep(.el-menu-item.is-active) {
  background-color: var(--primary-color);
  color: #fff;
}

:deep(.el-menu-item.is-active::before) {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background: #fff;
  border-radius: 0 2px 2px 0;
}

:deep(.el-menu-item .el-icon) {
  font-size: 18px;
  margin-right: 8px;
  width: 18px;
  text-align: center;
}

:deep(.el-menu--collapse .el-menu-item) {
  padding: 0 20px;
  margin: 4px 8px;
}

:deep(.el-menu--collapse .el-menu-item .el-icon) {
  margin-right: 0;
}

.menu-title {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
}

.sidebar-footer {
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 16px;
  border-top: 1px solid var(--el-border-color-lighter);
  overflow: hidden;
}

.footer-content {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.footer-content-collapsed {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.version-info {
  text-align: center;
}

.version-text {
  font-size: var(--font-size-xs);
  color: var(--text-disabled);
  font-weight: var(--font-weight-normal);
}

.version-dot {
  width: 8px;
  height: 8px;
  background: var(--text-disabled);
  border-radius: 50%;
  cursor: pointer;
}

/* 过渡动画 */
.sidebar-logo-fade-enter-active,
.sidebar-logo-fade-leave-active,
.sidebar-footer-fade-enter-active,
.sidebar-footer-fade-leave-active {
  transition: all 0.3s ease;
}

.sidebar-logo-fade-enter-from,
.sidebar-logo-fade-leave-to,
.sidebar-footer-fade-enter-from,
.sidebar-footer-fade-leave-to {
  opacity: 0;
  transform: translateX(-10px);
}

/* 响应式适配 */
@media (max-width: 768px) {
  .app-sidebar {
    box-shadow: 2px 0 8px rgba(0, 0, 0, 0.1);
  }

  .sidebar-logo {
    height: 50px;
  }

  :deep(.el-menu-item) {
    height: 44px;
    line-height: 44px;
  }

  .sidebar-footer {
    height: 40px;
  }
}

/* 暗色模式适配 */
.dark .app-sidebar {
  background: var(--el-bg-color-page);
  border-right-color: var(--el-border-color-darker);
}

.dark .sidebar-logo {
  border-bottom-color: var(--el-border-color-darker);
}

.dark .sidebar-footer {
  border-top-color: var(--el-border-color-darker);
}

.dark :deep(.el-menu-item:hover) {
  background-color: var(--el-fill-color-dark);
}

.dark :deep(.el-menu-item.is-active) {
  background-color: var(--primary-color);
}

/* 紧凑模式适配 */
.compact .sidebar-logo {
  height: 50px;
}

.compact :deep(.el-menu-item) {
  height: 40px;
  line-height: 40px;
  margin: 2px 8px;
}

.compact .sidebar-footer {
  height: 40px;
}
</style>