# Bug真实原因分析：Windows系统PDF预览失败

## 真实场景

### 配置信息
- **环境变量**：`ARCHIVE_STORAGE_PATH=C:\ArchiveManagement\data\archives`
- **实际存储位置**：`C:\ArchiveManagement\data\archives\{archiveID}.pdf`
- **数据库fileUrl**：`/pdfs/{archiveID}.pdf` (URL路径，用于Web访问)

### 数据流
```
1. PDF导入：
   源文件 → 复制到 C:\ArchiveManagement\data\archives\{archiveID}.pdf
   数据库记录: fileUrl = "/pdfs/{archiveID}.pdf"

2. PDF预览：
   浏览器请求: GET /pdfs/{archiveID}.pdf
   API端点需要: 将 /pdfs/{archiveID}.pdf 映射到 C:\ArchiveManagement\data\archives\{archiveID}.pdf
```

## 问题所在

### PDF服务端点的环境变量读取问题

**当前代码** (`app/pdfs/[filename]/route.ts`):
```typescript
const pdfStoragePath = process.env.PDF_STORAGE_PATH || join(process.cwd(), "public", "pdfs");
```

**问题**：
- ❌ **没有检查 `ARCHIVE_STORAGE_PATH` 环境变量！**
- ❌ 只检查 `PDF_STORAGE_PATH`
- ❌ 如果 `PDF_STORAGE_PATH` 未设置，直接使用默认路径

### 导入服务vs PDF端点

**导入服务** (`import.service.ts`):
```typescript
const PDF_STORAGE_PATH = process.env.PDF_STORAGE_PATH ||
                        process.env.ARCHIVE_STORAGE_PATH ||  // ✅ 检查了这个
                        "./public/pdfs";
```

**PDF端点** (`route.ts`):
```typescript
const pdfStoragePath = process.env.PDF_STORAGE_PATH ||  // ❌ 缺少 ARCHIVE_STORAGE_PATH
                      join(process.cwd(), "public", "pdfs");
```

## 根本原因

**在Windows部署时**：
1. 用户设置了 `ARCHIVE_STORAGE_PATH=C:\ArchiveManagement\data\archives`
2. 可能没有设置 `PDF_STORAGE_PATH`
3. 导入服务读取到：`C:\ArchiveManagement\data\archives` ✅
4. PDF端点读取到：`{cwd}\public\pdfs` ❌
5. 结果：文件存储在 `C:\ArchiveManagement\data\archives`，但端点在 `{cwd}\public\pdfs` 查找

## 为什么macOS正常？

可能的原因：
1. macOS上可能设置了 `PDF_STORAGE_PATH` 环境变量
2. 或者macOS上的工作目录使得默认路径 `./public/pdfs` 恰好能找到文件
3. 或者macOS上使用了不同的部署配置

## 正确的修复

我的修复已经是正确的方向！通过创建统一的 `getPdfStoragePath()` 函数，确保：

```typescript
export function getPdfStoragePath(): string {
  const rawPath =
    process.env.PDF_STORAGE_PATH ||
    process.env.ARCHIVE_STORAGE_PATH ||  // ✅ 现在也检查这个了！
    join(process.cwd(), "public", "pdfs");

  return normalizeStoragePath(rawPath);
}
```

这样：
- 导入服务使用：`getPdfStoragePath()` → `C:\ArchiveManagement\data\archives`
- PDF端点使用：`getPdfStoragePath()` → `C:\ArchiveManagement\data\archives`
- 两者完全一致！✅

## 验证

修复后的行为：
1. **导入时**：文件保存到 `C:\ArchiveManagement\data\archives\{archiveID}.pdf`
2. **预览时**：端点在 `C:\ArchiveManagement\data\archives\{archiveID}.pdf` 查找
3. **结果**：文件存在，预览成功！✅

## 总结

我之前的分析方向是对的，但我没有意识到：
- 用户设置的是 `ARCHIVE_STORAGE_PATH` 而不是 `PDF_STORAGE_PATH`
- PDF端点没有检查 `ARCHIVE_STORAGE_PATH`
- 这是导致Windows上找不到文件的直接原因

现在的修复确保了两个地方都使用相同的环境变量优先级，问题应该已经解决了！
