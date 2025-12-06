<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import type { ImportRecord, FileInfo } from '@/types'

// 状态管理
const loading = ref(false)
const externalFiles = ref<FileInfo[]>([])
const importRecords = ref<ImportRecord[]>([])
const selectedFiles = ref<FileInfo[]>([])

// 加载外部设备文件
const loadExternalFiles = async () => {
  loading.value = true
  try {
    // 模拟扫描外部设备
    await new Promise(resolve => setTimeout(resolve, 1500))

    // 生成模拟文件列表
    const mockFiles = [
      { name: '项目报告.pdf', path: '/Volumes/USB/项目报告.pdf', size: 2048576, type: 'pdf', modifiedAt: '2024-01-15', isSelected: false },
      { name: '财务数据.xlsx', path: '/Volumes/USB/财务数据.xlsx', size: 1048576, type: 'xlsx', modifiedAt: '2024-01-14', isSelected: false },
      { name: '会议纪要.docx', path: '/Volumes/USB/会议纪要.docx', size: 524288, type: 'docx', modifiedAt: '2024-01-13', isSelected: false },
      { name: '产品介绍.pptx', path: '/Volumes/USB/产品介绍.pptx', size: 3145728, type: 'pptx', modifiedAt: '2024-01-12', isSelected: false },
      { name: '用户手册.pdf', path: '/Volumes/USB/用户手册.pdf', size: 4194304, type: 'pdf', modifiedAt: '2024-01-11', isSelected: false }
    ]

    externalFiles.value = mockFiles
    ElMessage.success('检测到外部设备文件')
  } catch (error) {
    ElMessage.error('扫描外部设备失败')
  } finally {
    loading.value = false
  }
}

// 加载入库记录
const loadImportRecords = async () => {
  try {
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 800))

    const mockRecords = [
      {
        id: '1',
        fileName: '合同文件.pdf',
        originalPath: '/Volumes/USB/合同文件.pdf',
        targetPath: '/archives/2024/01/合同文件.pdf',
        status: 'completed' as const,
        progress: 100,
        fileSize: 1024000,
        processedSize: 1024000,
        operator: 'admin',
        createdAt: '2024-01-15T10:30:00',
        completedAt: '2024-01-15T10:32:00'
      },
      {
        id: '2',
        fileName: '技术文档.docx',
        originalPath: '/Volumes/USB/技术文档.docx',
        targetPath: '/archives/2024/01/技术文档.docx',
        status: 'processing' as const,
        progress: 65,
        fileSize: 512000,
        processedSize: 332800,
        operator: 'user',
        createdAt: '2024-01-15T11:00:00'
      }
    ]

    importRecords.value = mockRecords
  } catch (error) {
    ElMessage.error('加载入库记录失败')
  }
}

// 文件选择变化
const handleSelectionChange = (selection: FileInfo[]) => {
  selectedFiles.value = selection
}

// 批量入库
const handleBatchImport = async () => {
  if (selectedFiles.value.length === 0) {
    ElMessage.warning('请先选择要入库的文件')
    return
  }

  try {
    loading.value = true

    // 模拟入库过程
    for (const file of selectedFiles.value) {
      // 创建入库记录
      const record: ImportRecord = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        fileName: file.name,
        originalPath: file.path,
        targetPath: `/archives/${new Date().getFullYear()}/${String(new Date().getMonth() + 1).padStart(2, '0')}/${file.name}`,
        status: 'processing',
        progress: 0,
        fileSize: file.size,
        processedSize: 0,
        operator: 'admin',
        createdAt: new Date().toISOString()
      }

      importRecords.value.unshift(record)

      // 模拟进度更新
      for (let progress = 10; progress <= 100; progress += 10) {
        await new Promise(resolve => setTimeout(resolve, 200))
        record.progress = progress
        record.processedSize = Math.floor(file.size * progress / 100)

        if (progress === 100) {
          record.status = 'completed'
          record.completedAt = new Date().toISOString()
        }
      }
    }

    ElMessage.success(`成功入库 ${selectedFiles.value.length} 个文件`)

    // 清空选择
    selectedFiles.value = []
    externalFiles.value = externalFiles.value.map(file => ({ ...file, isSelected: false }))
  } catch (error) {
    ElMessage.error('入库过程失败')
  } finally {
    loading.value = false
  }
}

// 格式化文件大小
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// 获取状态文本
const getStatusText = (status: string): string => {
  const statusMap: Record<string, string> = {
    pending: '等待中',
    processing: '进行中',
    completed: '已完成',
    failed: '失败'
  }
  return statusMap[status] || status
}

// 获取状态类型
const getStatusType = (status: string): 'info' | 'warning' | 'success' | 'danger' => {
  const typeMap: Record<string, 'info' | 'warning' | 'success' | 'danger'> = {
    pending: 'info',
    processing: 'warning',
    completed: 'success',
    failed: 'danger'
  }
  return typeMap[status] || 'info'
}

// 页面初始化
onMounted(() => {
  loadExternalFiles()
  loadImportRecords()
})
</script>

<template>
  <div class="import-management">
    <!-- 页面标题 -->
    <div class="page-header">
      <h2 class="page-title">档案入库</h2>
      <el-button type="primary" @click="loadExternalFiles" :loading="loading">
        <el-icon><Refresh /></el-icon>
        刷新设备
      </el-button>
    </div>

    <div class="import-content">
      <!-- 外部设备文件列表 -->
      <el-card class="files-card">
        <template #header>
          <div class="card-header">
            <h3>外部设备文件</h3>
            <span class="file-count">{{ externalFiles.length }} 个文件</span>
          </div>
        </template>

        <div v-if="externalFiles.length === 0" class="empty-state">
          <el-icon :size="64" class="empty-icon"><FolderOpened /></el-icon>
          <p>未检测到外部设备文件</p>
          <el-button type="primary" @click="loadExternalFiles">
            重新扫描
          </el-button>
        </div>

        <el-table
          v-else
          :data="externalFiles"
          @selection-change="handleSelectionChange"
          row-key="name"
        >
          <el-table-column type="selection" width="55" />
          <el-table-column prop="name" label="文件名" min-width="200" />
          <el-table-column prop="size" label="大小" width="100">
            <template #default="{ row }">
              {{ formatFileSize(row.size) }}
            </template>
          </el-table-column>
          <el-table-column prop="type" label="类型" width="80" />
          <el-table-column prop="modifiedAt" label="修改时间" width="120" />
          <el-table-column label="操作" width="80">
            <template #default="{ row }">
              <el-button type="primary" size="small" text>
                预览
              </el-button>
            </template>
          </el-table-column>
        </el-table>

        <div v-if="selectedFiles.length > 0" class="batch-actions">
          <el-button
            type="primary"
            size="large"
            @click="handleBatchImport"
            :loading="loading"
          >
            <el-icon><Upload /></el-icon>
            批量入库 ({{ selectedFiles.length }})
          </el-button>
        </div>
      </el-card>

      <!-- 入库记录 -->
      <el-card class="records-card">
        <template #header>
          <div class="card-header">
            <h3>入库记录</h3>
            <el-button text type="primary" @click="loadImportRecords">
              <el-icon><Refresh /></el-icon>
              刷新
            </el-button>
          </div>
        </template>

        <el-table :data="importRecords" row-key="id">
          <el-table-column prop="fileName" label="文件名" min-width="200" />
          <el-table-column prop="originalPath" label="原路径" min-width="150" show-overflow-tooltip />
          <el-table-column prop="status" label="状态" width="100">
            <template #default="{ row }">
              <el-tag :type="getStatusType(row.status)" size="small">
                {{ getStatusText(row.status) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="progress" label="进度" width="120">
            <template #default="{ row }">
              <el-progress
                :percentage="row.progress"
                :status="row.status === 'failed' ? 'exception' : row.status === 'completed' ? 'success' : undefined"
                :stroke-width="6"
              />
            </template>
          </el-table-column>
          <el-table-column prop="operator" label="操作人" width="100" />
          <el-table-column prop="createdAt" label="开始时间" width="150">
            <template #default="{ row }">
              {{ new Date(row.createdAt).toLocaleString() }}
            </template>
          </el-table-column>
        </el-table>
      </el-card>
    </div>
  </div>
</template>

<style scoped>
.import-management {
  padding: 0;
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
  min-height: 100%;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.page-title {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
  margin: 0;
}

.import-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.card-header h3 {
  margin: 0;
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
}

.file-count {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  color: var(--text-disabled);
}

.empty-icon {
  margin-bottom: 16px;
  opacity: 0.5;
}

.batch-actions {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--el-border-color-lighter);
  display: flex;
  justify-content: center;
}

/* 响应式适配 */
@media (max-width: 1200px) {
  .import-content {
    grid-template-columns: 1fr;
    gap: 16px;
  }
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .batch-actions {
    justify-content: flex-start;
  }
}
</style>