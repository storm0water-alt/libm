<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useAppStore } from '@/stores/app'
import { useAuthStore } from '@/stores/auth'
import AppHeader from './AppHeader.vue'
import AppSidebar from './AppSidebar.vue'

const appStore = useAppStore()
const authStore = useAuthStore()

// 响应式处理
const isMobile = ref(false)

// 检查是否为移动设备
const checkMobile = () => {
  isMobile.value = window.innerWidth < 768
  if (isMobile.value) {
    appStore.setSidebarCollapsed(true)
  }
}

onMounted(() => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
})

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
})

// 计算侧边栏类名
const sidebarClass = computed(() => ({
  'layout-sidebar': true,
  'collapsed': appStore.sidebarCollapsed,
  'mobile': isMobile.value,
  'mobile-open': !appStore.sidebarCollapsed && isMobile.value
}))
</script>

<template>
  <div class="layout-container">
    <!-- 侧边栏遮罩层（移动端） -->
    <div
      v-if="isMobile && !appStore.sidebarCollapsed"
      class="sidebar-overlay"
      @click="appStore.toggleSidebar"
    />

    <!-- 侧边栏 -->
    <aside :class="sidebarClass">
      <AppSidebar />
    </aside>

    <!-- 主内容区域 -->
    <div class="layout-main">
      <!-- 顶部导航 -->
      <header class="layout-header">
        <AppHeader />
      </header>

      <!-- 页面内容 -->
      <main class="layout-content">
        <div class="content-wrapper">
          <router-view v-slot="{ Component, route }">
            <transition name="fade" mode="out-in">
              <component :is="Component" :key="route.path" />
            </transition>
          </router-view>
        </div>
      </main>
    </div>
  </div>
</template>

<style scoped>
.layout-container {
  height: 100vh;
  width: 100vw;
  display: flex;
  overflow: hidden;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
}

.layout-sidebar {
  width: 240px;
  background: var(--el-bg-color-overlay);
  border-right: 1px solid var(--el-border-color-light);
  transition: all 0.3s ease;
  position: relative;
  z-index: 1001;
}

.layout-sidebar.collapsed {
  width: 64px;
}

/* 移动端样式 */
.layout-sidebar.mobile {
  position: fixed;
  top: 0;
  left: -240px;
  height: 100%;
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.1);
  z-index: 1002;
}

.layout-sidebar.mobile.mobile-open {
  left: 0;
}

.sidebar-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.3);
  z-index: 1000;
  backdrop-filter: blur(2px);
}

.layout-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
  transition: margin-left 0.3s ease;
}

.layout-header {
  height: 60px;
  background: var(--el-bg-color-overlay);
  border-bottom: 1px solid var(--el-border-color-light);
  position: relative;
  z-index: 999;
}

.layout-content {
  flex: 1;
  overflow: auto;
  background: var(--background-color);
  padding: 20px;
  min-height: 0;
}

.content-wrapper {
  width: 100%;
  max-width: 100%;
  height: 100%;
  min-height: calc(100vh - 60px);
  display: flex;
  flex-direction: column;
}

/* 响应式适配 */
@media (max-width: 768px) {
  .layout-container {
    height: 100vh;
    width: 100vw;
  }

  .layout-sidebar {
    margin-left: 0;
    width: 280px;
    left: -280px;
  }

  .layout-sidebar.mobile.mobile-open {
    left: 0;
    width: 280px;
  }

  .layout-main {
    margin-left: 0;
    width: 100%;
  }

  .layout-content {
    padding: 16px;
  }

  .content-wrapper {
    min-height: calc(100vh - 60px);
    padding: 0;
  }
}

/* 超小屏幕适配 */
@media (max-width: 480px) {
  .layout-sidebar {
    width: 260px;
    left: -260px;
  }

  .layout-sidebar.mobile.mobile-open {
    left: 0;
    width: 260px;
  }

  .layout-content {
    padding: 12px;
  }

  .layout-header {
    height: 56px;
  }

  .content-wrapper {
    min-height: calc(100vh - 56px);
  }
}

/* 大屏幕适配 */
@media (min-width: 1920px) {
  .layout-container {
    max-width: 100vw;
    margin: 0 auto;
  }

  .content-wrapper {
    max-width: 1920px;
    margin: 0 auto;
  }
}

@media (min-width: 2560px) {
  .content-wrapper {
    max-width: 2560px;
    margin: 0 auto;
    padding: 24px;
  }
}

/* 暗色模式适配 */
.dark .layout-sidebar {
  background: var(--el-bg-color-page);
  border-right-color: var(--el-border-color-darker);
}

.dark .layout-header {
  background: var(--el-bg-color-page);
  border-bottom-color: var(--el-border-color-darker);
}

.dark .layout-content {
  background: var(--el-bg-color-page);
}

/* 紧凑模式适配 */
.compact .layout-header {
  height: 50px;
}

.compact .content-wrapper {
  padding: 16px;
}

@media (max-width: 768px) {
  .compact .content-wrapper {
    padding: 12px;
  }
}
</style>