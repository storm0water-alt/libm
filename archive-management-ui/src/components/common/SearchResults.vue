<script setup lang="ts">
import { computed, h } from 'vue'
import { ElTag } from 'element-plus'
import SearchableTable from './SearchableTable.vue'
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
  searchKeyword?: string
  highlightFields?: string[]
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  searchConditions: () => [],
  searchForm: () => ({}),
  pagination: () => ({ page: 1, size: 20, total: 0 }),
  showSelection: true,
  showPagination: true,
  rowKey: 'id',
  searchKeyword: '',
  highlightFields: () => ['fileName', 'archiveId', 'description', 'storageLocation']
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

// 搜索关键词高亮处理
const highlightText = (text: string, keyword: string) => {
  if (!keyword.trim() || !text) return text

  const regex = new RegExp(`(${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
  const parts = text.split(regex)

  return parts.map((part, index) => {
    if (regex.test(part)) {
      return h('mark', {
        key: index,
        style: {
          backgroundColor: '#fef08a',
          color: '#713f12',
          padding: '1px 2px',
          borderRadius: '2px'
        }
      }, part)
    }
    return part
  })
}

// 扩展列配置以支持高亮
const enhancedColumns = computed(() => {
  return props.columns.map(column => {
    const enhancedColumn = { ...column }

    // 如果是需要高亮的字段，修改formatter
    if (props.highlightFields.includes(column.prop)) {
      const originalFormatter = column.formatter
      enhancedColumn.formatter = (row: any, column: any, cellValue: any) => {
        let text = ''

        if (originalFormatter) {
          const result = originalFormatter(row, column, cellValue)
          text = typeof result === 'string' ? result : String(result || '')
        } else {
          text = String(cellValue || '')
        }

        // 对于 Element Plus 的 formatter，返回字符串而不是 VNode
        const highlighted = highlightText(text, props.searchKeyword)
        if (Array.isArray(highlighted)) {
          return highlighted.map((part: any) => typeof part === 'string' ? part : (part.children || '')).join('')
        }
        return highlighted
      }
    }

    return enhancedColumn
  })
})

// 搜索相关性评分计算
const getRelevanceScore = (item: any, keyword: string) => {
  if (!keyword.trim()) return 0

  let score = 0
  const keywordLower = keyword.toLowerCase()

  // 档案号匹配（最高权重）
  if (item.archiveId && item.archiveId.toLowerCase().includes(keywordLower)) {
    score += 10
  }

  // 文件名匹配（高权重）
  if (item.fileName && item.fileName.toLowerCase().includes(keywordLower)) {
    score += 8
  }

  // 描述匹配（中权重）
  if (item.description && item.description.toLowerCase().includes(keywordLower)) {
    score += 5
  }

  // 存储位置匹配（低权重）
  if (item.storageLocation && item.storageLocation.toLowerCase().includes(keywordLower)) {
    score += 3
  }

  // 创建人匹配（低权重）
  if (item.createdBy && item.createdBy.toLowerCase().includes(keywordLower)) {
    score += 2
  }

  return score
}

// 为搜索结果添加相关性评分和排序
const dataWithRelevance = computed(() => {
  if (!props.searchKeyword.trim()) {
    return props.data
  }

  return props.data
    .map(item => ({
      ...item,
      _relevanceScore: getRelevanceScore(item, props.searchKeyword)
    }))
    .sort((a, b) => b._relevanceScore - a._relevanceScore)
})

// 搜索质量指示器
const getSearchQuality = (score: number) => {
  if (score >= 10) return { text: '完美匹配', type: 'success' as const }
  if (score >= 7) return { text: '高度相关', type: 'primary' as const }
  if (score >= 4) return { text: '部分匹配', type: 'warning' as const }
  return { text: '低相关度', type: 'info' as const }
}

// 处理事件并转发给SearchableTable
const handleUpdateSearchForm = (form: Record<string, any>) => {
  emit('update:search-form', form)
}

const handleUpdatePagination = (pagination: { page: number; size: number; total: number }) => {
  emit('update:pagination', pagination)
}

const handleSearch = () => {
  emit('search')
}

const handleReset = () => {
  emit('reset')
}

const handleSelectionChange = (selection: any[]) => {
  emit('selection-change', selection)
}

const handleRowClick = (row: any, column: any, event: Event) => {
  emit('row-click', row, column, event)
}

const handleSortChange = (sort: { column: any; prop: string; order: string }) => {
  emit('sort-change', sort)
}

const handleSizeChange = (size: number) => {
  emit('size-change', size)
}

const handleCurrentChange = (current: number) => {
  emit('current-change', current)
}
</script>

<template>
  <div class="search-results">
    <!-- 搜索结果统计 -->
    <div v-if="searchKeyword" class="search-stats">
      <div class="stats-content">
        <span class="total-results">
          找到 <strong>{{ dataWithRelevance.length }}</strong> 个结果
        </span>
        <span class="search-query">
          关键词：<mark>{{ searchKeyword }}</mark>
        </span>
      </div>
    </div>

    <!-- 搜索结果表格 -->
    <SearchableTable
      :data="dataWithRelevance"
      :loading="loading"
      :columns="enhancedColumns"
      :search-conditions="searchConditions"
      :search-form="searchForm"
      :pagination="pagination"
      :show-selection="showSelection"
      :show-pagination="showPagination"
      :height="height"
      :max-height="maxHeight"
      :batch-operations="batchOperations"
      :row-key="rowKey"
      @update:search-form="handleUpdateSearchForm"
      @update:pagination="handleUpdatePagination"
      @search="handleSearch"
      @reset="handleReset"
      @selection-change="handleSelectionChange"
      @row-click="handleRowClick"
      @sort-change="handleSortChange"
      @size-change="handleSizeChange"
      @current-change="handleCurrentChange"
    >
      <!-- 相关性列 -->
      <el-table-column
        v-if="searchKeyword && dataWithRelevance.some(item => item._relevanceScore > 0)"
        label="相关度"
        width="100"
        align="center"
      >
        <template #default="{ row }">
          <div class="relevance-cell">
            <div class="relevance-score">
              {{ row._relevanceScore || 0 }}
            </div>
            <el-tag
              :type="getSearchQuality(row._relevanceScore || 0).type"
              size="small"
              class="relevance-tag"
            >
              {{ getSearchQuality(row._relevanceScore || 0).text }}
            </el-tag>
          </div>
        </template>
      </el-table-column>

      <!-- 其他列插槽 -->
      <template v-for="(_, name) in $slots" #[name]="slotData">
        <slot :name="name" v-bind="slotData" />
      </template>
    </SearchableTable>
  </div>
</template>

<style scoped>
.search-results {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.search-stats {
  background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
  border: 1px solid #bae6fd;
  border-radius: 8px;
  padding: 16px 20px;
  margin-bottom: 16px;
}

.stats-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.total-results {
  font-size: 14px;
  color: #0c4a6e;
  font-weight: 500;
}

.total-results strong {
  color: #0369a1;
  font-weight: 700;
}

.search-query {
  font-size: 13px;
  color: #075985;
}

.search-query mark {
  background-color: #fbbf24;
  color: #78350f;
  padding: 2px 4px;
  border-radius: 3px;
  font-weight: 600;
}

.relevance-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.relevance-score {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary);
}

.relevance-tag {
  font-size: 10px;
  font-weight: 500;
}

/* 高亮文本样式 */
:deep(mark) {
  background-color: #fef08a;
  color: #713f12;
  padding: 1px 2px;
  border-radius: 2px;
  font-weight: 600;
}

/* 响应式适配 */
@media (max-width: 768px) {
  .search-stats {
    padding: 12px 16px;
    margin-bottom: 12px;
  }

  .stats-content {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .total-results,
  .search-query {
    font-size: 13px;
  }

  .relevance-cell {
    gap: 2px;
  }

  .relevance-score {
    font-size: 14px;
  }

  .relevance-tag {
    font-size: 9px;
  }
}

/* 暗色模式适配 */
.dark .search-stats {
  background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%);
  border-color: #3730a3;
}

.dark .total-results,
.dark .search-query {
  color: #dbeafe;
}

.dark .total-results strong {
  color: #93c5fd;
}

.dark .search-query mark {
  background-color: #f59e0b;
  color: #451a03;
}
</style>