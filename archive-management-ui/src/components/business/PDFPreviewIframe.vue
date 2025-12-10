<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'

interface Props {
  visible: boolean
  url: string
  title?: string
  archiveId?: string
}

const props = withDefaults(defineProps<Props>(), {
  title: 'PDF预览'
})

const emit = defineEmits<{
  'update:visible': [visible: boolean]
  close: []
}>()

// 内部状态
const isLoading = ref(false)
const loadError = ref<string | null>(null)
const iframeRef = ref<HTMLIFrameElement>()
const loadStartTime = ref<number>(0)
const loadingTimeoutId = ref<number | null>(null)
const resizeKey = ref(0) // 用于触发重新计算尺寸

// 添加实例ID用于调试
const instanceId = Math.random().toString(36).substr(2, 9)
console.log(`[PDFPreviewIframe] Component instance created: ${instanceId}`)

// 显示标题计算属性
const displayTitle = computed(() => {
  if (props.archiveId && props.title) {
    return `档案预览：${props.archiveId}-${props.title}`
  }
  return props.title || 'PDF预览'
})

// 检测是否为移动设备
const isMobile = computed(() => {
  if (typeof window === 'undefined') return false
  return window.innerWidth < 768
})

// 响应式对话框尺寸
const dialogSize = computed(() => {
  // 使用 resizeKey 来触发重新计算
  resizeKey.value

  const vw = window.innerWidth
  const vh = window.innerHeight

  // 移动设备
  if (vw < 768) {
    return {
      width: '98%',
      height: '95vh',
      fullscreen: true
    }
  }

  // 平板设备
  if (vw < 1200) {
    return {
      width: '95%',
      height: '90vh',
      fullscreen: false
    }
  }

  // 桌面设备 - 根据屏幕高度动态调整
  const optimalHeight = vh > 900 ? '85vh' : vh > 700 ? '88vh' : '90vh'
  return {
    width: '85%',
    height: optimalHeight,
    fullscreen: false
  }
})

const dialogWidth = computed(() => dialogSize.value.width)

// PDF查看器URL
const pdfViewerUrl = computed(() => {
  if (!props.url) return ''
  return props.url
})

// 关闭预览
const handleClose = () => {
  loadError.value = null
  emit('update:visible', false)
  emit('close')
}

// 处理iframe加载完成
const handleIframeLoad = () => {
  const loadTime = Date.now() - loadStartTime.value
  console.log(`[PDFPreviewIframe] iframe load success`, {
    instanceId,
    url: props.url,
    loadTime: `${loadTime}ms`,
    iframeSrc: iframeRef.value?.src
  })

  // 清除超时定时器
  if (loadingTimeoutId.value) {
    clearTimeout(loadingTimeoutId.value)
    loadingTimeoutId.value = null
  }

  // 立即隐藏loading状态
  isLoading.value = false
  loadError.value = null
}

// 处理iframe加载错误
const handleIframeError = (error: Event) => {
  const loadTime = Date.now() - loadStartTime.value
  console.error(`[PDFPreviewIframe] iframe load error`, {
    instanceId,
    url: props.url,
    loadTime: `${loadTime}ms`,
    errorType: error.type,
    message: 'Failed to load PDF'
  })

  // 清除超时定时器
  if (loadingTimeoutId.value) {
    clearTimeout(loadingTimeoutId.value)
    loadingTimeoutId.value = null
  }

  isLoading.value = false
  loadError.value = '无法加载PDF文件'
  ElMessage.error('无法加载PDF文件')
}

// 设置加载超时处理
const setupLoadTimeout = () => {
  // 清除之前的超时定时器
  if (loadingTimeoutId.value) {
    clearTimeout(loadingTimeoutId.value)
  }

  // 设置30秒超时
  loadingTimeoutId.value = window.setTimeout(() => {
    console.warn(`[PDFPreviewIframe] Loading timeout`, {
      instanceId,
      url: props.url,
      loadTime: '30000ms'
    })

    isLoading.value = false
    loadError.value = 'PDF加载时间过长，请稍后重试'
  }, 30000)
}

// 重新加载PDF
const retryLoadPDF = () => {
  console.log(`[PDFPreviewIframe] Retrying PDF load`, {
    instanceId,
    url: props.url
  })

  // 清除之前的超时定时器
  if (loadingTimeoutId.value) {
    clearTimeout(loadingTimeoutId.value)
    loadingTimeoutId.value = null
  }

  // 重新加载
  loadError.value = null
  isLoading.value = true
  loadStartTime.value = Date.now()

  // 设置新的超时
  setupLoadTimeout()

  // 强制重新加载iframe
  if (iframeRef.value) {
    const currentSrc = iframeRef.value.src
    iframeRef.value.src = ''
    // 使用nextTick确保src被清除后再设置
    nextTick(() => {
      if (iframeRef.value) {
        iframeRef.value.src = currentSrc + `?t=${Date.now()}`
      }
    })
  }
}

// 下载PDF
const downloadPDF = () => {
  console.log(`[PDFPreviewIframe] Downloading PDF`, {
    instanceId,
    url: props.url,
    title: props.title
  })

  if (props.url) {
    const link = document.createElement('a')
    link.href = props.url
    link.download = props.title || 'document.pdf'
    link.target = '_blank'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }
}

// 打印PDF
const printPDF = () => {
  if (props.url && iframeRef.value) {
    try {
      iframeRef.value.contentWindow?.print()
    } catch (error) {
      ElMessage.warning('无法直接打印，请下载后打印')
      downloadPDF()
    }
  }
}

// 监听URL变化
watch(() => props.url, (newUrl, oldUrl) => {
  console.log(`[PDFPreviewIframe] URL changed`, {
    instanceId,
    oldUrl,
    newUrl,
    visible: props.visible
  })

  if (newUrl && props.visible) {
    startLoading()
  }
}, { immediate: true })

// 监听可见性变化
watch(() => props.visible, (visible, oldVisible) => {
  console.log(`[PDFPreviewIframe] Visibility changed`, {
    instanceId,
    oldVisible,
    visible,
    url: props.url
  })

  if (visible && props.url && !isLoading.value) {
    // 使用nextTick确保DOM更新后再加载
    nextTick(() => {
      startLoading()
    })
  } else if (!visible) {
    // 关闭时清理状态
    if (loadingTimeoutId.value) {
      clearTimeout(loadingTimeoutId.value)
      loadingTimeoutId.value = null
    }
    isLoading.value = false
    loadError.value = null
  }

  // 触发重新计算尺寸
  if (visible) {
    nextTick(() => {
      resizeKey.value++
    })
  }
})

// 开始加载
const startLoading = async () => {
  if (!props.url) {
    console.warn(`[PDFPreviewIframe] No URL to load`, { instanceId })
    return
  }

  console.log(`[PDFPreviewIframe] Starting to load PDF`, {
    instanceId,
    url: props.url,
    archiveId: props.archiveId
  })

  isLoading.value = true
  loadError.value = null
  loadStartTime.value = Date.now()

  // 检查文件是否存在（仅对本地文件）
  if (props.url.startsWith('/')) {
    try {
      const response = await fetch(props.url, { method: 'HEAD' })
      if (!response.ok) {
        throw new Error(`File not found: ${response.status}`)
      }
    } catch (error) {
      console.error(`[PDFPreviewIframe] File check failed`, error)
      loadError.value = 'PDF文件不存在或无法访问'
      isLoading.value = false
      return
    }
  }

  // 设置加载超时和备用检测
  setupLoadTimeout()
  setupBackupCheck()
  setupImmediateCheck()
}

// 立即检测机制（处理快速加载的情况）
const setupImmediateCheck = () => {
  // 1秒后检查，处理快速加载的情况
  setTimeout(() => {
    if (isLoading.value && iframeRef.value && iframeRef.value.src) {
      try {
        // 尝试检查iframe内容是否已加载
        const iframeDoc = iframeRef.value.contentDocument || iframeRef.value.contentWindow?.document
        if (iframeDoc && iframeDoc.readyState === 'complete') {
          console.log(`[PDFPreviewIframe] Quick load detected`, {
            instanceId,
            url: props.url
          })
          // 清除所有定时器
          if (loadingTimeoutId.value) {
            clearTimeout(loadingTimeoutId.value)
            loadingTimeoutId.value = null
          }
          isLoading.value = false
          loadError.value = null
        }
      } catch (e) {
        // 跨域情况下无法访问iframe文档，忽略错误
      }
    }
  }, 1000)
}

// 备用检测机制
const setupBackupCheck = () => {
  // 5秒后如果还在loading状态，强制显示内容
  setTimeout(() => {
    if (isLoading.value && iframeRef.value && iframeRef.value.src) {
      console.warn(`[PDFPreviewIframe] Using backup detection`, {
        instanceId,
        url: props.url
      })
      // 清除超时定时器
      if (loadingTimeoutId.value) {
        clearTimeout(loadingTimeoutId.value)
        loadingTimeoutId.value = null
      }
      isLoading.value = false
      loadError.value = null
    }
  }, 5000)
}

// 处理窗口大小变化
const handleWindowResize = () => {
  resizeKey.value++ // 触发重新计算
}

// 生命周期
onMounted(() => {
  window.addEventListener('resize', handleWindowResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleWindowResize)
})
</script>

<template>
  <el-dialog
    :model-value="visible"
    :title="displayTitle"
    :width="dialogSize.width"
    :fullscreen="dialogSize.fullscreen"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
    @close="handleClose"
    append-to-body
    class="pdf-preview-dialog"
    :style="{ maxHeight: '90vh', marginTop: '5vh' }"
  >
    <!-- 工具栏 -->
    <div class="pdf-toolbar">
      <div class="toolbar-left">
        <!-- 操作按钮 -->
        <el-button @click="printPDF">
          <el-icon><Printer /></el-icon>
          打印
        </el-button>
        <el-button @click="downloadPDF">
          <el-icon><Download /></el-icon>
          下载
        </el-button>
      </div>

      <div class="toolbar-right">
        <!-- 提示信息 -->
        <span class="pdf-info">
          使用浏览器内置PDF查看器
        </span>
      </div>
    </div>

    <!-- PDF内容区域 -->
    <div class="pdf-content">
      <div v-if="isLoading" class="pdf-loading">
        <el-icon class="loading-icon loading-spinner">
          <Loading />
        </el-icon>
        <p>加载中...</p>
      </div>

      <div v-else-if="loadError" class="pdf-error">
        <el-icon :size="64" class="error-icon">
          <DocumentRemove />
        </el-icon>
        <h3 class="error-title">加载失败</h3>
        <p class="error-message">{{ loadError }}</p>
        <div class="error-actions">
          <el-button type="primary" @click="retryLoadPDF" :loading="isLoading">
            <el-icon><Refresh /></el-icon>
            重试加载
          </el-button>
          <el-button @click="downloadPDF">
            <el-icon><Download /></el-icon>
            下载PDF
          </el-button>
          <el-button @click="handleClose">
            关闭
          </el-button>
        </div>
      </div>

      <iframe
        v-show="!isLoading && !loadError"
        ref="iframeRef"
        :src="pdfViewerUrl"
        class="pdf-iframe"
        @load="handleIframeLoad"
        @error="handleIframeError"
      ></iframe>
    </div>
  </el-dialog>
</template>

<style>
/* Global styles to override Element Plus */
.pdf-preview-dialog .el-dialog {
  max-height: 90vh !important;
  margin-top: 5vh !important;
  margin-bottom: 5vh !important;
  overflow: visible !important;
}

.pdf-preview-dialog .el-dialog__body {
  padding: 0 !important;
  height: 75vh !important;
  overflow: hidden !important;
}

/* Fullscreen mode */
.pdf-preview-dialog.is-fullscreen .el-dialog {
  max-height: 100vh !important;
  margin: 0 !important;
}

.pdf-preview-dialog.is-fullscreen .el-dialog__body {
  height: calc(100vh - 120px) !important;
}
</style>

<style scoped>
/* Scoped styles for component internals */

.pdf-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: var(--el-fill-color-light);
  border-bottom: 1px solid var(--el-border-color-lighter);
  gap: 16px;
}

.toolbar-left,
.toolbar-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.pdf-info {
  font-size: 14px;
  color: var(--text-secondary);
}

.pdf-content {
  height: 100%;
  overflow: hidden;
  background: var(--el-fill-color-extra-light);
}

.pdf-loading,
.pdf-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--text-disabled);
  gap: 16px;
  padding: 32px;
}

.error-icon {
  color: var(--el-color-danger);
}

.error-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.error-message {
  font-size: 16px;
  color: var(--text-secondary);
  margin: 0 0 24px 0;
  text-align: center;
  max-width: 400px;
}

.error-actions {
  display: flex;
  gap: 12px;
}

.loading-icon {
  font-size: 48px;
}

.pdf-iframe {
  width: 100%;
  height: 100%;
  border: none;
  display: block;
}

/* 响应式适配 */
@media (max-width: 480px) {
  .pdf-preview-dialog {
    :deep(.el-dialog__header) {
      padding: 8px 12px;
    }

    :deep(.el-dialog__title) {
      font-size: 14px;
    }

    :deep(.el-dialog__headerbtn) {
      top: 12px;
      right: 12px;
    }
  }

  .pdf-toolbar {
    flex-wrap: wrap;
    gap: 6px;
    padding: 6px 10px;
  }

  .toolbar-left {
    width: 100%;
    justify-content: center;
    margin-bottom: 5px;
  }

  .toolbar-right {
    width: 100%;
    justify-content: center;
  }

  .pdf-info {
    display: none;
  }

  .toolbar-left .el-button,
  .toolbar-right .el-button {
    padding: 5px 10px;
    font-size: 11px;
  }

  .pdf-content {
    margin: 0 5px;
  }
}

@media (min-width: 481px) and (max-width: 768px) {
  .pdf-preview-dialog {
    :deep(.el-dialog__header) {
      padding: 10px 14px;
    }
  }

  .pdf-toolbar {
    flex-wrap: wrap;
    gap: 8px;
    padding: 8px 12px;
  }

  .toolbar-left {
    flex: 1.2;
    justify-content: flex-start;
  }

  .toolbar-right {
    flex: 0.8;
    justify-content: flex-end;
  }

  .pdf-info {
    display: none;
  }

  .toolbar-left .el-button,
  .toolbar-right .el-button {
    padding: 6px 12px;
    font-size: 12px;
  }
}

@media (min-width: 769px) and (max-width: 1200px) {
  .pdf-toolbar {
    gap: 10px;
    padding: 10px 14px;
  }

  .toolbar-left {
    flex: 1;
  }

  .toolbar-right {
    flex: 1.5;
    justify-content: flex-end;
  }
}
</style>