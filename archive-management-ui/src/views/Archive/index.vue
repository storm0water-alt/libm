<script setup lang="ts">
import { ref, reactive, onMounted, computed, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance } from 'element-plus'
import SearchableTable from '@/components/common/SearchableTable.vue'
import PDFPreview from '@/components/business/PDFPreviewIframe.vue'
import type { Archive, SearchForm, TableColumn, BatchOperation } from '@/types'
import { mockData, formatFileSize, formatDate, getStatusText, getStatusTagType, exportToCSV } from '@/utils'
import { getPDFUrl, validatePDFExists, getPDFDownloadUrl } from '@/utils/archive-api'

const router = useRouter()
const route = useRoute()

// 响应式数据
const tableRef = ref()
const editFormRef = ref<FormInstance>()
const loading = ref(false)
const archives = ref<Archive[]>([])
const totalArchives = ref(0)
const selectedArchives = ref<Archive[]>([])

// 搜索表单
let searchForm = reactive<SearchForm>({
  archiveId: '',
  fileName: '',
  dateRange: undefined,
  minSize: undefined,
  maxSize: undefined,
  storageLocation: '',
  fileType: '',
  status: '',
  keyword: ''
})

// 分页数据
const pagination = reactive({
  page: 1,
  size: 20,
  total: 0
})

// 编辑弹窗控制
const editDialogVisible = ref(false)
const currentEditArchive = ref<Archive | null>(null)

// 编辑表单数据（处理 null 值）
const editFormData = computed(() => {
  if (!currentEditArchive.value) {
    // 返回默认值
    return {
      archiveId: '',
      fondsNumber: '',
      title: '',
      responsiblePerson: '',
      documentNumber: '',
      year: '',
      retentionPeriod: '',
      organizationIssueCode: '',
      boxNumber: '',
      itemNumber: '',
      date: '',
      pageNumber: '',
      remarks: ''
    }
  }
  return currentEditArchive.value
})

// PDF预览控制
const pdfPreviewVisible = ref(false)
const pdfPreviewUrl = ref('')
const pdfPreviewTitle = ref('')
const pdfPreviewArchiveId = ref('')

// 搜索相关状态
const isSearchMode = ref(false)
const searchKeyword = ref('')
const searchResultCount = ref(0)

// 搜索相关计算属性
const isSearchResults = computed(() => {
  return !!(route.query.searchKey || route.query.searchKey === '')
})

const displaySearchKeyword = computed(() => {
  return route.query.searchKey as string || searchKeyword.value
})

// 处理返回搜索页
const handleBackToSearch = () => {
  router.push('/search')
}

// 解析URL参数
const parseUrlParams = () => {
  const searchKey = route.query.searchKey as string
  if (searchKey !== undefined) {
    isSearchMode.value = true
    searchKeyword.value = searchKey
    // 将搜索关键词设置到搜索表单中
    searchForm.keyword = searchKey
    // 执行搜索
    handleSearch()
  } else {
    isSearchMode.value = false
    searchKeyword.value = ''
    searchForm.keyword = ''
  }
}

// 搜索条件配置
const searchConditions = [
  {
    field: 'archiveId',
    label: '档号',
    type: 'input',
    placeholder: '请输入档号'
  },
  {
    field: 'fondsNumber',
    label: '全宗号',
    type: 'input',
    placeholder: '请输入全宗号'
  },
  {
    field: 'title',
    label: '题名',
    type: 'input',
    placeholder: '请输入题名'
  },
  {
    field: 'responsiblePerson',
    label: '责任者',
    type: 'input',
    placeholder: '请输入责任者'
  },
  {
    field: 'documentNumber',
    label: '文号',
    type: 'input',
    placeholder: '请输入文号'
  },
  {
    field: 'year',
    label: '年度',
    type: 'select',
    placeholder: '请选择年度',
    options: Array.from({length: 15}, (_, i) => ({
      label: String(2010 + i),
      value: String(2010 + i)
    }))
  },
  {
    field: 'retentionPeriod',
    label: '保管期限',
    type: 'select',
    placeholder: '请选择保管期限',
    options: [
      { label: '永久', value: '永久' },
      { label: '30年', value: '30年' },
      { label: '10年', value: '10年' },
      { label: '5年', value: '5年' },
      { label: '3年', value: '3年' }
    ]
  },
  {
    field: 'organizationIssueCode',
    label: '机构问题代码',
    type: 'select',
    placeholder: '请选择机构问题代码',
    options: [
      { label: '业务管理', value: 'bgs' },
      { label: '财务部', value: 'cwb' },
      { label: '基础建设', value: 'jcs' },
      { label: '办公室', value: 'bks' },
      { label: '行政中心', value: 'xzc' }
    ]
  },
  {
    field: 'boxNumber',
    label: '盒号',
    type: 'input',
    placeholder: '请输入盒号'
  },
  {
    field: 'itemNumber',
    label: '件号',
    type: 'input',
    placeholder: '请输入件号'
  },
  {
    field: 'dateRange',
    label: '日期范围',
    type: 'daterange',
    placeholder: '选择日期范围'
  }
]

// 表格列配置
const tableColumns: TableColumn[] = [
  {
    prop: 'archiveId',
    label: '档号',
    width: 180,
    sortable: true
  },
  {
    prop: 'fondsNumber',
    label: '全宗号',
    width: 100,
    sortable: true
  },
  {
    prop: 'title',
    label: '题名',
    minWidth: 200,
    sortable: true
  },
  {
    prop: 'responsiblePerson',
    label: '责任者',
    width: 100,
    sortable: true
  },
  {
    prop: 'documentNumber',
    label: '文号',
    width: 150,
    sortable: true
  },
  {
    prop: 'date',
    label: '日期',
    width: 120,
    sortable: true,
    formatter: (row) => {
      if (row.date && row.date.length === 8) {
        return `${row.date.substring(0, 4)}-${row.date.substring(4, 6)}-${row.date.substring(6, 8)}`
      }
      return row.date || '-'
    }
  },
  {
    prop: 'year',
    label: '年度',
    width: 80,
    sortable: true
  },
  {
    prop: 'retentionPeriod',
    label: '保管期限',
    width: 100,
    sortable: true
  },
  {
    prop: 'organizationIssue',
    label: '机构问题',
    width: 120,
    sortable: true
  },
  {
    prop: 'boxNumber',
    label: '盒号',
    width: 80,
    sortable: true
  },
  {
    prop: 'itemNumber',
    label: '件号',
    width: 80,
    sortable: true
  },
  {
    prop: 'pageNumber',
    label: '页号',
    width: 80,
    sortable: true
  },
  {
    prop: 'remarks',
    label: '备注',
    width: 100,
    formatter: (row) => row.remarks || '-'
  }
]

// 批量操作配置
const batchOperations: BatchOperation[] = [
  {
    key: 'export',
    label: '批量导出',
    icon: 'Download',
    type: 'success',
    action: handleBatchExport,
    confirm: true,
    confirmMessage: '确定要导出选中的档案吗？'
  },
  {
    key: 'delete',
    label: '批量删除',
    icon: 'Delete',
    type: 'danger',
    action: handleBatchDelete,
    confirm: true,
    confirmMessage: '确定要删除选中的档案吗？此操作不可恢复！'
  }
]

// 加载档案数据
const loadArchives = async () => {
  loading.value = true
  try {
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 800))

    // 生成模拟数据
    const allArchives = mockData.generateArchives(200)

    // 应用搜索过滤
    let filteredArchives = allArchives.filter(archive => {
      // 新字段搜索
      if (searchForm.archiveId && !archive.archiveId.includes(searchForm.archiveId)) {
        return false
      }
      if (searchForm.fondsNumber && !archive.fondsNumber.includes(searchForm.fondsNumber)) {
        return false
      }
      if (searchForm.title && !archive.title.toLowerCase().includes(searchForm.title.toLowerCase())) {
        return false
      }
      if (searchForm.responsiblePerson && !archive.responsiblePerson.includes(searchForm.responsiblePerson)) {
        return false
      }
      if (searchForm.documentNumber && !archive.documentNumber.includes(searchForm.documentNumber)) {
        return false
      }
      if (searchForm.year && archive.year !== searchForm.year) {
        return false
      }
      if (searchForm.retentionPeriod && archive.retentionPeriod !== searchForm.retentionPeriod) {
        return false
      }
      if (searchForm.organizationIssueCode && archive.organizationIssueCode !== searchForm.organizationIssueCode) {
        return false
      }
      if (searchForm.boxNumber && !archive.boxNumber.includes(searchForm.boxNumber)) {
        return false
      }
      if (searchForm.itemNumber && !archive.itemNumber.includes(searchForm.itemNumber)) {
        return false
      }
      if (searchForm.remarks && !archive.remarks.includes(searchForm.remarks)) {
        return false
      }

      // 兼容旧字段搜索
      if (searchForm.fileName && !archive.fileName?.toLowerCase().includes(searchForm.fileName.toLowerCase())) {
        return false
      }
      if (searchForm.storageLocation && !archive.storageLocation?.includes(searchForm.storageLocation)) {
        return false
      }
      if (searchForm.fileType && archive.fileType !== searchForm.fileType) {
        return false
      }
      if (searchForm.status && archive.status !== searchForm.status) {
        return false
      }

      // 日期范围过滤
      if (searchForm.dateRange && searchForm.dateRange.length === 2) {
        const archiveDate = archive.date ? new Date(archive.date.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3')) : new Date(archive.createdAt)
        const startDate = new Date(searchForm.dateRange[0])
        const endDate = new Date(searchForm.dateRange[1])
        if (archiveDate < startDate || archiveDate > endDate) {
          return false
        }
      }

      // 文件大小范围过滤
      if (searchForm.minSize !== undefined && archive.fileSize && archive.fileSize < searchForm.minSize) {
        return false
      }
      if (searchForm.maxSize !== undefined && archive.fileSize && archive.fileSize > searchForm.maxSize) {
        return false
      }

      // 关键词搜索
      if (searchForm.keyword) {
        const keyword = searchForm.keyword.toLowerCase()
        const searchableText = `${archive.archiveId} ${archive.fondsNumber} ${archive.title} ${archive.responsiblePerson} ${archive.documentNumber} ${archive.organizationIssue} ${archive.remarks} ${archive.fileName} ${archive.description}`.toLowerCase()
        if (!searchableText.includes(keyword)) {
          return false
        }
      }

      return true
    })

    totalArchives.value = filteredArchives.length

    // 如果是搜索模式，记录搜索结果数量
    if (isSearchMode.value) {
      searchResultCount.value = filteredArchives.length
    }

    // 分页
    const start = (pagination.page - 1) * pagination.size
    const end = start + pagination.size
    archives.value = filteredArchives.slice(start, end)
    pagination.total = filteredArchives.length
  } catch (error) {
    console.error('加载档案数据失败:', error)
    ElMessage.error('加载档案数据失败')
  } finally {
    loading.value = false
  }
}

// 搜索表单更新处理
const handleSearchFormUpdate = (newForm: SearchForm) => {
  Object.assign(searchForm, newForm)
}

// 分页更新处理
const handlePaginationUpdate = (newPagination: any) => {
  Object.assign(pagination, newPagination)
}

// 搜索处理
const handleSearch = () => {
  pagination.page = 1
  loadArchives()
}

// 重置搜索
const handleReset = () => {
  Object.assign(searchForm, {
    archiveId: '',
    fondsNumber: '',
    title: '',
    responsiblePerson: '',
    documentNumber: '',
    year: '',
    retentionPeriod: '',
    organizationIssueCode: '',
    boxNumber: '',
    itemNumber: '',
    remarks: '',
    dateRange: null,
    minSize: null,
    maxSize: null,
    storageLocation: '',
    fileType: '',
    status: '',
    keyword: ''
  })
  handleSearch()
}

// 选择变化处理
const handleSelectionChange = (selection: Archive[]) => {
  selectedArchives.value = selection
}

// 分页大小变化
const handleSizeChange = (size: number) => {
  pagination.size = size
  pagination.page = 1
  loadArchives()
}

// 当前页变化
const handleCurrentChange = (current: number) => {
  pagination.page = current
  loadArchives()
}

// 排序变化
const handleSortChange = (sort: { column: any; prop: string; order: string }) => {
  console.log('排序变化:', sort)
  loadArchives()
}

// 新增档案
const handleAdd = () => {
  currentEditArchive.value = null
  editDialogVisible.value = true
}

// 编辑档案
const handleEdit = (archive: Archive) => {
  currentEditArchive.value = { ...archive }
  editDialogVisible.value = true
}

// 删除档案
const handleDelete = async (archive: Archive) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除档案"${archive.fileName}"吗？此操作不可恢复！`,
      '删除确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    // 模拟删除API调用
    await new Promise(resolve => setTimeout(resolve, 500))

    ElMessage.success('删除成功')
    loadArchives()
  } catch {
    // 用户取消
  }
}

// 预览档案
const handlePreview = async (archive: Archive) => {
  // 现在所有档案都可以预览PDF示例文件
  console.log(`[ArchiveIndex] handlePreview called`, {
    archiveId: archive.archiveId,
    title: archive.title,
    currentPreviewState: {
      visible: pdfPreviewVisible.value,
      url: pdfPreviewUrl.value
    }
  })

  // 显示加载状态
  const loadingMessage = ElMessage({
    message: '正在加载PDF文件...',
    type: 'info',
    duration: 0
  })

  try {
    // 生成PDF URL
    const url = getPDFUrl(archive.archiveId)
    console.log(`[ArchiveIndex] Generated PDF URL: ${url}`)

    pdfPreviewUrl.value = url
    pdfPreviewTitle.value = `${archive.archiveId}-${archive.title || '档案'}`
    pdfPreviewArchiveId.value = archive.archiveId

    // 验证文件是否存在（可选，在实际项目中可能不需要）
    // const exists = await validatePDFExists(archive.archiveId)
    // if (!exists) {
    //   loadingMessage.close()
    //   ElMessage.warning('暂无可用的PDF预览文件')
    //   return
    // }

    // 显示预览弹窗
    pdfPreviewVisible.value = true
    console.log(`[ArchiveIndex] Setting preview visible to true`, {
      url: pdfPreviewUrl.value,
      archiveId: archive.archiveId
    })

    loadingMessage.close()
  } catch (error) {
    loadingMessage.close()
    console.error('预览档案失败:', error)
    ElMessage.error('预览失败，请稍后重试')
  }
}

// 处理表格行点击事件
const handleRowClick = async (row: Archive) => {
  // 只有当档案有PDF文件时才触发预览
  if (hasPreviewablePDF(row)) {
    await handlePreview(row)
  } else {
    // 如果没有PDF文件，可以选择编辑或显示提示
    ElMessage.info('该档案暂无可预览的PDF文件')
  }
}

// 判断档案是否有可预览的PDF
const hasPreviewablePDF = (archive: Archive): boolean => {
  // 现在所有档案都有示例PDF文件可以预览
  return !!archive.archiveId
}

// 下载档案
const handleDownload = async (archive: Archive) => {
  try {
    // 现在所有档案都可以下载PDF示例文件

    // 使用archive-api中的下载URL生成函数
    const downloadUrl = getPDFDownloadUrl(archive.archiveId)

    // 创建下载链接
    const link = document.createElement('a')
    link.href = downloadUrl
    link.download = `${archive.archiveId}-${archive.title || '档案'}.pdf`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    ElMessage.success(`开始下载: ${archive.archiveId}-${archive.title || '档案'}.pdf`)
  } catch (error) {
    console.error('下载失败:', error)
    ElMessage.error('下载失败，请稍后重试')
  }
}

// 导出档案
const handleExport = async (archive: Archive) => {
  try {
    // 模拟导出API调用
    await new Promise(resolve => setTimeout(resolve, 800))

    // 导出CSV格式
    exportToCSV([archive], `archive_${archive.archiveId}.csv`, [
      '档号', '全宗号', '保管期限', '保管期限代码', '年度', '机构问题代码', '盒号', '件号', '题名', '机构问题', '责任者', '文号', '日期', '页号', '备注'
    ])

    ElMessage.success('导出成功')
  } catch (error) {
    ElMessage.error('导出失败')
  }
}

// 批量删除
async function handleBatchDelete(selectedRows: Archive[]) {
  // 模拟批量删除API调用
  await new Promise(resolve => setTimeout(resolve, 1000))
  // 这里不需要显示成功消息，因为组件已经处理了
}

// 批量导出
async function handleBatchExport(selectedRows: Archive[]) {
  // 导出CSV格式
  exportToCSV(selectedRows, `archives_batch_${Date.now()}.csv`, [
    '档号', '全宗号', '保管期限', '保管期限代码', '年度', '机构问题代码', '盒号', '件号', '题名', '机构问题', '责任者', '文号', '日期', '页号', '备注'
  ])
  // 这里不需要显示成功消息，因为组件已经处理了
}

// 保存编辑表单
const saveArchive = async (form: FormInstance | undefined) => {
  if (!form) return

  try {
    const valid = await form.validate()
    if (!valid) return

    // 模拟保存API调用
    await new Promise(resolve => setTimeout(resolve, 1000))

    ElMessage.success(currentEditArchive.value ? '更新成功' : '新增成功')
    editDialogVisible.value = false
    loadArchives()
  } catch (error) {
    console.error('保存失败:', error)
  }
}

// 编辑表单验证规则
const editFormRules = {
  archiveId: [
    { required: true, message: '请输入档号', trigger: 'blur' },
    { min: 5, max: 50, message: '档号长度在 5 到 50 个字符', trigger: 'blur' }
  ],
  fondsNumber: [
    { required: true, message: '请输入全宗号', trigger: 'blur' },
    { min: 3, max: 10, message: '全宗号长度在 3 到 10 个字符', trigger: 'blur' }
  ],
  title: [
    { required: true, message: '请输入题名', trigger: 'blur' },
    { min: 2, max: 200, message: '题名长度在 2 到 200 个字符', trigger: 'blur' }
  ],
  responsiblePerson: [
    { required: true, message: '请输入责任者', trigger: 'blur' }
  ],
  year: [
    { required: true, message: '请选择年度', trigger: 'change' }
  ],
  retentionPeriod: [
    { required: true, message: '请选择保管期限', trigger: 'change' }
  ],
  organizationIssueCode: [
    { required: true, message: '请选择机构问题代码', trigger: 'change' }
  ],
  boxNumber: [
    { required: true, message: '请输入盒号', trigger: 'blur' }
  ],
  itemNumber: [
    { required: true, message: '请输入件号', trigger: 'blur' }
  ]
}

// 监听路由变化
watch(
  () => route.query.searchKey,
  () => {
    parseUrlParams()
  },
  { immediate: true }
)

// 页面初始化
onMounted(() => {
  parseUrlParams()
  if (!isSearchMode.value) {
    loadArchives()
  }
})
</script>

<template>
  <div class="archive-management">
    <!-- 搜索结果横幅 -->
    <div v-if="isSearchResults" class="search-results-banner">
      <div class="banner-content">
        <div class="banner-info">
          <h3 class="banner-title">
            搜索结果：<span class="search-keyword">"{{ displaySearchKeyword }}"</span>
          </h3>
          <p class="banner-description">
            找到 {{ searchResultCount }} 个相关档案
          </p>
        </div>
        <div class="banner-actions">
          <el-button @click="handleBackToSearch">
            <el-icon><ArrowLeft /></el-icon>
            返回搜索页
          </el-button>
        </div>
      </div>
    </div>

    <!-- 页面标题 -->
    <div v-else class="page-header">
      <h2 class="page-title">档案管理</h2>
      <el-button type="primary" @click="handleAdd">
        <el-icon><Plus /></el-icon>
        新增档案
      </el-button>
    </div>

    <!-- 搜索和表格 -->
    <SearchableTable
      ref="tableRef"
      :data="archives"
      :loading="loading"
      :columns="tableColumns"
      :search-conditions="searchConditions"
      :search-form="searchForm"
      :pagination="pagination"
      :batch-operations="batchOperations"
      @update:search-form="handleSearchFormUpdate"
      @update:pagination="handlePaginationUpdate"
      @search="handleSearch"
      @reset="handleReset"
      @selection-change="handleSelectionChange"
      @sort-change="handleSortChange"
      @size-change="handleSizeChange"
      @current-change="handleCurrentChange"
      @row-click="handleRowClick"
    >
      <!-- 预览图标列 -->
      <el-table-column label="预览" width="60" align="center" fixed="left">
        <template #default="{ row }">
          <el-tooltip content="点击预览PDF" placement="top" v-if="hasPreviewablePDF(row)">
            <el-icon
              class="preview-icon"
              @click.stop="handlePreview(row)"
            >
              <Document />
            </el-icon>
          </el-tooltip>
          <span v-else class="no-preview">-</span>
        </template>
      </el-table-column>

      <!-- 操作列 -->
      <el-table-column label="操作" width="200" align="center" fixed="right">
        <template #default="{ row }">
          <div class="table-actions">
            <el-button
              v-if="hasPreviewablePDF(row)"
              type="primary"
              size="small"
              text
              @click="handlePreview(row)"
            >
              <el-icon><View /></el-icon>
              预览
            </el-button>
            <el-button
              type="success"
              size="small"
              text
              @click="handleEdit(row)"
            >
              <el-icon><Edit /></el-icon>
              编辑
            </el-button>
            <el-button
              type="warning"
              size="small"
              text
              @click="handleDownload(row)"
            >
              <el-icon><Download /></el-icon>
              下载
            </el-button>
            <el-dropdown trigger="click">
              <el-button type="info" size="small" text>
                <el-icon><MoreFilled /></el-icon>
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item @click="handleExport(row)">
                    <el-icon><Download /></el-icon>
                    导出
                  </el-dropdown-item>
                  <el-dropdown-item
                    divided
                    @click="handleDelete(row)"
                  >
                    <el-icon><Delete /></el-icon>
                    删除
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </template>
      </el-table-column>

      <!-- 状态列 -->
      <template #status="{ row }">
        <el-tag :type="getStatusTagType(row.status)" size="small">
          {{ getStatusText(row.status) }}
        </el-tag>
      </template>
    </SearchableTable>

    <!-- 编辑弹窗 -->
    <el-dialog
      v-model="editDialogVisible"
      :title="currentEditArchive ? '编辑档案' : '新增档案'"
      width="600px"
      @close="currentEditArchive = null"
    >
      <el-form
        ref="editFormRef"
        :model="currentEditArchive || {}"
        :rules="editFormRules"
        label-width="100px"
      >
        <el-form-item label="档号" prop="archiveId">
          <el-input
            v-model="editFormData.archiveId"
            placeholder="请输入档号"
          />
        </el-form-item>
        <el-form-item label="全宗号" prop="fondsNumber">
          <el-input
            v-model="editFormData.fondsNumber"
            placeholder="请输入全宗号"
          />
        </el-form-item>
        <el-form-item label="题名" prop="title">
          <el-input
            v-model="editFormData.title"
            placeholder="请输入题名"
          />
        </el-form-item>
        <el-form-item label="责任者" prop="responsiblePerson">
          <el-input
            v-model="editFormData.responsiblePerson"
            placeholder="请输入责任者"
          />
        </el-form-item>
        <el-form-item label="文号">
          <el-input
            v-model="editFormData.documentNumber"
            placeholder="请输入文号"
          />
        </el-form-item>
        <el-form-item label="年度" prop="year">
          <el-select v-model="editFormData.year" placeholder="请选择年度">
            <el-option
              v-for="year in Array.from({length: 15}, (_, i) => 2010 + i)"
              :key="year"
              :label="String(year)"
              :value="String(year)"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="保管期限" prop="retentionPeriod">
          <el-select v-model="editFormData.retentionPeriod" placeholder="请选择保管期限">
            <el-option label="永久" value="永久" />
            <el-option label="30年" value="30年" />
            <el-option label="10年" value="10年" />
            <el-option label="5年" value="5年" />
            <el-option label="3年" value="3年" />
          </el-select>
        </el-form-item>
        <el-form-item label="机构问题代码" prop="organizationIssueCode">
          <el-select v-model="editFormData.organizationIssueCode" placeholder="请选择机构问题代码">
            <el-option label="业务管理" value="bgs" />
            <el-option label="财务部" value="cwb" />
            <el-option label="基础建设" value="jcs" />
            <el-option label="办公室" value="bks" />
            <el-option label="行政中心" value="xzc" />
          </el-select>
        </el-form-item>
        <el-form-item label="盒号" prop="boxNumber">
          <el-input
            v-model="editFormData.boxNumber"
            placeholder="请输入盒号"
          />
        </el-form-item>
        <el-form-item label="件号" prop="itemNumber">
          <el-input
            v-model="editFormData.itemNumber"
            placeholder="请输入件号"
          />
        </el-form-item>
        <el-form-item label="日期">
          <el-date-picker
            v-model="editFormData.date"
            type="date"
            placeholder="请选择日期"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
          />
        </el-form-item>
        <el-form-item label="页号">
          <el-input
            v-model="editFormData.pageNumber"
            placeholder="请输入页号"
          />
        </el-form-item>
        <el-form-item label="备注">
          <el-input
            v-model="editFormData.remarks"
            placeholder="请输入备注"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveArchive(editFormRef)">
          确定
        </el-button>
      </template>
    </el-dialog>

    <!-- PDF预览弹窗 -->
    <PDFPreview
      v-model:visible="pdfPreviewVisible"
      :url="pdfPreviewUrl"
      :title="pdfPreviewTitle"
      :archive-id="pdfPreviewArchiveId"
    />
  </div>
</template>

<style scoped>
.archive-management {
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

.search-results-banner {
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 24px;
  border: 1px solid var(--el-border-color-light);
}

.banner-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.banner-info {
  flex: 1;
}

.banner-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 8px 0;
}

.search-keyword {
  color: var(--primary-color);
  font-weight: 700;
}

.banner-description {
  font-size: 14px;
  color: var(--text-secondary);
  margin: 0;
}

.banner-actions {
  flex-shrink: 0;
}

.table-actions {
  display: flex;
  gap: 4px;
  justify-content: center;
  flex-wrap: wrap;
}

.table-actions .el-button {
  padding: 4px 8px;
  font-size: 12px;
}

/* 预览图标样式 */
.preview-icon {
  font-size: 18px;
  color: var(--primary-color);
  cursor: pointer;
  transition: all 0.2s ease;
}

.preview-icon:hover {
  color: var(--primary-color-dark);
  transform: scale(1.1);
}

.no-preview {
  color: var(--text-disabled);
  font-size: 14px;
}

/* 表格行悬停效果 - 通过SearchableTable组件的样式设置 */
:deep(.el-table__body tr:hover > td) {
  cursor: pointer;
}

:deep(.el-table__body tr:hover > td .preview-icon) {
  color: var(--primary-color);
}

/* 响应式适配 */
@media (max-width: 768px) {
  .search-results-banner {
    padding: 20px;
    margin-bottom: 20px;
  }

  .banner-content {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }

  .banner-actions {
    width: 100%;
  }

  .banner-actions .el-button {
    width: 100%;
  }

  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }

  .table-actions {
    flex-direction: column;
    gap: 4px;
  }

  .table-actions .el-button {
    width: 100%;
    justify-content: flex-start;
  }
}

/* 紧凑模式适配 */
.compact .page-header {
  margin-bottom: 16px;
}
</style>