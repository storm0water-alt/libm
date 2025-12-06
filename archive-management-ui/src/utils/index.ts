import type { Archive, OperationLog, ImportRecord } from '@/types'

// 格式化文件大小
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'

  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// 格式化日期
export function formatDate(date: string | Date, format: string = 'YYYY-MM-DD HH:mm:ss'): string {
  const d = new Date(date)

  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  const seconds = String(d.getSeconds()).padStart(2, '0')

  return format
    .replace('YYYY', String(year))
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds)
}

// 相对时间格式化
export function formatRelativeTime(date: string | Date): string {
  const now = new Date()
  const target = new Date(date)
  const diff = now.getTime() - target.getTime()

  const minute = 60 * 1000
  const hour = 60 * minute
  const day = 24 * hour
  const month = 30 * day
  const year = 365 * day

  if (diff < minute) {
    return '刚刚'
  } else if (diff < hour) {
    return `${Math.floor(diff / minute)}分钟前`
  } else if (diff < day) {
    return `${Math.floor(diff / hour)}小时前`
  } else if (diff < month) {
    return `${Math.floor(diff / day)}天前`
  } else if (diff < year) {
    return `${Math.floor(diff / month)}个月前`
  } else {
    return `${Math.floor(diff / year)}年前`
  }
}

// 生成随机ID
export function generateId(prefix?: string): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substr(2)
  return prefix ? `${prefix}_${timestamp}_${random}` : `${timestamp}_${random}`
}

// 深拷贝
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj
  if (obj instanceof Date) return new Date(obj.getTime()) as T
  if (obj instanceof Array) return obj.map(item => deepClone(item)) as T
  if (typeof obj === 'object') {
    const cloned = {} as T
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        cloned[key] = deepClone(obj[key])
      }
    }
    return cloned
  }
  return obj
}

// 防抖函数
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  immediate?: boolean
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null

  return function(this: any, ...args: Parameters<T>) {
    const context = this
    const later = () => {
      timeout = null
      if (!immediate) func.apply(context, args)
    }

    const callNow = immediate && !timeout

    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(later, wait)

    if (callNow) func.apply(context, args)
  }
}

// 节流函数
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null
  let previous = 0

  return function(this: any, ...args: Parameters<T>) {
    const context = this
    const now = Date.now()

    if (!previous) previous = now

    const remaining = wait - (now - previous)

    if (remaining <= 0 || remaining > wait) {
      if (timeout) {
        clearTimeout(timeout)
        timeout = null
      }
      previous = now
      func.apply(context, args)
    } else if (!timeout) {
      timeout = setTimeout(() => {
        previous = Date.now()
        timeout = null
        func.apply(context, args)
      }, remaining)
    }
  }
}

// 下载文件
export function downloadFile(url: string, filename?: string): void {
  const link = document.createElement('a')
  link.href = url
  link.download = filename || 'download'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

// 复制到剪贴板
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text)
      return true
    } else {
      // 兼容性处理
      const textArea = document.createElement('textarea')
      textArea.value = text
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      return true
    }
  } catch (error) {
    console.error('复制失败:', error)
    return false
  }
}

// 获取文件扩展名
export function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.')
  return lastDot > 0 ? filename.substring(lastDot + 1).toLowerCase() : ''
}

// 验证文件类型
export function validateFileType(filename: string, allowedTypes: string[]): boolean {
  const extension = getFileExtension(filename)
  return allowedTypes.includes(extension)
}

// 生成搜索高亮文本
export function highlightText(text: string, keyword: string): string {
  if (!keyword) return text

  const reg = new RegExp(keyword, 'gi')
  return text.replace(reg, (match) => `<mark class="highlight">${match}</mark>`)
}

// 表格数据导出为CSV
export function exportToCSV<T>(data: T[], filename: string, headers?: string[]): void {
  if (!data.length) return

  const csvContent = []

  // 添加表头
  if (headers) {
    csvContent.push(headers.join(','))
  } else {
    csvContent.push(Object.keys(data[0] as any).join(','))
  }

  // 添加数据行
  data.forEach(row => {
    const values = Object.values(row as any).map(value => {
      // 处理包含逗号和引号的值
      const strValue = String(value || '')
      if (strValue.includes(',') || strValue.includes('"') || strValue.includes('\n')) {
        return `"${strValue.replace(/"/g, '""')}"`
      }
      return strValue
    })
    csvContent.push(values.join(','))
  })

  // 创建Blob并下载
  const blob = new Blob(['\ufeff' + csvContent.join('\n')], {
    type: 'text/csv;charset=utf-8;'
  })
  const url = URL.createObjectURL(blob)
  downloadFile(url, filename)
  URL.revokeObjectURL(url)
}

// 获取操作类型中文显示
export function getOperationTypeText(type: string): string {
  const typeMap: Record<string, string> = {
    create: '新增',
    update: '修改',
    delete: '删除',
    download: '下载',
    import: '入库',
    export: '导出'
  }
  return typeMap[type] || type
}

// 获取状态中文显示
export function getStatusText(status: string): string {
  const statusMap: Record<string, string> = {
    active: '正常',
    archived: '已归档',
    deleted: '已删除',
    pending: '等待中',
    processing: '进行中',
    completed: '已完成',
    failed: '失败'
  }
  return statusMap[status] || status
}

// 获取状态对应的Element Plus标签类型
export function getStatusTagType(status: string): 'success' | 'warning' | 'danger' | 'info' {
  const typeMap: Record<string, 'success' | 'warning' | 'danger' | 'info'> = {
    active: 'success',
    archived: 'warning',
    deleted: 'danger',
    pending: 'info',
    processing: 'warning',
    completed: 'success',
    failed: 'danger'
  }
  return typeMap[status] || 'info'
}

// 本地存储工具
export const storage = {
  set(key: string, value: any): void {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch (error) {
      console.error('存储失败:', error)
    }
  },

  get<T>(key: string, defaultValue?: T): T | null {
    try {
      const item = localStorage.getItem(key)
      return item ? JSON.parse(item) : defaultValue || null
    } catch (error) {
      console.error('读取失败:', error)
      return defaultValue || null
    }
  },

  remove(key: string): void {
    try {
      localStorage.removeItem(key)
    } catch (error) {
      console.error('删除失败:', error)
    }
  },

  clear(): void {
    try {
      localStorage.clear()
    } catch (error) {
      console.error('清空失败:', error)
    }
  }
}

// 模拟数据生成器
export const mockData = {
  // 生成模拟档案数据
  generateArchives(count: number = 50): Archive[] {
    const archives: Archive[] = []
    const fileTypes = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx']
    const locations = ['服务器A', '服务器B', '备份服务器', '云存储', '本地存储']
    const statuses: Archive['status'][] = ['active', 'archived', 'deleted']
    const retentionPeriods = ['永久', '30年', '10年', '5年', '3年']
    const retentionPeriodCodes = ['Y', 'D30', 'D10', 'D5', 'D3']
    const organizationCodes = ['bgs', 'cwb', 'jcs', 'bks', 'xzc']
    const organizationNames = ['业务管理', '财务部', '基础建设', '办公室', '行政中心']
    const responsiblePersons = ['张三', '李四', '王五', '赵六', '陈七', '刘八', '周九', '吴十']

    for (let i = 1; i <= count; i++) {
      const fileType = fileTypes[Math.floor(Math.random() * fileTypes.length)]
      const year = 2010 + Math.floor(Math.random() * 14) // 2010-2023年
      const retentionIndex = Math.floor(Math.random() * retentionPeriods.length)
      const orgIndex = Math.floor(Math.random() * organizationCodes.length)

      archives.push({
        id: `archive_${i}`,
        // 新的档案核心字段
        archiveId: `${String(Math.floor(Math.random() * 100000)).padStart(5, '0')}-${year}-${organizationCodes[orgIndex]}-${String(Math.floor(Math.random() * 9999) + 1).padStart(4, '0')}-${String(i).padStart(5, '0')}`,
        fondsNumber: String(Math.floor(Math.random() * 100000)).padStart(5, '0'),
        retentionPeriod: retentionPeriods[retentionIndex],
        retentionPeriodCode: retentionPeriodCodes[retentionIndex],
        year: String(year),
        organizationIssueCode: organizationCodes[orgIndex],
        boxNumber: String(Math.floor(Math.random() * 9999) + 1).padStart(4, '0'),
        itemNumber: String(Math.floor(Math.random() * 99999) + 1).padStart(5, '0'),
        title: `${organizationNames[orgIndex]}相关档案文件_${i}`,
        organizationIssue: organizationNames[orgIndex],
        responsiblePerson: responsiblePersons[Math.floor(Math.random() * responsiblePersons.length)],
        documentNumber: `${['津自博字', '津财字', '津基字'][Math.floor(Math.random() * 3)]}[${year}]${String(Math.floor(Math.random() * 999) + 1).padStart(3, '0')}号`,
        date: `${year}${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}`,
        pageNumber: String(Math.floor(Math.random() * 500) + 1),
        remarks: Math.random() > 0.5 ? '无' : `备注信息${i}`,
        // 保持原有系统字段
        fileName: `档案文件_${i}.${fileType}`,
        fileSize: Math.floor(Math.random() * 10000000) + 1000,
        storageLocation: locations[Math.floor(Math.random() * locations.length)],
        fileType,
        status: statuses[Math.floor(Math.random() * statuses.length)],
        description: `这是第${i}个档案文件的描述信息`,
        tags: [`标签${Math.floor(Math.random() * 5) + 1}`],
        createdBy: `user${Math.floor(Math.random() * 10) + 1}`,
        createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString()
      })
    }

    return archives
  },

  // 生成模拟操作日志
  generateLogs(count: number = 100): OperationLog[] {
    const logs: OperationLog[] = []
    const operations: OperationLog['operationType'][] = ['create', 'update', 'delete', 'download', 'import', 'export']
    const operators = ['张三', '李四', '王五', '赵六', '陈七', '刘八']

    for (let i = 1; i <= count; i++) {
      const operation = operations[Math.floor(Math.random() * operations.length)]
      logs.push({
        id: `log_${i}`,
        operator: `user${Math.floor(Math.random() * 10) + 1}`,
        operatorName: operators[Math.floor(Math.random() * operators.length)],
        operationType: operation,
        targetId: `ARCH${String(Math.floor(Math.random() * 1000) + 1).padStart(6, '0')}`,
        targetName: `档案文件_${Math.floor(Math.random() * 100) + 1}`,
        description: `执行了${getOperationTypeText(operation)}操作`,
        ip: `192.168.1.${Math.floor(Math.random() * 255) + 1}`,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString()
      })
    }

    return logs
  }
}