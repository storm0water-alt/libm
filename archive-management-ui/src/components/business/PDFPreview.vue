<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import type { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist'

// PDF.js 已经在 main.ts 中全局初始化，这里直接使用

interface Props {
  visible: boolean
  url: string
  title?: string
  archiveId?: string  // 新增：档案号
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
const pdfDoc = ref<PDFDocumentProxy | null>(null)
const currentPage = ref(1)
const totalPages = ref(0)
const scale = ref(1.0)
const isLoading = ref(false)
const isFullscreen = ref(false)
const renderTask = ref<any>(null)
const loadError = ref<string | null>(null)
const retryCount = ref(0)
const maxRetries = 3
const isLoadingPDF = ref(false)

// 添加实例ID用于调试
const instanceId = Math.random().toString(36).substr(2, 9)
console.log(`PDFPreview component instance created: ${instanceId}`)

// 预定义的缩放比例
const zoomLevels = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0]
const currentZoomIndex = computed(() => {
  return zoomLevels.findIndex(level => Math.abs(level - scale.value) < 0.01)
})

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

// 响应式对话框宽度
const dialogWidth = computed(() => {
  if (isMobile.value) return '95%'
  if (window.innerWidth < 1200) return '90%'
  return '80%'
})

// 加载PDF文档
const loadPDF = async () => {
  // 防止重复加载
  if (isLoadingPDF.value) {
    console.log('PDF is already loading, skipping...')
    return
  }

  console.log('=== PDF Preview Debug Info ===')
  console.log('loadPDF called')
  console.log('props.url:', props.url)
  console.log('props.archiveId:', props.archiveId)
  console.log('props.title:', props.title)

  if (!props.url) {
    loadError.value = '暂无可用的PDF预览文件'
    return
  }

  // 检查 PDF.js 是否已加载
  if (!pdfjsLib && !window.pdfjsLib) {
    console.error('PDF.js library not available')
    console.error('pdfjsLib (imported):', pdfjsLib)
    console.error('window.pdfjsLib:', window.pdfjsLib)
    loadError.value = 'PDF.js 库未加载，请刷新页面重试'
    ElMessage.error('PDF.js 库未加载，请刷新页面重试')
    return
  }

  // 使用全局的 pdfjsLib
  if (!window.pdfjsLib) {
    console.error('PDF.js not initialized')
    loadError.value = 'PDF.js未初始化，请刷新页面'
    ElMessage.error('PDF.js未初始化，请刷新页面')
    return
  }

  const pdfLib = window.pdfjsLib
  console.log('PDF.js library loaded successfully')
  console.log('PDF.js version:', pdfLib.version)
  console.log('Worker source:', pdfLib.GlobalWorkerOptions.workerSrc)
  console.log('PDF URL:', props.url)

  isLoadingPDF.value = true
  isLoading.value = true
  loadError.value = null

  try {
    // 检查URL是否有效
    if (!props.url.startsWith('/api/') && !props.url.startsWith('http') && !props.url.startsWith('/sample-pdfs/')) {
      throw new Error('无效的PDF文件URL')
    }

    console.log('Using PDF.js version:', pdfLib.version)
    console.log('Worker source:', pdfLib.GlobalWorkerOptions.workerSrc)

    // 清理之前的PDF文档
    if (pdfDoc.value) {
      try {
        await pdfDoc.value.destroy()
      } catch (e) {
        // 忽略销毁时的错误
      }
      pdfDoc.value = null
    }

    // 使用最简配置加载 PDF
    const loadingTask = pdfLib.getDocument({
      url: props.url,
      disableAutoFetch: true,
      disableStream: true
    })

    pdfDoc.value = await loadingTask.promise
    totalPages.value = pdfDoc.value.numPages
    currentPage.value = 1
    retryCount.value = 0
    console.log('PDF loaded successfully, pages:', totalPages.value)

    // 等待 DOM 更新后再渲染页面
    await nextTick()
    console.log('Next tick completed, canvas ref exists:', !!canvasRef.value)

    // 延迟一小段时间确保 canvas 元素已挂载
    setTimeout(async () => {
      if (canvasRef.value && pdfDoc.value) {
        // 首次加载时，自动适应容器大小
        await fitPDFToView()
      } else {
        console.error('Canvas or PDF document not available after timeout')
      }
    }, 100)
  } catch (error: any) {
    console.error('=== PDF Load Error Debug Info ===')
    console.error('Error object:', error)
    console.error('Error name:', error.name)
    console.error('Error message:', error.message)
    console.error('Error stack:', error.stack)
    console.error('PDF URL:', props.url)
    console.error('window.location.href:', window.location.href)

    // 检查是否是网络错误
    if (error.message && error.message.includes('NetworkError')) {
      console.error('Network error detected - checking file accessibility...')
      try {
        const headResponse = await fetch(props.url, { method: 'HEAD' })
        console.error('HEAD response status:', headResponse.status)
        console.error('HEAD response ok:', headResponse.ok)
      } catch (headError) {
        console.error('HEAD request failed:', headError)
      }
    }

    // 根据错误类型设置不同的错误信息
    if (error.name === 'InvalidPDFException') {
      loadError.value = '文件格式错误，不是有效的PDF文件'
    } else if (error.name === 'MissingPDFException') {
      loadError.value = '暂无可用的PDF预览文件'
    } else if (error.message && error.message.includes('404')) {
      loadError.value = 'PDF文件不存在'
    } else if (error.message && error.message.includes('network')) {
      loadError.value = '网络错误，请检查网络连接'
    } else if (error.message && error.message.includes('CORS')) {
      loadError.value = '跨域请求被阻止，无法加载PDF文件'
    } else if (error.message && error.message.includes('pagePromises')) {
      loadError.value = 'PDF版本兼容性问题，请刷新页面重试'
    } else {
      loadError.value = `文件加载失败: ${error.message || '未知错误'}`
    }

    ElMessage.error(loadError.value)
  } finally {
    isLoading.value = false
    isLoadingPDF.value = false
  }
}

// 重新加载PDF
const retryLoadPDF = async () => {
  if (retryCount.value >= maxRetries) {
    ElMessage.warning('已达到最大重试次数，请刷新页面重试')
    return
  }

  retryCount.value++
  ElMessage.info(`正在重新加载... (第${retryCount.value}次)`)

  // 重置状态
  isLoadingPDF.value = false

  await loadPDF()
}

// 渲染页面
const renderPage = async (pageNum: number) => {
  console.log('=== Render Page Debug Info ===')
  console.log('renderPage called with pageNum:', pageNum)
  console.log('pdfDoc.value exists:', !!pdfDoc.value)
  console.log('canvasRef.value exists:', !!canvasRef.value)
  console.log('currentPage.value:', currentPage.value)
  console.log('totalPages.value:', totalPages.value)

  if (!pdfDoc.value || !canvasRef.value) {
    console.error('Missing pdfDoc or canvasRef')
    return
  }

  try {
    // 取消之前的渲染任务
    if (renderTask.value) {
      try {
        renderTask.value.cancel()
      } catch (e) {
        // 忽略取消时的错误
      }
    }

    console.log('Getting page:', pageNum)
    const page = await pdfDoc.value.getPage(pageNum)
    console.log('Page loaded:', page)

    const viewport = page.getViewport({ scale: scale.value })
    console.log('Viewport:', viewport)

    const canvas = canvasRef.value
    const context = canvas.getContext('2d')

    if (!context) {
      console.error('Failed to get canvas context')
      return
    }
    console.log('Canvas context:', context)

    // 设置画布尺寸
    canvas.width = viewport.width
    canvas.height = viewport.height
    console.log('Canvas dimensions set:', canvas.width, 'x', canvas.height)

    // 渲染PDF页面
    const renderContext = {
      canvasContext: context,
      viewport: viewport
    }
    console.log('Starting render...')

    renderTask.value = page.render(renderContext)
    await renderTask.value.promise

    console.log('Render completed successfully')
    console.log('Canvas data URL length:', canvas.toDataURL().length)

    // 适应容器大小
    fitToContainer()
  } catch (error: any) {
    if (error.name !== 'RenderingCancelledException') {
      console.error('=== Render Error Debug Info ===')
      console.error('渲染页面失败:', error)
      console.error('错误详情:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      })

      // 如果是私有成员访问错误，显示错误信息但不自动重试
      if (error.message && error.message.includes('pagePromises')) {
        console.error('PDF.js版本兼容性问题，需要刷新页面')
        loadError.value = 'PDF版本兼容性问题，请刷新页面重试'
        ElMessage.error('PDF版本兼容性问题，请刷新页面重试')
        return
      }

      // 其他渲染错误
      ElMessage.error(`渲染失败: ${error.message || '未知错误'}`)
    }
  }
}

// 自动适应视图大小
const fitPDFToView = async () => {
  if (!pdfDoc.value || !containerRef.value) return

  const container = containerRef.value
  const containerWidth = container.clientWidth - 32 // 留出padding
  const containerHeight = container.clientHeight - 32 // 留出padding

  try {
    // 获取第一页来计算最佳缩放比例
    const page = await pdfDoc.value.getPage(1)
    const viewport = page.getViewport({ scale: 1.0 })

    // 计算适合容器的缩放比例
    const scaleX = containerWidth / viewport.width
    const scaleY = containerHeight / viewport.height
    const autoScale = Math.min(scaleX, scaleY) * 0.9 // 留出一些边距

    // 设置为适合的缩放比例
    scale.value = Math.max(autoScale, 0.3) // 最小缩放比例为0.3

    // 渲染第一页
    await renderPage(1)
  } catch (error) {
    console.error('Failed to fit PDF to view:', error)
    // 如果自动适应失败，使用默认缩放
    scale.value = 1.0
    await renderPage(1)
  }
}

// 适应容器大小
const fitToContainer = () => {
  if (!canvasRef.value || !containerRef.value) return

  const container = containerRef.value
  const canvas = canvasRef.value

  const containerWidth = container.clientWidth - 32 // 留出padding
  const containerHeight = container.clientHeight - 32 // 留出padding
  const canvasWidth = canvas.width
  const canvasHeight = canvas.height

  // 计算适合容器的缩放比例
  const scaleX = containerWidth / canvasWidth
  const scaleY = containerHeight / canvasHeight
  const newScale = Math.min(scaleX, scaleY, scale.value) // 不要放大，只缩小

  // 如果新的缩放比例与当前不同，则重新渲染
  if (Math.abs(newScale - scale.value) > 0.01) {
    scale.value = newScale
    renderPage(currentPage.value)
  }
}

// 缩放控制
const zoomIn = () => {
  const currentIndex = Math.max(currentZoomIndex.value, 0)
  const nextIndex = Math.min(currentIndex + 1, zoomLevels.length - 1)
  scale.value = zoomLevels[nextIndex] || 1.0
  renderPage(currentPage.value)
}

const zoomOut = () => {
  const currentIndex = Math.max(currentZoomIndex.value, 0)
  const prevIndex = Math.max(currentIndex - 1, 0)
  scale.value = zoomLevels[prevIndex] || 1.0
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
  // 重置状态
  if (pdfDoc.value) {
    try {
      pdfDoc.value.destroy()
    } catch (e) {
      // 忽略销毁时的错误
    }
  }
  pdfDoc.value = null
  loadError.value = null
  retryCount.value = 0
  currentPage.value = 1
  scale.value = 1.0
  isLoadingPDF.value = false

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

// 监听URL变化和可见性变化，合并为一个watch以避免重复加载
watch([() => props.url, () => props.visible], ([newUrl, visible]) => {
  console.log('=== Watch Triggered ===')
  console.log('URL:', newUrl)
  console.log('Visible:', visible)

  // 只有在URL存在且对话框可见时才加载PDF
  if (newUrl && visible) {
    console.log('Loading PDF...')
    loadPDF()
  }
}, { immediate: true })

// 窗口大小变化处理
const handleResize = () => {
  // 重新渲染PDF以适应新尺寸
  if (pdfDoc.value && currentPage.value) {
    setTimeout(() => {
      renderPage(currentPage.value)
    }, 100)
  }
}

// 生命周期
onMounted(() => {
  // PDF.js 已经在 index.html 中加载，不需要额外处理

  document.addEventListener('keydown', handleKeyDown)
  document.addEventListener('fullscreenchange', handleFullscreenChange)
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeyDown)
  document.removeEventListener('fullscreenchange', handleFullscreenChange)
  window.removeEventListener('resize', handleResize)

  if (renderTask.value) {
    renderTask.value.cancel()
  }
})
</script>

<template>
  <el-dialog
    :model-value="visible"
    :title="displayTitle"
    :width="dialogWidth"
    :fullscreen="isFullscreen || isMobile"
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
          :min="totalPages > 0 ? 1 : 0"
          :max="totalPages"
          :step="1"
          size="small"
          style="width: 80px"
          :disabled="totalPages <= 1"
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

      <div v-else-if="loadError || !pdfDoc" class="pdf-error">
        <el-icon :size="64" class="error-icon">
          <DocumentRemove />
        </el-icon>
        <h3 class="error-title">加载失败</h3>
        <p class="error-message">{{ loadError || '无法加载PDF文件' }}</p>
        <div class="error-actions">
          <el-button type="primary" @click="retryLoadPDF" :loading="isLoading">
            <el-icon><Refresh /></el-icon>
            重新加载
          </el-button>
          <el-button @click="handleClose">
            关闭
          </el-button>
        </div>
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
    display: flex;
    flex-direction: column;
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
  height: 100%;
  min-height: 0;
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

.pdf-canvas-container {
  display: flex;
  justify-content: center;
  padding: 16px;
  min-height: 100%;
  position: relative;
}

.pdf-canvas {
  max-width: 100%;
  height: auto;
  box-shadow: var(--shadow-lg);
  border: 1px solid var(--el-border-color-light);
  background: white;
  min-width: 200px;
  min-height: 300px;
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
@media (max-width: 1200px) {
  .pdf-toolbar {
    gap: 12px;
    padding: 10px 14px;
  }

  .toolbar-left {
    flex: 0.8;
  }

  .toolbar-right {
    flex: 1.2;
    justify-content: flex-end;
  }
}

@media (max-width: 768px) {
  .pdf-preview-dialog {
    :deep(.el-dialog) {
      height: 90vh;
      max-height: 90vh;
    }

    :deep(.el-dialog__header) {
      padding: 12px 16px;
    }

    :deep(.el-dialog__body) {
      padding: 0;
    }
  }

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

  .toolbar-left {
    order: 1;
  }

  .toolbar-right {
    order: 2;
  }

  .pdf-canvas-container {
    padding: 8px;
  }

  .pdf-shortcuts {
    display: none; /* 在移动设备上隐藏快捷键提示 */
  }

  /* 移动设备上的按钮调整 */
  .toolbar-left .el-button,
  .toolbar-center .el-button,
  .toolbar-right .el-button {
    padding: 6px 12px;
    font-size: 12px;
  }

  .toolbar-left .el-button-group .el-button,
  .toolbar-center .el-button-group .el-button {
    padding: 6px 8px;
  }
}

@media (max-width: 480px) {
  .pdf-toolbar {
    padding: 6px 8px;
  }

  .toolbar-left .el-button,
  .toolbar-center .el-button,
  .toolbar-right .el-button {
    padding: 4px 8px;
    font-size: 11px;
  }

  .toolbar-left .el-button-group .el-button,
  .toolbar-center .el-button-group .el-button {
    padding: 4px 6px;
    min-width: 32px;
  }

  .pdf-canvas-container {
    padding: 4px;
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