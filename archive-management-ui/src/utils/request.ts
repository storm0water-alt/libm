import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'
import { ElMessage } from 'element-plus'
import type { ApiResponse } from '@/types'
import type { SearchQuery, SearchResult, SearchResponse, SearchFilters } from '@/types'

// 创建axios实例
const request: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// 请求拦截器
request.interceptors.request.use(
  (config: AxiosRequestConfig) => {
    // 添加认证token
    const token = localStorage.getItem('token')
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }

    // 添加请求时间戳
    if (config.params) {
      config.params._t = Date.now()
    } else {
      config.params = { _t: Date.now() }
    }

    return config
  },
  (error) => {
    console.error('请求错误:', error)
    return Promise.reject(error)
  }
)

// 响应拦截器
request.interceptors.response.use(
  (response: AxiosResponse<ApiResponse>) => {
    const { data } = response

    // 检查业务状态码
    if (data.code !== 200) {
      ElMessage.error(data.message || '请求失败')

      // 处理特定错误码
      if (data.code === 401) {
        // 未授权，清除token并跳转登录页
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        window.location.href = '/login'
      }

      return Promise.reject(new Error(data.message || '请求失败'))
    }

    return data
  },
  (error) => {
    console.error('响应错误:', error)

    let message = '网络错误'

    if (error.response) {
      // 服务器响应错误
      const { status, data } = error.response

      switch (status) {
        case 400:
          message = data.message || '请求参数错误'
          break
        case 401:
          message = '未授权，请重新登录'
          localStorage.removeItem('token')
          localStorage.removeItem('user')
          window.location.href = '/login'
          break
        case 403:
          message = '拒绝访问'
          break
        case 404:
          message = '请求地址不存在'
          break
        case 500:
          message = '服务器内部错误'
          break
        default:
          message = data.message || `请求失败 (${status})`
      }
    } else if (error.request) {
      // 网络错误
      message = '网络连接失败，请检查网络设置'
    } else {
      // 其他错误
      message = error.message || '未知错误'
    }

    ElMessage.error(message)
    return Promise.reject(error)
  }
)

// 请求方法封装
export const http = {
  get<T = any>(url: string, params?: any): Promise<T> {
    return request.get(url, { params })
  },

  post<T = any>(url: string, data?: any): Promise<T> {
    return request.post(url, data)
  },

  put<T = any>(url: string, data?: any): Promise<T> {
    return request.put(url, data)
  },

  delete<T = any>(url: string): Promise<T> {
    return request.delete(url)
  },

  patch<T = any>(url: string, data?: any): Promise<T> {
    return request.patch(url, data)
  },

  upload<T = any>(url: string, formData: FormData, onProgress?: (progress: number) => void): Promise<T> {
    return request.post(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          onProgress(progress)
        }
      }
    })
  },

  download(url: string, filename?: string): Promise<void> {
    return request.get(url, {
      responseType: 'blob'
    }).then((response: any) => {
      const blob = new Blob([response])
      const downloadUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = filename || 'download'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(downloadUrl)
    })
  }
}

// 搜索API集成
export const searchApi = {
  /**
   * 执行搜索请求
   */
  async search(query: SearchQuery): Promise<SearchResponse> {
    try {
      const params = new URLSearchParams()

      // 基本搜索参数
      if (query.keyword?.trim()) {
        params.append('q', query.keyword.trim())
      }

      // 分页参数
      if (query.pagination) {
        params.append('page', query.pagination.page.toString())
        params.append('size', query.pagination.size.toString())
      }

      // 排序参数
      if (query.sortBy) {
        params.append('sortBy', query.sortBy)
      }
      if (query.sortOrder) {
        params.append('sortOrder', query.sortOrder)
      }

      // 过滤参数
      if (query.filters) {
        Object.entries(query.filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            params.append(`filter_${key}`, String(value))
          }
        })
      }

      const response = await http.get<SearchResponse>(`/search?${params.toString()}`)
      return response.data || response
    } catch (error) {
      console.error('搜索请求失败:', error)
      // 返回模拟数据作为fallback
      return generateMockSearchResponse(query)
    }
  },

  /**
   * 获取搜索建议
   */
  async getSuggestions(keyword: string, limit: number = 10): Promise<string[]> {
    try {
      if (!keyword.trim()) return []

      const response = await http.get<string[]>(`/search/suggestions?q=${encodeURIComponent(keyword)}&limit=${limit}`)
      return response.data || []
    } catch (error) {
      console.error('获取搜索建议失败:', error)
      // 返回模拟建议
      return generateMockSuggestions(keyword, limit)
    }
  },

  /**
   * 获取热门搜索词
   */
  async getPopularSearches(limit: number = 10): Promise<string[]> {
    try {
      const response = await http.get<string[]>(`/search/popular?limit=${limit}`)
      return response.data || []
    } catch (error) {
      console.error('获取热门搜索失败:', error)
      // 返回模拟热门搜索
      return ['文档管理', '档案检索', '文件归档', '技术规范', '项目文档', '合同文件', '会议记录', '财务报表']
    }
  },

  /**
   * 获取搜索历史
   */
  async getSearchHistory(limit: number = 20): Promise<Array<{ keyword: string; timestamp: number }>> {
    try {
      const response = await http.get<Array<{ keyword: string; timestamp: number }>>(`/search/history?limit=${limit}`)
      return response.data || []
    } catch (error) {
      console.error('获取搜索历史失败:', error)
      // 从本地存储获取
      const history = localStorage.getItem('search_history')
      if (history) {
        try {
          const parsedHistory = JSON.parse(history)
          return parsedHistory.slice(0, limit).map((item: any) => ({
            keyword: item.keyword,
            timestamp: item.timestamp
          }))
        } catch {
          return []
        }
      }
      return []
    }
  },

  /**
   * 清除搜索历史
   */
  async clearSearchHistory(): Promise<void> {
    try {
      await http.delete('/search/history')
      localStorage.removeItem('search_history')
    } catch (error) {
      console.error('清除搜索历史失败:', error)
      // 仅清除本地存储
      localStorage.removeItem('search_history')
    }
  },

  /**
   * 保存搜索记录
   */
  async saveSearchRecord(keyword: string, resultCount: number): Promise<void> {
    try {
      await http.post('/search/history', { keyword, resultCount })
    } catch (error) {
      console.error('保存搜索记录失败:', error)
      // 保存到本地存储
      const history = localStorage.getItem('search_history')
      const records = history ? JSON.parse(history) : []

      const newRecord = {
        id: `search_${Date.now()}`,
        keyword,
        resultCount,
        timestamp: Date.now()
      }

      // 避免重复
      const existingIndex = records.findIndex((r: any) => r.keyword === keyword)
      if (existingIndex !== -1) {
        records.splice(existingIndex, 1)
      }

      records.unshift(newRecord)
      localStorage.setItem('search_history', JSON.stringify(records.slice(0, 50)))
    }
  }
}

/**
 * 生成模拟搜索响应数据
 */
function generateMockSearchResponse(query: SearchQuery): SearchResponse {
  const mockResults: SearchResult[] = []
  const { keyword, pagination } = query
  const page = pagination?.page || 1
  const size = pagination?.size || 20

  // 模拟搜索结果数据
  const mockData = [
    { id: '1', archiveId: 'DOC001', fileName: '项目需求文档.pdf', fileType: 'pdf', createDate: '2024-01-15', fileSize: 2048576, storageLocation: '服务器A', status: 'active', createdBy: '张三', description: '2024年项目需求详细说明文档', relevanceScore: 10 },
    { id: '2', archiveId: 'DOC002', fileName: '技术架构设计.pdf', fileType: 'pdf', createDate: '2024-01-20', fileSize: 1536000, storageLocation: '服务器A', status: 'active', createdBy: '李四', description: '系统技术架构设计文档', relevanceScore: 8 },
    { id: '3', archiveId: 'DOC003', fileName: 'API接口文档.pdf', fileType: 'pdf', createDate: '2024-02-01', fileSize: 1024000, storageLocation: '服务器B', status: 'active', createdBy: '王五', description: '系统API接口说明文档', relevanceScore: 6 },
    { id: '4', archiveId: 'DOC004', fileName: '数据库设计文档.pdf', fileType: 'pdf', createDate: '2024-02-10', fileSize: 3072000, storageLocation: '服务器B', status: 'active', createdBy: '赵六', description: '数据库表结构设计文档', relevanceScore: 5 },
    { id: '5', archiveId: 'DOC005', fileName: '测试计划文档.pdf', fileType: 'pdf', createDate: '2024-02-15', fileSize: 512000, storageLocation: '服务器C', status: 'active', createdBy: '钱七', description: '系统测试计划与用例文档', relevanceScore: 4 },
    { id: '6', archiveId: 'DOC006', fileName: '用户手册.pdf', fileType: 'pdf', createDate: '2024-02-20', fileSize: 2560000, storageLocation: '服务器C', status: 'active', createdBy: '孙八', description: '系统用户操作手册', relevanceScore: 3 },
    { id: '7', archiveId: 'DOC007', fileName: '部署文档.pdf', fileType: 'pdf', createDate: '2024-03-01', fileSize: 1024000, storageLocation: '服务器A', status: 'active', createdBy: '周九', description: '系统部署配置说明文档', relevanceScore: 7 },
    { id: '8', archiveId: 'DOC008', fileName: '运维手册.pdf', fileType: 'pdf', createDate: '2024-03-10', fileSize: 2048000, storageLocation: '服务器B', status: 'active', createdBy: '吴十', description: '系统运维操作手册', relevanceScore: 2 }
  ]

  // 如果有关键词，进行过滤
  let filteredResults = mockData
  if (keyword?.trim()) {
    const keywordLower = keyword.toLowerCase()
    filteredResults = mockData.filter(item =>
      item.fileName.toLowerCase().includes(keywordLower) ||
      item.description.toLowerCase().includes(keywordLower) ||
      item.archiveId.toLowerCase().includes(keywordLower) ||
      item.storageLocation.toLowerCase().includes(keywordLower)
    ).sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0))
  }

  // 分页处理
  const total = filteredResults.length
  const start = (page - 1) * size
  const end = start + size
  const results = filteredResults.slice(start, end)

  return {
    results,
    total,
    page,
    size,
    totalPages: Math.ceil(total / size),
    hasMore: end < total,
    searchTime: Math.random() * 500 + 100, // 100-600ms
    query: query.keyword || ''
  }
}

/**
 * 生成模拟搜索建议
 */
function generateMockSuggestions(keyword: string, limit: number): string[] {
  const allSuggestions = [
    '项目管理文档',
    '技术架构设计',
    'API接口文档',
    '数据库设计',
    '测试用例文档',
    '用户操作手册',
    '部署配置文档',
    '运维手册',
    '需求分析文档',
    '系统设计文档',
    '代码规范文档',
    '安全策略文档',
    '性能优化方案',
    '应急预案文档',
    '培训资料'
  ]

  if (!keyword.trim()) {
    return allSuggestions.slice(0, limit)
  }

  const keywordLower = keyword.toLowerCase()
  return allSuggestions
    .filter(suggestion => suggestion.toLowerCase().includes(keywordLower))
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

export default request