<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import * as pdfjsLib from 'pdfjs-dist'

// 配置 PDF.js worker
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.js',
    import.meta.url
  ).toString()
}

interface Props {
  visible: boolean
  url: string
  title?: string
}

const props = withDefaults(defineProps<Props>(), {
  title: 'PDF预览'
})

const emit = defineEmits<{
  'update:visible': [visible: boolean]
  close: []
}>()

// 内部状态
const canvasRef = ref<HTMLCanvasElement>()
const containerRef = ref<HTMLElement>()
const pdfDoc = ref<any>(null)
const currentPage = ref(1)
const totalPages = ref(0)
const scale = ref(1.0)
const isLoading = ref(false)
const isFullscreen = ref(false)
const renderTask = ref<any>(null)

// 预定义的缩放比例
const zoomLevels = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0]
const currentZoomIndex = computed(() => {
  return zoomLevels.findIndex(level => Math.abs(level - scale.value) < 0.01)
})

// 加载PDF文档
const loadPDF = async () => {
  if (!props.url) return

  isLoading.value = true
  try {
    const loadingTask = pdfjsLib.getDocument(props.url)
    pdfDoc.value = await loadingTask.promise
    totalPages.value = pdfDoc.value.numPages
    currentPage.value = 1
    await renderPage(currentPage.value)
  } catch (error) {
    console.error('加载PDF失败:', error)
    ElMessage.error('加载PDF失败')
  } finally {
    isLoading.value = false
  }
}

// 渲染页面
const renderPage = async (pageNum: number) => {
  if (!pdfDoc.value || !canvasRef.value) return

  try {
    // 取消之前的渲染任务
    if (renderTask.value) {
      renderTask.value.cancel()
    }

    const page = await pdfDoc.value.getPage(pageNum)
    const viewport = page.getViewport({ scale: scale.value })

    const canvas = canvasRef.value
    const context = canvas.getContext('2d')

    if (!context) return

    // 设置画布尺寸
    canvas.width = viewport.width
    canvas.height = viewport.height

    // 渲染PDF页面
    renderTask.value = await page.render({
      canvasContext: context,
      viewport: viewport
    }).promise

    // 适应容器大小
    fitToContainer()
  } catch (error) {
    if (error.name !== 'RenderingCancelledException') {
      console.error('渲染页面失败:', error)
    }
  }
}

// 适应容器大小
const fitToContainer = () => {
  if (!canvasRef.value || !containerRef.value) return

  const container = containerRef.value
  const canvas = canvasRef.value

  const containerWidth = container.clientWidth - 32 // 留出padding
  const canvasWidth = canvas.width

  if (canvasWidth > containerWidth) {
    const newScale = containerWidth / canvas.width * scale.value
    if (Math.abs(newScale - scale.value) > 0.01) {
      scale.value = newScale
      renderPage(currentPage.value)
    }
  }
}

// 缩放控制
const zoomIn = () => {
  const nextIndex = Math.min(currentZoomIndex.value + 1, zoomLevels.length - 1)
  scale.value = zoomLevels[nextIndex]
  renderPage(currentPage.value)
}

const zoomOut = () => {
  const prevIndex = Math.max(currentZoomIndex.value - 1, 0)
  scale.value = zoomLevels[prevIndex]
  renderPage(currentPage.value)
}

const resetZoom = () => {
  scale.value = 1.0
  renderPage(currentPage.value)
}

const fitToWidth = () => {
  if (!canvasRef.value || !containerRef.value) return

  const containerWidth = containerRef.value.clientWidth - 32
  const canvas = canvasRef.value
  scale.value = containerWidth / canvas.width
  renderPage(currentPage.value)
}

// 页面导航
const prevPage = () => {
  if (currentPage.value > 1) {
    currentPage.value--
    renderPage(currentPage.value)
  }
}

const nextPage = () => {
  if (currentPage.value < totalPages.value) {
    currentPage.value++
    renderPage(currentPage.value)
  }
}

const goToPage = (pageNum: number) => {
  if (pageNum >= 1 && pageNum <= totalPages.value) {
    currentPage.value = pageNum
    renderPage(currentPage.value)
  }
}

// 全屏控制
const toggleFullscreen = () => {
  if (!document.fullscreenElement) {
    containerRef.value?.requestFullscreen()
    isFullscreen.value = true
  } else {
    document.exitFullscreen()
    isFullscreen.value = false
  }
}

const handleFullscreenChange = () => {
  isFullscreen.value = !!document.fullscreenElement
}

// 键盘快捷键
const handleKeyDown = (event: KeyboardEvent) => {
  if (!props.visible) return

  switch (event.key) {
    case 'ArrowLeft':
      prevPage()
      break
    case 'ArrowRight':
      nextPage()
      break
    case '+':
    case '=':
      if (event.ctrlKey || event.metaKey) {
        event.preventDefault()
        zoomIn()
      }
      break
    case '-':
      if (event.ctrlKey || event.metaKey) {
        event.preventDefault()
        zoomOut()
      }
      break
    case '0':
      if (event.ctrlKey || event.metaKey) {
        event.preventDefault()
        resetZoom()
      }
      break
    case 'Escape':
      if (isFullscreen.value) {
        document.exitFullscreen()
      } else {
        handleClose()
      }
      break
  }
}

// 关闭预览
const handleClose = () => {
  emit('update:visible', false)
  emit('close')
}

// 下载PDF
const downloadPDF = () => {
  if (props.url) {
    const link = document.createElement('a')
    link.href = props.url
    link.download = props.title || 'document.pdf'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }
}

// 打印PDF
const printPDF = () => {
  if (props.url) {
    const printWindow = window.open(props.url, '_blank')
    if (printWindow) {
      printWindow.onload = () => {
        printWindow.print()
      }
    }
  }
}

// 监听URL变化
watch(() => props.url, (newUrl) => {
  if (newUrl && props.visible) {
    loadPDF()
  }
}, { immediate: true })

// 监听可见性变化
watch(() => props.visible, (visible) => {
  if (visible && props.url) {
    loadPDF()
  }
})

// 生命周期
onMounted(() => {
  document.addEventListener('keydown', handleKeyDown)
  document.addEventListener('fullscreenchange', handleFullscreenChange)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeyDown)
  document.removeEventListener('fullscreenchange', handleFullscreenChange)

  if (renderTask.value) {
    renderTask.value.cancel()
  }
})
</script>

<template>
  <el-dialog
    :model-value="visible"
    :title="title"
    width="90%"
    :fullscreen="isFullscreen"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
    @close="handleClose"
    class="pdf-preview-dialog"
  >
    <!-- 工具栏 -->
    <div class="pdf-toolbar">
      <div class="toolbar-left">
        <!-- 缩放控制 -->
        <el-button-group>
          <el-button @click="zoomOut" :disabled="currentZoomIndex === 0">
            <el-icon><ZoomOut /></el-icon>
          </el-button>
          <el-button @click="resetZoom">
            {{ Math.round(scale * 100) }}%
          </el-button>
          <el-button @click="zoomIn" :disabled="currentZoomIndex === zoomLevels.length - 1">
            <el-icon><ZoomIn /></el-icon>
          </el-button>
        </el-button-group>

        <el-button @click="fitToWidth">
          <el-icon><ScaleToOriginal /></el-icon>
          适应宽度
        </el-button>
      </div>

      <div class="toolbar-center">
        <!-- 页面导航 -->
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

        <!-- 页面跳转 -->
        <el-input-number
          v-model="currentPage"
          :min="1"
          :max="totalPages"
          :step="1"
          size="small"
          style="width: 80px"
          @change="goToPage"
        />
      </div>

      <div class="toolbar-right">
        <!-- 操作按钮 -->
        <el-button @click="printPDF">
          <el-icon><Printer /></el-icon>
          打印
        </el-button>
        <el-button @click="downloadPDF">
          <el-icon><Download /></el-icon>
          下载
        </el-button>
        <el-button @click="toggleFullscreen">
          <el-icon><FullScreen /></el-icon>
          {{ isFullscreen ? '退出全屏' : '全屏' }}
        </el-button>
      </div>
    </div>

    <!-- PDF内容区域 -->
    <div class="pdf-content" ref="containerRef">
      <div v-if="isLoading" class="pdf-loading">
        <el-icon class="loading-icon loading-spinner">
          <Loading />
        </el-icon>
        <p>加载中...</p>
      </div>

      <div v-else-if="!pdfDoc" class="pdf-error">
        <el-icon :size="64"><DocumentRemove /></el-icon>
        <p>无法加载PDF文件</p>
      </div>

      <div v-else class="pdf-canvas-container">
        <canvas ref="canvasRef" class="pdf-canvas" />
      </div>
    </div>

    <!-- 快捷键提示 -->
    <div class="pdf-shortcuts">
      <el-tooltip content="键盘快捷键" placement="left">
        <el-icon :size="16" class="shortcuts-icon">
          <QuestionFilled />
        </el-icon>
      </el-tooltip>

      <div class="shortcuts-content">
        <div class="shortcut-item">
          <kbd>←</kbd> / <kbd>→</kbd> 上一页/下一页
        </div>
        <div class="shortcut-item">
          <kbd>Ctrl</kbd> + <kbd>+</kbd> 放大
        </div>
        <div class="shortcut-item">
          <kbd>Ctrl</kbd> + <kbd>-</kbd> 缩小
        </div>
        <div class="shortcut-item">
          <kbd>Ctrl</kbd> + <kbd>0</kbd> 重置缩放
        </div>
        <div class="shortcut-item">
          <kbd>Esc</kbd> 关闭/退出全屏
        </div>
      </div>
    </div>
  </el-dialog>
</template>

<style scoped>
.pdf-preview-dialog {
  :deep(.el-dialog) {
    display: flex;
    flex-direction: column;
    height: 90vh;
    max-height: 90vh;
  }

  :deep(.el-dialog__body) {
    flex: 1;
    padding: 0;
    overflow: hidden;
  }
}

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
.toolbar-center,
.toolbar-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.toolbar-center {
  flex: 1;
  justify-content: center;
}

.pdf-content {
  flex: 1;
  overflow: auto;
  background: var(--el-fill-color-extra-light);
  position: relative;
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
}

.loading-icon {
  font-size: 48px;
}

.pdf-canvas-container {
  display: flex;
  justify-content: center;
  padding: 16px;
  min-height: 100%;
}

.pdf-canvas {
  max-width: 100%;
  height: auto;
  box-shadow: var(--shadow-lg);
  border: 1px solid var(--el-border-color-light);
  background: white;
}

.pdf-shortcuts {
  position: absolute;
  bottom: 16px;
  right: 16px;
  z-index: 10;
}

.shortcuts-icon {
  color: var(--text-disabled);
  cursor: pointer;
  transition: color 0.2s ease;
}

.shortcuts-icon:hover {
  color: var(--primary-color);
}

.shortcuts-content {
  position: absolute;
  bottom: 24px;
  right: 0;
  background: var(--el-bg-color-overlay);
  border: 1px solid var(--el-border-color-light);
  border-radius: var(--border-radius-base);
  padding: 12px;
  box-shadow: var(--shadow-lg);
  min-width: 200px;
  display: none;
}

.shortcuts-content:hover {
  display: block;
}

.pdf-shortcuts:hover .shortcuts-content {
  display: block;
}

.shortcut-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
  margin-bottom: 4px;
}

.shortcut-item:last-child {
  margin-bottom: 0;
}

kbd {
  background: var(--el-fill-color-light);
  border: 1px solid var(--el-border-color);
  border-radius: 3px;
  padding: 2px 6px;
  font-family: monospace;
  font-size: var(--font-size-xs);
  color: var(--text-primary);
}

/* 全屏模式 */
:deep(.el-dialog.is-fullscreen) {
  height: 100vh;
  max-height: 100vh;
}

:deep(.el-dialog.is-fullscreen .el-dialog__body) {
  height: calc(100vh - 120px);
}

/* 响应式适配 */
@media (max-width: 768px) {
  .pdf-toolbar {
    flex-wrap: wrap;
    gap: 8px;
    padding: 8px 12px;
  }

  .toolbar-left,
  .toolbar-center,
  .toolbar-right {
    flex: 1;
    justify-content: center;
  }

  .toolbar-center {
    order: 3;
    width: 100%;
  }

  .pdf-canvas-container {
    padding: 8px;
  }

  .pdf-shortcuts {
    bottom: 8px;
    right: 8px;
  }
}

/* 暗色模式适配 */
.dark .pdf-canvas {
  border-color: var(--el-border-color-darker);
}

.dark .shortcuts-content {
  background: var(--el-bg-color-page);
  border-color: var(--el-border-color-darker);
}

.dark kbd {
  background: var(--el-fill-color-dark);
  border-color: var(--el-border-color-darker);
}
</style>