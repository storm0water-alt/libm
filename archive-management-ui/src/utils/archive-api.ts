/**
 * 档案API服务模块
 * 提供档案相关的API服务，包括PDF文件访问
 */

// 示例PDF文件列表
const samplePDFs = [
  'esp32-s3_datasheet_cn.pdf',
  'esp32-s3-wroom-1_wroom-1u_datasheet_cn.pdf'
]

/**
 * 根据档案号生成PDF文件URL
 * @param archiveId 档案号
 * @returns PDF文件的URL
 */
export function getPDFUrl(archiveId: string): string {
  // 使用示例PDF文件
  // 根据档案号哈希选择一个示例文件，确保一致性
  const hash = archiveId.split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0)
    return a & a
  }, 0)
  const pdfIndex = Math.abs(hash) % samplePDFs.length
  const pdfFile = samplePDFs[pdfIndex]

  return `/sample-pdfs/${pdfFile}`
}

/**
 * 验证PDF文件是否存在
 * @param archiveId 档案号
 * @returns Promise<boolean> 文件是否存在
 */
export async function validatePDFExists(archiveId: string): Promise<boolean> {
  try {
    // 直接检查示例PDF文件是否存在
    const url = getPDFUrl(archiveId)
    const response = await fetch(url, {
      method: 'HEAD'
    })

    return response.ok
  } catch (error) {
    console.error(`验证PDF文件存在性失败: ${archiveId}`, error)
    return false
  }
}

/**
 * 获取档案的完整信息，包括PDF访问信息
 * @param archiveId 档案号
 * @returns Promise<ArchivePDFInfo> 档案PDF信息
 */
export async function getArchivePDFInfo(archiveId: string): Promise<ArchivePDFInfo> {
  try {
    // 模拟API调用获取档案信息
    const pdfUrl = getPDFUrl(archiveId)
    const exists = await validatePDFExists(archiveId)

    return {
      archiveId,
      pdfUrl,
      exists,
      fileName: `${archiveId}.pdf`,
      lastModified: new Date().toISOString()
    }
  } catch (error) {
    console.error(`获取档案PDF信息失败: ${archiveId}`, error)
    throw new Error(`获取档案PDF信息失败: ${archiveId}`)
  }
}

/**
 * 批量验证多个档案的PDF文件
 * @param archiveIds 档案号数组
 * @returns Promise<ArchivePDFValidationResult[]> 验证结果数组
 */
export async function batchValidatePDFs(archiveIds: string[]): Promise<ArchivePDFValidationResult[]> {
  const results: ArchivePDFValidationResult[] = []

  // 使用Promise.all并行验证多个文件
  const promises = archiveIds.map(async (archiveId) => {
    try {
      const exists = await validatePDFExists(archiveId)
      return {
        archiveId,
        exists,
        pdfUrl: exists ? getPDFUrl(archiveId) : null
      }
    } catch (error) {
      return {
        archiveId,
        exists: false,
        pdfUrl: null,
        error: error instanceof Error ? error.message : '未知错误'
      }
    }
  })

  const validationResults = await Promise.all(promises)
  return validationResults
}

// 类型定义
export interface ArchivePDFInfo {
  archiveId: string
  pdfUrl: string
  exists: boolean
  fileName: string
  lastModified: string
}

export interface ArchivePDFValidationResult {
  archiveId: string
  exists: boolean
  pdfUrl: string | null
  error?: string
}

/**
 * 生成PDF文件下载URL
 * @param archiveId 档案号
 * @returns 下载URL
 */
export function getPDFDownloadUrl(archiveId: string): string {
  // 直接返回示例PDF文件URL用于下载
  return getPDFUrl(archiveId)
}

/**
 * 获取PDF文件的元数据信息
 * @param archiveId 档案号
 * @returns Promise<PDFMetadata> PDF元数据
 */
export async function getPDFMetadata(archiveId: string): Promise<PDFMetadata> {
  try {
    // 模拟获取PDF元数据
    return {
      archiveId,
      pageCount: Math.floor(Math.random() * 20) + 1, // 1-20页
      fileSize: Math.floor(Math.random() * 5000000) + 100000, // 100KB-5MB
      createdAt: new Date().toISOString(),
      modifiedAt: new Date().toISOString()
    }
  } catch (error) {
    console.error(`获取PDF元数据失败: ${archiveId}`, error)
    throw new Error(`获取PDF元数据失败: ${archiveId}`)
  }
}

// PDF元数据接口
export interface PDFMetadata {
  archiveId: string
  pageCount: number
  fileSize: number
  createdAt: string
  modifiedAt: string
}