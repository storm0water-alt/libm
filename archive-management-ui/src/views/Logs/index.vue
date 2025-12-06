<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import SearchableTable from '@/components/common/SearchableTable.vue'
import type { OperationLog, TableColumn, SearchCondition } from '@/types'
import { mockData, formatDate, getOperationTypeText } from '@/utils'

// 响应式数据
const loading = ref(false)
const logs = ref<OperationLog[]>([])
const selectedLogs = ref<OperationLog[]>([])

// 搜索表单
const searchForm = reactive({
  operatorName: '',
  operationType: '',
  dateRange: null as [string, string] | null,
  keyword: ''
})

// 分页数据
const pagination = reactive({
  page: 1,
  size: 20,
  total: 0
})

// 搜索条件配置
const searchConditions: SearchCondition[] = [
  {
    field: 'operatorName',
    label: '操作人',
    type: 'input',
    placeholder: '请输入操作人姓名'
  },
  {
    field: 'operationType',
    label: '操作类型',
    type: 'select',
    placeholder: '请选择操作类型',
    options: [
      { label: '新增', value: 'create' },
      { label: '修改', value: 'update' },
      { label: '删除', value: 'delete' },
      { label: '下载', value: 'download' },
      { label: '入库', value: 'import' },
      { label: '导出', value: 'export' }
    ]
  },
  {
    field: 'dateRange',
    label: '时间范围',
    type: 'daterange',
    placeholder: '选择时间范围'
  },
  {
    field: 'keyword',
    label: '关键词',
    type: 'input',
    placeholder: '搜索目标文件或描述'
  }
]

// 表格列配置
const tableColumns: TableColumn[] = [
  {
    prop: 'operatorName',
    label: '操作人',
    width: 100,
    sortable: true
  },
  {
    prop: 'operationType',
    label: '操作类型',
    width: 100,
    sortable: true,
    formatter: (row) => getOperationTypeText(row.operationType)
  },
  {
    prop: 'targetName',
    label: '操作对象',
    minWidth: 200
  },
  {
    prop: 'description',
    label: '描述',
    minWidth: 150
  },
  {
    prop: 'ip',
    label: 'IP地址',
    width: 120
  },
  {
    prop: 'createdAt',
    label: '操作时间',
    width: 160,
    sortable: true,
    formatter: (row) => formatDate(row.createdAt, 'YYYY-MM-DD HH:mm:ss')
  }
]

// 操作类型统计
const operationStats = computed(() => {
  const stats: Record<string, number> = {}
  logs.value.forEach(log => {
    stats[log.operationType] = (stats[log.operationType] || 0) + 1
  })

  return [
    { type: 'create', label: '新增', count: stats.create || 0, color: 'success' },
    { type: 'update', label: '修改', count: stats.update || 0, color: 'warning' },
    { type: 'delete', label: '删除', count: stats.delete || 0, color: 'danger' },
    { type: 'download', label: '下载', count: stats.download || 0, color: 'primary' },
    { type: 'import', label: '入库', count: stats.import || 0, color: 'info' },
    { type: 'export', label: '导出', count: stats.export || 0, color: 'success' }
  ]
})

// 加载日志数据
const loadLogs = async () => {
  loading.value = true
  try {
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 800))

    // 生成模拟数据
    const allLogs = mockData.generateLogs(500)

    // 应用搜索过滤
    let filteredLogs = allLogs.filter(log => {
      if (searchForm.operatorName && !log.operatorName.includes(searchForm.operatorName)) {
        return false
      }
      if (searchForm.operationType && log.operationType !== searchForm.operationType) {
        return false
      }

      // 时间范围过滤
      if (searchForm.dateRange && searchForm.dateRange.length === 2) {
        const logDate = new Date(log.createdAt)
        const startDate = new Date(searchForm.dateRange[0])
        const endDate = new Date(searchForm.dateRange[1])
        if (logDate < startDate || logDate > endDate) {
          return false
        }
      }

      // 关键词搜索
      if (searchForm.keyword) {
        const keyword = searchForm.keyword.toLowerCase()
        const searchableText = `${log.targetName} ${log.description} ${log.targetId}`.toLowerCase()
        if (!searchableText.includes(keyword)) {
          return false
        }
      }

      return true
    })

    // 分页
    const start = (pagination.page - 1) * pagination.size
    const end = start + pagination.size
    logs.value = filteredLogs.slice(start, end)
    pagination.total = filteredLogs.length
  } catch (error) {
    console.error('加载日志数据失败:', error)
    ElMessage.error('加载日志数据失败')
  } finally {
    loading.value = false
  }
}

// 搜索表单更新处理
const handleSearchFormUpdate = (newForm: any) => {
  Object.assign(searchForm, newForm)
}

// 分页更新处理
const handlePaginationUpdate = (newPagination: any) => {
  Object.assign(pagination, newPagination)
}

// 搜索处理
const handleSearch = () => {
  pagination.page = 1
  loadLogs()
}

// 重置搜索
const handleReset = () => {
  Object.assign(searchForm, {
    operatorName: '',
    operationType: '',
    dateRange: null,
    keyword: ''
  })
  handleSearch()
}

// 选择变化处理
const handleSelectionChange = (selection: OperationLog[]) => {
  selectedLogs.value = selection
}

// 分页大小变化
const handleSizeChange = (size: number) => {
  pagination.size = size
  pagination.page = 1
  loadLogs()
}

// 当前页变化
const handleCurrentChange = (current: number) => {
  pagination.page = current
  loadLogs()
}

// 排序变化
const handleSortChange = (sort: { column: any; prop: string; order: string }) => {
  console.log('排序变化:', sort)
  loadLogs()
}

// 导出日志
const handleExport = async () => {
  try {
    const selectedData = selectedLogs.value.length > 0 ? selectedLogs.value : logs.value

    if (selectedData.length === 0) {
      ElMessage.warning('没有可导出的数据')
      return
    }

    // 模拟导出延迟
    await new Promise(resolve => setTimeout(resolve, 1000))

    // 这里可以调用导出CSV的功能
    const csvData = selectedData.map(log => ({
      '操作人': log.operatorName,
      '操作类型': getOperationTypeText(log.operationType),
      '操作对象': log.targetName,
      '描述': log.description,
      'IP地址': log.ip,
      '操作时间': formatDate(log.createdAt, 'YYYY-MM-DD HH:mm:ss')
    }))

    ElMessage.success(`成功导出 ${selectedData.length} 条日志记录`)
  } catch (error) {
    ElMessage.error('导出失败')
  }
}

// 清空日志
const handleClearLogs = async () => {
  try {
    await ElMessageBox.confirm(
      '确定要清空所有日志记录吗？此操作不可恢复！',
      '清空确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    // 模拟清空API调用
    await new Promise(resolve => setTimeout(resolve, 1000))

    logs.value = []
    pagination.total = 0
    ElMessage.success('日志清空成功')
  } catch {
    // 用户取消
  }
}

// 页面初始化
onMounted(() => {
  loadLogs()
})
</script>

<template>
  <div class="logs-management">
    <!-- 页面标题 -->
    <div class="page-header">
      <h2 class="page-title">操作日志</h2>
      <div class="header-actions">
        <el-button
          type="success"
          @click="handleExport"
          :disabled="logs.length === 0"
        >
          <el-icon><Download /></el-icon>
          导出日志
        </el-button>
        <el-button
          type="danger"
          @click="handleClearLogs"
          :disabled="logs.length === 0"
        >
          <el-icon><Delete /></el-icon>
          清空日志
        </el-button>
      </div>
    </div>

    <!-- 统计信息 -->
    <div class="stats-section">
      <div class="stats-grid">
        <div
          v-for="stat in operationStats"
          :key="stat.type"
          class="stat-item"
          :class="`stat-${stat.color}`"
        >
          <div class="stat-count">{{ stat.count }}</div>
          <div class="stat-label">{{ stat.label }}</div>
        </div>
      </div>
    </div>

    <!-- 搜索和表格 -->
    <SearchableTable
      :data="logs"
      :loading="loading"
      :columns="tableColumns"
      :search-conditions="searchConditions"
      :search-form="searchForm"
      :pagination="pagination"
      :show-selection="true"
      :batch-operations="[]"
      @update:search-form="handleSearchFormUpdate"
      @update:pagination="handlePaginationUpdate"
      @search="handleSearch"
      @reset="handleReset"
      @selection-change="handleSelectionChange"
      @sort-change="handleSortChange"
      @size-change="handleSizeChange"
      @current-change="handleCurrentChange"
    >
      <!-- 操作类型列 -->
      <template #operationType="{ row }">
        <el-tag
          :type="row.operationType === 'delete' ? 'danger' :
                row.operationType === 'create' ? 'success' :
                row.operationType === 'download' ? 'primary' : 'warning'"
          size="small"
        >
          {{ getOperationTypeText(row.operationType) }}
        </el-tag>
      </template>

      <!-- 操作对象列 -->
      <template #targetName="{ row }">
        <div class="target-info">
          <div class="target-name">{{ row.targetName }}</div>
          <div class="target-id">{{ row.targetId }}</div>
        </div>
      </template>
    </SearchableTable>

    <!-- 选中信息 -->
    <div v-if="selectedLogs.length > 0" class="selection-info">
      <el-card>
        <div class="selection-content">
          <span>已选择 <strong>{{ selectedLogs.length }}</strong> 条日志记录</span>
          <el-button type="text" @click="selectedLogs = []">清空选择</el-button>
        </div>
      </el-card>
    </div>
  </div>
</template>

<style scoped>
.logs-management {
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

.header-actions {
  display: flex;
  gap: 12px;
}

.stats-section {
  margin-bottom: 20px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 16px;
}

.stat-item {
  background: var(--card-background);
  padding: 20px;
  border-radius: var(--border-radius-lg);
  text-align: center;
  box-shadow: var(--shadow-base);
  border-left: 4px solid;
}

.stat-success {
  border-left-color: var(--success-color);
}

.stat-warning {
  border-left-color: var(--warning-color);
}

.stat-danger {
  border-left-color: var(--danger-color);
}

.stat-primary {
  border-left-color: var(--primary-color);
}

.stat-info {
  border-left-color: var(--info-color);
}

.stat-count {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-bold);
  color: var(--text-primary);
  margin-bottom: 4px;
}

.stat-label {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
}

.target-info {
  line-height: 1.4;
}

.target-name {
  font-weight: var(--font-weight-medium);
  color: var(--text-primary);
}

.target-id {
  font-size: var(--font-size-xs);
  color: var(--text-disabled);
  font-family: monospace;
}

.selection-info {
  margin-top: 16px;
}

.selection-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
}

.selection-content strong {
  color: var(--primary-color);
}

/* 响应式适配 */
@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }

  .header-actions {
    width: 100%;
    justify-content: flex-end;
  }

  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }

  .stat-item {
    padding: 16px 12px;
  }

  .stat-count {
    font-size: var(--font-size-xl);
  }
}

@media (max-width: 480px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }

  .header-actions {
    flex-direction: column;
    width: 100%;
  }

  .header-actions .el-button {
    width: 100%;
  }
}

/* 紧凑模式适配 */
.compact .stats-section {
  margin-bottom: 16px;
}

.compact .stat-item {
  padding: 16px;
}
</style>