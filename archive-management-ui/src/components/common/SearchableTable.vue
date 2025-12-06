<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { TableColumn, SearchCondition, BatchOperation } from '@/types'

interface Props {
  data: any[]
  loading?: boolean
  columns: TableColumn[]
  searchConditions?: SearchCondition[]
  searchForm?: Record<string, any>
  pagination?: {
    page: number
    size: number
    total: number
  }
  showSelection?: boolean
  showPagination?: boolean
  height?: string | number
  maxHeight?: string | number
  batchOperations?: BatchOperation[]
  rowKey?: string
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  searchConditions: () => [],
  searchForm: () => ({}),
  pagination: () => ({ page: 1, size: 20, total: 0 }),
  showSelection: true,
  showPagination: true,
  rowKey: 'id'
})

const emit = defineEmits<{
  'update:search-form': [form: Record<string, any>]
  'update:pagination': [pagination: { page: number; size: number; total: number }]
  search: []
  reset: []
  'selection-change': [selection: any[]]
  'row-click': [row: any, column: any, event: Event]
  'sort-change': [sort: { column: any; prop: string; order: string }]
  'size-change': [size: number]
  'current-change': [current: number]
}>()

// 内部状态
const tableRef = ref()
const selection = ref<any[]>([])
const internalSearchForm = ref<Record<string, any>>({})

// 初始化搜索表单
onMounted(() => {
  internalSearchForm.value = { ...props.searchForm }
})

// 监听搜索表单变化
watch(() => props.searchForm, (newForm) => {
  internalSearchForm.value = { ...newForm }
}, { deep: true })

// 内部搜索表单变化时触发更新
const handleSearchFormChange = () => {
  emit('update:search-form', internalSearchForm.value)
}

// 搜索条件类型渲染
const renderSearchField = (condition: SearchCondition) => {
  switch (condition.type) {
    case 'input':
      return 'el-input'
    case 'select':
      return 'el-select'
    case 'daterange':
      return 'el-date-picker'
    case 'number':
      return 'el-input-number'
    default:
      return 'el-input'
  }
}

// 执行搜索
const handleSearch = () => {
  emit('search')
}

// 重置搜索
const handleReset = () => {
  internalSearchForm.value = {}
  emit('update:search-form', internalSearchForm.value)
  emit('reset')
}

// 选择变化
const handleSelectionChange = (val: any[]) => {
  selection.value = val
  emit('selection-change', val)
}

// 行点击
const handleRowClick = (row: any, column: any, event: Event) => {
  emit('row-click', row, column, event)
}

// 排序变化
const handleSortChange = (sort: { column: any; prop: string; order: string }) => {
  emit('sort-change', sort)
}

// 分页大小变化
const handleSizeChange = (size: number) => {
  emit('update:pagination', { ...props.pagination, size })
  emit('size-change', size)
}

// 当前页变化
const handleCurrentChange = (current: number) => {
  emit('update:pagination', { ...props.pagination, page: current })
  emit('current-change', current)
}

// 清空选择
const clearSelection = () => {
  tableRef.value?.clearSelection()
}

// 切换行选择
const toggleRowSelection = (row: any, selected?: boolean) => {
  tableRef.value?.toggleRowSelection(row, selected)
}

// 全选切换
const toggleAllSelection = () => {
  tableRef.value?.toggleAllSelection()
}

// 批量操作处理
const handleBatchOperation = async (operation: BatchOperation) => {
  if (!selection.value.length) {
    ElMessage.warning('请先选择要操作的数据')
    return
  }

  if (operation.confirm) {
    try {
      await ElMessageBox.confirm(
        operation.confirmMessage || `确定要${operation.label}选中的 ${selection.value.length} 条数据吗？`,
        '批量操作确认',
        {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        }
      )
    } catch {
      return
    }
  }

  try {
    await operation.action(selection.value)
    ElMessage.success(`${operation.label}成功`)
    clearSelection()
  } catch (error) {
    console.error('批量操作失败:', error)
    ElMessage.error(`${operation.label}失败`)
  }
}

// 计算是否有选中的数据
const hasSelection = computed(() => selection.value.length > 0)

// 暴露方法给父组件
defineExpose({
  clearSelection,
  toggleRowSelection,
  toggleAllSelection,
  selection
})
</script>

<template>
  <div class="searchable-table">
    <!-- 搜索区域 -->
    <div v-if="searchConditions.length > 0" class="search-section">
      <el-card class="search-card">
        <el-form :model="internalSearchForm" inline class="search-form">
          <el-form-item
            v-for="condition in searchConditions"
            :key="condition.field"
            :label="condition.label"
          >
            <!-- 输入框 -->
            <el-input
              v-if="condition.type === 'input'"
              v-model="internalSearchForm[condition.field]"
              :placeholder="condition.placeholder"
              clearable
              @input="handleSearchFormChange"
            />

            <!-- 选择器 -->
            <el-select
              v-else-if="condition.type === 'select'"
              v-model="internalSearchForm[condition.field]"
              :placeholder="condition.placeholder"
              clearable
              @change="handleSearchFormChange"
            >
              <el-option
                v-for="option in condition.options"
                :key="option.value"
                :label="option.label"
                :value="option.value"
              />
            </el-select>

            <!-- 日期范围选择器 -->
            <el-date-picker
              v-else-if="condition.type === 'daterange'"
              v-model="internalSearchForm[condition.field]"
              type="daterange"
              range-separator="至"
              start-placeholder="开始日期"
              end-placeholder="结束日期"
              @change="handleSearchFormChange"
            />

            <!-- 数字输入框 -->
            <el-input-number
              v-else-if="condition.type === 'number'"
              v-model="internalSearchForm[condition.field]"
              :placeholder="condition.placeholder"
              @change="handleSearchFormChange"
            />
          </el-form-item>

          <!-- 操作按钮 -->
          <el-form-item>
            <el-button type="primary" :loading="loading" @click="handleSearch">
              <el-icon><Search /></el-icon>
              搜索
            </el-button>
            <el-button @click="handleReset">
              <el-icon><Refresh /></el-icon>
              重置
            </el-button>
          </el-form-item>
        </el-form>
      </el-card>
    </div>

    <!-- 操作区域 -->
    <div v-if="batchOperations?.length" class="action-section">
      <div class="action-left">
        <el-button
          v-for="operation in batchOperations"
          :key="operation.key"
          :type="operation.type"
          :disabled="!hasSelection"
          @click="handleBatchOperation(operation)"
        >
          <el-icon>
            <component :is="operation.icon" />
          </el-icon>
          {{ operation.label }}
        </el-button>
      </div>

      <div v-if="hasSelection" class="action-right">
        <span class="selection-info">
          已选择 <strong>{{ selection.length }}</strong> 项
          <el-button type="text" @click="clearSelection">清空</el-button>
        </span>
      </div>
    </div>

    <!-- 表格区域 -->
    <div class="table-section">
      <el-table
        ref="tableRef"
        :data="data"
        :loading="loading"
        :height="height"
        :max-height="maxHeight"
        :row-key="rowKey"
        @selection-change="handleSelectionChange"
        @row-click="handleRowClick"
        @sort-change="handleSortChange"
      >
        <!-- 选择列 -->
        <el-table-column
          v-if="showSelection"
          type="selection"
          width="55"
          align="center"
        />

        <!-- 数据列 -->
        <el-table-column
          v-for="column in columns"
          :key="column.prop"
          :prop="column.prop"
          :label="column.label"
          :width="column.width"
          :min-width="column.minWidth"
          :sortable="column.sortable"
          :align="column.align || 'left'"
          :formatter="column.formatter"
        />

        <!-- 空数据提示 -->
        <template #empty>
          <div class="empty-content">
            <el-icon :size="64" class="empty-icon">
              <Document />
            </el-icon>
            <p class="empty-text">暂无数据</p>
          </div>
        </template>
      </el-table>
    </div>

    <!-- 分页区域 -->
    <div v-if="showPagination" class="pagination-section">
      <el-pagination
        v-model:current-page="pagination.page"
        v-model:page-size="pagination.size"
        :total="pagination.total"
        :page-sizes="[10, 20, 50, 100]"
        :background="true"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
      />
    </div>
  </div>
</template>

<style scoped>
.searchable-table {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.search-section {
  margin-bottom: 8px;
}

.search-card {
  border-radius: var(--border-radius-lg);
}

.search-form {
  margin: 0;
}

.search-form :deep(.el-form-item) {
  margin-bottom: 16px;
  margin-right: 16px;
}

.search-form :deep(.el-form-item:last-child) {
  margin-right: 0;
}

.action-section {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: var(--card-background);
  border-radius: var(--border-radius-lg);
  box-shadow: var(--shadow-sm);
}

.action-left {
  display: flex;
  gap: 8px;
}

.action-right {
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
}

.selection-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.selection-info strong {
  color: var(--primary-color);
  font-weight: var(--font-weight-semibold);
}

.table-section {
  background: var(--card-background);
  border-radius: var(--border-radius-lg);
  overflow: hidden;
  box-shadow: var(--shadow-base);
}

.empty-content {
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

.empty-text {
  margin: 0;
  font-size: var(--font-size-sm);
}

.pagination-section {
  display: flex;
  justify-content: center;
  padding: 16px 0;
}

/* 响应式适配 */
@media (max-width: 768px) {
  .action-section {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
    padding: 12px;
  }

  .action-left {
    width: 100%;
    justify-content: flex-start;
  }

  .search-form :deep(.el-form-item) {
    margin-right: 0;
    margin-bottom: 12px;
    width: 100%;
  }

  .search-form :deep(.el-form-item:last-child) {
    margin-bottom: 0;
  }

  .pagination-section {
    padding: 12px 0;
  }
}

/* 中等屏幕适配 - 处理表单换行 */
@media (max-width: 1200px) and (min-width: 769px) {
  .search-form :deep(.el-form-item) {
    margin-bottom: 12px;
  }
}

/* 暗色模式适配 */
.dark .search-card,
.dark .table-section,
.dark .action-section {
  background: var(--el-bg-color-overlay);
  border: 1px solid var(--el-border-color-darker);
}

.dark .empty-content {
  color: var(--text-disabled);
}

/* 紧凑模式适配 */
.compact .searchable-table {
  gap: 12px;
}

.compact .search-card,
.compact .action-section {
  padding: 12px;
}

.compact .action-section {
  padding: 8px 12px;
}

.compact .pagination-section {
  padding: 12px 0;
}
</style>