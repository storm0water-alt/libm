<script setup lang="ts">
interface Props {
  tip?: string
  background?: string
}

withDefaults(defineProps<Props>(), {
  tip: '加载中...',
  background: 'rgba(0, 0, 0, 0.7)'
})
</script>

<template>
  <div
    class="app-loading"
    :style="{ backgroundColor: background }"
  >
    <div class="loading-content">
      <div class="loading-spinner">
        <div class="spinner-ring"></div>
        <div class="spinner-ring"></div>
        <div class="spinner-ring"></div>
        <div class="spinner-ring"></div>
      </div>
      <div class="loading-text">{{ tip }}</div>
    </div>
  </div>
</template>

<style scoped>
.app-loading {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(2px);
}

.loading-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.loading-spinner {
  width: 60px;
  height: 60px;
  position: relative;
}

.spinner-ring {
  position: absolute;
  width: 100%;
  height: 100%;
  border: 3px solid transparent;
  border-radius: 50%;
  animation: spin 1.2s cubic-bezier(0.5, 0, 0.5, 1) infinite;
}

.spinner-ring:nth-child(1) {
  border-top-color: #3b82f6;
  animation-delay: -0.45s;
}

.spinner-ring:nth-child(2) {
  border-right-color: #10b981;
  animation-delay: -0.3s;
}

.spinner-ring:nth-child(3) {
  border-bottom-color: #f59e0b;
  animation-delay: -0.15s;
}

.spinner-ring:nth-child(4) {
  border-left-color: #ef4444;
}

.loading-text {
  color: #fff;
  font-size: 14px;
  font-weight: 500;
  text-align: center;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

/* 暗色模式适配 */
.dark .loading-text {
  color: rgba(255, 255, 255, 0.9);
}
</style>