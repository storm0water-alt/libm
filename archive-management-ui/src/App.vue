<script setup lang="ts">
import { onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useAppStore } from '@/stores/app'
import AppLoading from '@/components/common/AppLoading.vue'

const authStore = useAuthStore()
const appStore = useAppStore()

// 初始化应用
onMounted(() => {
  appStore.initApp()
  authStore.initAuth()
})
</script>

<template>
  <div id="app">
    <!-- 全局加载 -->
    <AppLoading v-if="appStore.loading" />

    <!-- 路由视图 -->
    <RouterView />
  </div>
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body {
  height: 100%;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}

#app {
  height: 100vh;
  width: 100vw;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* 过渡动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-fade-enter-active {
  transition: all 0.3s ease-out;
}

.slide-fade-leave-active {
  transition: all 0.3s cubic-bezier(1, 0.5, 0.8, 1);
}

.slide-fade-enter-from,
.slide-fade-leave-to {
  transform: translateX(20px);
  opacity: 0;
}

/* 高亮样式 */
:deep(.highlight) {
  background-color: #fff3cd;
  padding: 2px 4px;
  border-radius: 2px;
}

/* 暗色模式样式 */
.dark {
  color-scheme: dark;
}

.dark .el-card {
  background-color: var(--el-bg-color-overlay);
  border-color: var(--el-border-color-darker);
}

.dark .el-table {
  background-color: var(--el-bg-color-overlay);
}

.dark .el-table th {
  background-color: var(--el-fill-color-light);
}

/* 紧凑模式样式 */
.compact {
  --el-component-size-large: 32px;
  --el-component-size: 28px;
  --el-component-size-small: 24px;
}

.compact .el-card {
  --el-card-padding: 12px;
}

.compact .el-table {
  --el-table-header-height: 40px;
}

.compact .el-table td {
  padding: 8px 0;
}

/* 滚动条样式 */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: var(--el-border-color-darker);
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: var(--el-border-color-dark);
}

/* 响应式样式 */
@media (max-width: 768px) {
  .hidden-mobile {
    display: none !important;
  }
}

@media (min-width: 769px) {
  .hidden-desktop {
    display: none !important;
  }
}
</style>
