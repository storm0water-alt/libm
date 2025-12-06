import { useRoute, useRouter } from 'vue-router'

// 搜索相关的URL参数键名
export const SEARCH_PARAMS = {
  KEYWORD: 'searchKey',
  PAGE: 'page',
  SIZE: 'size',
  SORT: 'sortBy',
  ORDER: 'sortOrder',
  FILTERS: 'filters'
} as const

// 搜索参数类型定义
export interface SearchParams {
  searchKey?: string
  page?: number
  size?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  filters?: Record<string, any>
}

// 搜索历史项
export interface SearchHistoryItem {
  id: string
  keyword: string
  resultCount: number
  timestamp: number
  url?: string
}

/**
 * 获取当前URL的搜索参数
 */
export const getSearchQuery = (): SearchParams => {
  const route = useRoute()
  const query = route.query

  const params: SearchParams = {
    searchKey: query.searchKey as string || '',
    page: parseInt(query.page as string) || 1,
    size: parseInt(query.size as string) || 20,
    sortBy: query.sortBy as string || '',
    sortOrder: (query.sortOrder as string) as 'asc' | 'desc' || 'desc'
  }

  // 解析filters参数
  if (query.filters) {
    try {
      params.filters = JSON.parse(decodeURIComponent(query.filters as string))
    } catch {
      params.filters = {}
    }
  }

  return params
}

/**
 * 构建搜索URL参数对象
 */
export const buildSearchQuery = (params: SearchParams): Record<string, string> => {
  const query: Record<string, string> = {}

  if (params.searchKey) {
    query.searchKey = params.searchKey
  }

  if (params.page && params.page !== 1) {
    query.page = params.page.toString()
  }

  if (params.size && params.size !== 20) {
    query.size = params.size.toString()
  }

  if (params.sortBy) {
    query.sortBy = params.sortBy
  }

  if (params.sortOrder && params.sortOrder !== 'desc') {
    query.sortOrder = params.sortOrder
  }

  if (params.filters && Object.keys(params.filters).length > 0) {
    query.filters = encodeURIComponent(JSON.stringify(params.filters))
  }

  return query
}

/**
 * 导航到搜索结果页面
 */
export const navigateToSearch = (keyword: string, options?: {
  page?: number
  size?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  filters?: Record<string, any>
  replace?: boolean
}) => {
  const router = useRouter()

  const params: SearchParams = {
    searchKey: keyword,
    ...options
  }

  const query = buildSearchQuery(params)
  const routePath = '/archive'

  if (options?.replace) {
    router.replace({ path: routePath, query })
  } else {
    router.push({ path: routePath, query })
  }
}

/**
 * 更新当前搜索URL参数
 */
export const updateSearchQuery = (updates: Partial<SearchParams>) => {
  const router = useRouter()
  const route = useRoute()

  const currentQuery = getSearchQuery()
  const newQuery = { ...currentQuery, ...updates }

  const query = buildSearchQuery(newQuery)

  router.replace({ path: route.path, query })
}

/**
 * 清除搜索参数
 */
export const clearSearchQuery = () => {
  const router = useRouter()
  const route = useRoute()

  const { searchKey, filters, ...otherParams } = route.query

  if (Object.keys(otherParams).length === 0) {
    router.push('/archive')
  } else {
    router.replace({ path: route.path, query: otherParams })
  }
}

/**
 * 关键词高亮处理
 */
export const highlightKeyword = (text: string, keyword: string, options?: {
  caseSensitive?: boolean
  className?: string
  style?: Partial<CSSStyleDeclaration>
}): string => {
  if (!keyword.trim() || !text) return text

  const { caseSensitive = false, className = 'search-highlight', style = {} } = options || {}

  const flags = caseSensitive ? 'g' : 'gi'
  const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(`(${escapedKeyword})`, flags)

  const defaultStyle = {
    backgroundColor: '#fef08a',
    color: '#713f12',
    padding: '1px 2px',
    borderRadius: '2px',
    fontWeight: '600'
  }

  const combinedStyle = { ...defaultStyle, ...style }
  const styleString = Object.entries(combinedStyle)
    .map(([key, value]) => `${key.replace(/([A-Z])/g, '-$1').toLowerCase()}: ${value}`)
    .join('; ')

  return text.replace(regex, `<mark class="${className}" style="${styleString}">$1</mark>`)
}

/**
 * 提取文本摘要（用于搜索结果预览）
 */
export const extractSnippet = (
  text: string,
  keyword: string,
  maxLength: number = 200,
  contextLength: number = 50
): string => {
  if (!text || !keyword.trim()) {
    return text ? (text.length > maxLength ? text.substring(0, maxLength) + '...' : text) : ''
  }

  const keywordLower = keyword.toLowerCase()
  const textLower = text.toLowerCase()

  // 查找关键词首次出现的位置
  const firstIndex = textLower.indexOf(keywordLower)

  if (firstIndex === -1) {
    // 如果没有找到关键词，返回文本开头
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text
  }

  // 计算摘要的开始和结束位置
  const startIndex = Math.max(0, firstIndex - contextLength)
  const endIndex = Math.min(text.length, firstIndex + keyword.length + contextLength)

  let snippet = text.substring(startIndex, endIndex)

  // 添加省略号
  if (startIndex > 0) snippet = '...' + snippet
  if (endIndex < text.length) snippet = snippet + '...'

  // 如果摘要仍然太长，截断
  if (snippet.length > maxLength) {
    const truncatedSnippet = snippet.substring(0, maxLength - 3) + '...'
    return truncatedSnippet
  }

  return snippet
}

/**
 * 计算搜索相关性分数
 */
export const calculateRelevanceScore = (
  item: Record<string, any>,
  keyword: string,
  searchFields: string[] = ['name', 'title', 'description', 'content']
): number => {
  if (!keyword.trim()) return 0

  let score = 0
  const keywordLower = keyword.toLowerCase()

  searchFields.forEach((field, index) => {
    const fieldValue = item[field]
    if (fieldValue && typeof fieldValue === 'string') {
      const fieldLower = fieldValue.toLowerCase()

      // 完全匹配（最高分）
      if (fieldLower === keywordLower) {
        score += (searchFields.length - index) * 10
      }
      // 开头匹配（高分）
      else if (fieldLower.startsWith(keywordLower)) {
        score += (searchFields.length - index) * 8
      }
      // 包含匹配（中等分）
      else if (fieldLower.includes(keywordLower)) {
        score += (searchFields.length - index) * 5
      }

      // 多次出现加分
      const occurrences = (fieldLower.match(new RegExp(keywordLower, 'g')) || []).length
      score += Math.min(occurrences - 1, 3) * 2
    }
  })

  return score
}

/**
 * 搜索历史管理
 */
export class SearchHistoryManager {
  private static readonly STORAGE_KEY = 'search_history'
  private static readonly MAX_HISTORY = 20

  /**
   * 添加搜索记录
   */
  static addHistory(keyword: string, resultCount: number = 0): void {
    if (!keyword.trim()) return

    const history = this.getHistory()
    const timestamp = Date.now()

    // 查找是否已存在相同关键词
    const existingIndex = history.findIndex(item => item.keyword === keyword)

    if (existingIndex !== -1) {
      // 更新现有记录
      history[existingIndex].timestamp = timestamp
      history[existingIndex].resultCount = resultCount
      // 移到最前面
      const existingItem = history.splice(existingIndex, 1)[0]
      history.unshift(existingItem)
    } else {
      // 添加新记录
      const newItem: SearchHistoryItem = {
        id: `search_${timestamp}`,
        keyword,
        resultCount,
        timestamp,
        url: this.buildSearchUrl(keyword)
      }
      history.unshift(newItem)
    }

    // 限制历史记录数量
    if (history.length > this.MAX_HISTORY) {
      history.splice(this.MAX_HISTORY)
    }

    this.saveHistory(history)
  }

  /**
   * 获取搜索历史
   */
  static getHistory(): SearchHistoryItem[] {
    try {
      const historyJson = localStorage.getItem(this.STORAGE_KEY)
      return historyJson ? JSON.parse(historyJson) : []
    } catch {
      return []
    }
  }

  /**
   * 清除搜索历史
   */
  static clearHistory(): void {
    localStorage.removeItem(this.STORAGE_KEY)
  }

  /**
   * 删除单个搜索记录
   */
  static removeHistory(id: string): void {
    const history = this.getHistory()
    const filteredHistory = history.filter(item => item.id !== id)
    this.saveHistory(filteredHistory)
  }

  /**
   * 获取热门搜索关键词
   */
  static getPopularSearches(limit: number = 10): SearchHistoryItem[] {
    const history = this.getHistory()

    // 按搜索次数和结果数量排序
    return history
      .sort((a, b) => {
        // 优先按结果数量排序，然后按时间排序
        if (b.resultCount !== a.resultCount) {
          return b.resultCount - a.resultCount
        }
        return b.timestamp - a.timestamp
      })
      .slice(0, limit)
  }

  /**
   * 获取最近搜索
   */
  static getRecentSearches(limit: number = 5): SearchHistoryItem[] {
    const history = this.getHistory()
    return history.slice(0, limit)
  }

  private static saveHistory(history: SearchHistoryItem[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(history))
    } catch {
      // 忽略存储错误
    }
  }

  private static buildSearchUrl(keyword: string): string {
    return `/archive?searchKey=${encodeURIComponent(keyword)}`
  }
}

/**
 * 格式化搜索结果数量
 */
export const formatResultCount = (count: number): string => {
  if (count === 0) return '无结果'
  if (count === 1) return '1 个结果'
  if (count < 100) return `${count} 个结果`
  if (count < 1000) return `${count} 个结果`
  return `${Math.floor(count / 1000)}k+ 个结果`
}

/**
 * 生成搜索建议
 */
export const generateSearchSuggestions = (
  keyword: string,
  possibleSuggestions: string[],
  limit: number = 5
): string[] => {
  if (!keyword.trim()) return possibleSuggestions.slice(0, limit)

  const keywordLower = keyword.toLowerCase()

  return possibleSuggestions
    .filter(suggestion =>
      suggestion.toLowerCase().includes(keywordLower)
    )
    .sort((a, b) => {
      // 优先显示开头匹配的
      const aStarts = a.toLowerCase().startsWith(keywordLower)
      const bStarts = b.toLowerCase().startsWith(keywordLower)

      if (aStarts && !bStarts) return -1
      if (!aStarts && bStarts) return 1

      // 然后按长度排序
      return a.length - b.length
    })
    .slice(0, limit)
}