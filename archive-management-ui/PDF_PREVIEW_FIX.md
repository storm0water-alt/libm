# PDF 预览功能优化说明

## 问题
原系统中点击档案记录预览时，提示"暂无可预览的文件"，因为没有真实的 PDF 文件可供预览。

## 解决方案
1. **复制示例 PDF 文件**
   - 从 `/documents/` 目录复制了两个示例 PDF 文件到项目的 `public/sample-pdfs/` 目录
   - 文件列表：
     - `esp32-s3_datasheet_cn.pdf`
     - `esp32-s3-wroom-1_wroom-1u_datasheet_cn.pdf`

2. **修改 archive-api.ts**
   - 添加了示例 PDF 文件列表
   - 修改 `getPDFUrl` 函数，使用档案号的哈希值来选择一个示例 PDF 文件
   - 更新 `validatePDFExists` 函数，直接检查示例 PDF 文件是否存在
   - 更新 `getPDFDownloadUrl` 函数，直接返回示例 PDF 文件 URL

3. **修改 PDFPreview.vue**
   - 更新 URL 验证逻辑，支持 `/sample-pdfs/` 路径

## 技术实现

### 档案号到 PDF 文件的映射
使用档案号的哈希值来选择示例文件，确保同一个档案号总是映射到同一个 PDF 文件：

```typescript
const hash = archiveId.split('').reduce((a, b) => {
  a = ((a << 5) - a) + b.charCodeAt(0)
  return a & a
}, 0)
const pdfIndex = Math.abs(hash) % samplePDFs.length
const pdfFile = samplePDFs[pdfIndex]

return `/sample-pdfs/${pdfFile}`
```

### URL 路径支持
PDFPreview 组件现在支持以下 URL 格式：
- `/api/archives/{archiveId}/preview` - 原有的 API 格式
- `http://` 或 `https://` 开头的绝对 URL
- `/sample-pdfs/` 开头的本地文件路径

## 测试方法
1. 访问 http://localhost:5173/
2. 点击任意档案记录（fileType 为 "pdf" 的记录）
3. 系统会打开 PDF 预览弹窗，显示示例 PDF 文件

## 注意事项
1. 所有 PDF 档案现在都可以预览，会根据档案号自动选择一个示例 PDF 文件
2. 在生产环境中，需要将真实的 PDF 文件放到相应的路径，或者修改 API 返回真实的 PDF 文件路径
3. 文件名规则：PDF 文件应该按照档案号命名存储在服务器上