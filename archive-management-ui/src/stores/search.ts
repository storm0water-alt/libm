import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { storage } from '@/utils'
import type { SearchQuery, SearchResult, SearchResponse, SearchState, SearchHistory } from '@/types'

export const useSearchStore = defineStore('search', () => {
  // 状态
  const query = ref<SearchQuery>({
    keyword: '',
    pagination: {
      page: 1,
      size: 20
    }
  })

  const results = ref<SearchResult[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const searchTime = ref(0)
  const totalResults = ref(0)
  const currentPage = ref(1)
  const pageSize = ref(20)
  const searchHistory = ref<SearchHistory[]>([])

  // 计算属性
  const hasResults = computed(() => results.value.length > 0)
  const hasQuery = computed(() => !!query.value.keyword.trim())
  const totalPages = computed(() => Math.ceil(totalResults.value / pageSize.value))
  const hasNextPage = computed(() => currentPage.value < totalPages.value)
  const hasPreviousPage = computed(() => currentPage.value > 1)
  const isEmptyResults = computed(() => hasQuery.value && !hasResults.value && !loading.value)
  const recentSearches = computed(() =>
    searchHistory.value
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 10)
  )

  // 初始化
  function initSearch() {
    const savedHistory = storage.get<SearchHistory[]>('searchHistory')
    if (savedHistory) {
      searchHistory.value = savedHistory
    }
  }

  // 执行搜索
  async function executeSearch(searchKeyword?: string): Promise<boolean> {
    const keyword = searchKeyword || query.value.keyword

    if (!keyword.trim()) {
      ElMessage.warning('请输入搜索关键词')
      return false
    }

    loading.value = true
    error.value = null
    const startTime = Date.now()

    try {
      // 更新查询关键词
      query.value.keyword = keyword.trim()

      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 800))

      // 生成模拟搜索结果
      const mockResults = generateMockSearchResults(keyword.trim())

      // 更新状态
      results.value = mockResults.results
      totalResults.value = mockResults.total
      searchTime.value = Date.now() - startTime
      currentPage.value = 1

      // 添加到搜索历史
      addToSearchHistory(keyword.trim(), mockResults.total)

      return true
    } catch (err) {
      console.error('搜索失败:', err)
      error.value = '搜索失败，请重试'
      ElMessage.error('搜索失败，请重试')
      return false
    } finally {
      loading.value = false
    }
  }

  // 生成模拟搜索结果
  function generateMockSearchResults(keyword: string): SearchResponse {
    // 模拟档案数据
    const mockArchives = [
      {
        id: '1',
        archiveId: 'ARCH001',
        fileName: `${keyword}相关档案.pdf`,
        content: `这是一个包含${keyword}的档案文件`,
        highlight: `这是一个包含<mark>${keyword}</mark>的档案文件`,
        relevanceScore: 0.95,
        fileType: 'pdf',
        createDate: '2024-01-15T10:30:00',
        fileSize: 1024000,
        storageLocation: '/storage/archives/2024/01',
        description: `包含${keyword}内容的重要档案`,
        tags: ['重要', `${keyword}`, '文档']
      },
      {
        id: '2',
        archiveId: 'ARCH002',
        fileName: `${keyword}管理文档.docx`,
        content: `关于${keyword}的管理说明文档`,
        highlight: `关于<mark>${keyword}</mark>的管理说明文档`,
        relevanceScore: 0.88,
        fileType: 'docx',
        createDate: '2024-02-20T14:15:00',
        fileSize: 512000,
        storageLocation: '/storage/archives/2024/02',
        description: `${keyword}相关的管理文档`,
        tags: ['管理', `${keyword}`, '说明']
      },
      {
        id: '3',
        archiveId: 'ARCH003',
        fileName: `${keyword}技术规范.pdf`,
        content: `${keyword}技术实施规范`,
        highlight: `<mark>${keyword}</mark>技术实施规范`,
        relevanceScore: 0.82,
        fileType: 'pdf',
        createDate: '2024-03-10T09:45:00',
        fileSize: 2048000,
        storageLocation: '/storage/archives/2024/03',
        description: `详细的技术${keyword}规范`,
        tags: ['技术', `${keyword}`, '规范']
      }
    ]

    // 随机决定结果数量（0-3个）
    const resultCount = Math.min(Math.floor(Math.random() * 4), mockArchives.length)

    return {
      results: mockArchives.slice(0, resultCount),
      total: resultCount,
      pagination: {
        currentPage: 1,
        pageSize: pageSize.value,
        totalItems: resultCount,
        totalPages: Math.ceil(resultCount / pageSize.value),
        hasNext: false,
        hasPrevious: false
      },
      searchTime: 0,
      suggestions: keyword.length > 2 ? [`${keyword}管理`, `${keyword}技术`, `${keyword}规范`] : []
    }
  }

  // 添加到搜索历史
  function addToSearchHistory(keyword: string, resultCount: number): void {
    const historyItem: SearchHistory = {
      id: Date.now().toString(),
      keyword,
      timestamp: new Date().toISOString(),
      resultCount
    }

    // 检查是否已存在相同关键词
    const existingIndex = searchHistory.value.findIndex(item => item.keyword === keyword)
    if (existingIndex !== -1) {
      // 更新现有记录
      searchHistory.value[existingIndex] = historyItem
    } else {
      // 添加新记录
      searchHistory.value.push(historyItem)
    }

    // 限制历史记录数量
    if (searchHistory.value.length > 50) {
      searchHistory.value = searchHistory.value.slice(-50)
    }

    // 保存到本地存储
    storage.set('searchHistory', searchHistory.value)
  }

  // 清空搜索结果
  function clearResults(): void {
    results.value = []
    totalResults.value = 0
    error.value = null
    currentPage.value = 1
  }

  // 清空搜索
  function clearSearch(): void {
    query.value.keyword = ''
    clearResults()
  }

  // 设置搜索词
  function setKeyword(keyword: string): void {
    query.value.keyword = keyword.trim()
  }

  // 设置页码
  function setPage(page: number): void {
    currentPage.value = page
    if (query.value.pagination) {
      query.value.pagination.page = page
    }
  }

  // 设置页面大小
  function setPageSize(size: number): void {
    pageSize.value = size
    if (query.value.pagination) {
      query.value.pagination.size = size
    }
  }

  // 设置过滤器
  function setFilters(filters: any): void {
    query.value.filters = { ...query.value.filters, ...filters }
  }

  // 设置排序
  function setSort(sortBy: string, sortOrder: 'asc' | 'desc' = 'desc'): void {
    query.value.sortBy = sortBy
    query.value.sortOrder = sortOrder
  }

  // 加载更多结果（分页）
  async function loadMoreResults(): Promise<boolean> {
    if (loading.value || !hasNextPage.value) {
      return false
    }

    const nextPage = currentPage.value + 1
    loading.value = true

    try {
      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 500))

      // 生成更多模拟结果
      const mockResults = generateMockSearchResults(query.value.keyword)
      const moreResults = mockResults.results.slice(0, 5) // 每次加载5条

      // 更新状态
      results.value = [...results.value, ...moreResults]
      setPage(nextPage)

      return true
    } catch (err) {
      console.error('加载更多结果失败:', err)
      ElMessage.error('加载更多结果失败')
      return false
    } finally {
      loading.value = false
    }
  }

  // 删除搜索历史记录
  function removeSearchHistory(id: string): void {
    const index = searchHistory.value.findIndex(item => item.id === id)
    if (index !== -1) {
      searchHistory.value.splice(index, 1)
      storage.set('searchHistory', searchHistory.value)
    }
  }

  // 清空搜索历史
  function clearSearchHistory(): void {
    searchHistory.value = []
    storage.remove('searchHistory')
  }

  // 从搜索历史执行搜索
  async function searchFromHistory(historyItem: SearchHistory): Promise<boolean> {
    setKeyword(historyItem.keyword)
    return await executeSearch()
  }

  // 获取搜索建议
  function getSearchSuggestions(input: string): string[] {
    if (!input || input.length < 2) {
      return []
    }

    const suggestions = recentSearches.value
      .filter(item => item.keyword.toLowerCase().includes(input.toLowerCase()))
      .map(item => item.keyword)

    // 去重
    return [...new Set(suggestions)].slice(0, 5)
  }

  return {
    // 状态
    query,
    results,
    loading,
    error,
    searchTime,
    totalResults,
    currentPage,
    pageSize,
    searchHistory,

    // 计算属性
    hasResults,
    hasQuery,
    totalPages,
    hasNextPage,
    hasPreviousPage,
    isEmptyResults,
    recentSearches,

    // 方法
    initSearch,
    executeSearch,
    clearResults,
    clearSearch,
    setKeyword,
    setPage,
    setPageSize,
    setFilters,
    setSort,
    loadMoreResults,
    removeSearchHistory,
    clearSearchHistory,
    searchFromHistory,
    getSearchSuggestions
  }
})