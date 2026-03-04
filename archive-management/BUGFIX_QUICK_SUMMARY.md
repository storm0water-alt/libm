# Windows PDF预览问题修复 - 快速总结

## 问题
- **症状**: Windows上PDF导入成功但预览失败，显示"文件不存在"
- **环境**: macOS正常，仅Windows失败

## 根本原因
PDF服务端点没有检查 `ARCHIVE_STORAGE_PATH` 环境变量！

```typescript
// 导入服务 ✅ 正确
PDF_STORAGE_PATH || ARCHIVE_STORAGE_PATH || "./public/pdfs"

// PDF端点 ❌ 错误（修复前）
PDF_STORAGE_PATH || join(cwd(), "public", "pdfs")
```

**结果**：
- 导入时：文件保存到 `C:\ArchiveManagement\data\archives\` （读取ARCHIVE_STORAGE_PATH）
- 预览时：端点在 `{cwd}\public\pdfs\` 查找（没有检查ARCHIVE_STORAGE_PATH）
- 文件不存在！❌

## 修复方案

创建统一的配置函数，确保两个地方使用相同的环境变量优先级：

```typescript
// lib/storage-config.ts
export function getPdfStoragePath(): string {
  const rawPath =
    process.env.PDF_STORAGE_PATH ||
    process.env.ARCHIVE_STORAGE_PATH ||  // ✅ 现在也检查这个了！
    join(process.cwd(), "public", "pdfs");

  return normalizeStoragePath(rawPath);
}
```

## 修复后的效果

**Windows环境**（`ARCHIVE_STORAGE_PATH=C:\ArchiveManagement\data\archives`）：
- 导入服务：`C:\ArchiveManagement\data\archives` ✅
- PDF端点：`C:\ArchiveManagement\data\archives` ✅
- 路径完全一致，预览成功！✅

## 验证步骤

### 1. 部署修复
```bash
npm run build
npm run start
```

### 2. 运行验证脚本
```bash
npx ts-node scripts/verify-windows-config.ts
```

输出应该显示：
```
PDF Storage Path: C:\ArchiveManagement\data\archives
Storage Directory Exists: ✅ Yes
```

### 3. 测试功能
1. 导入新的PDF文件
2. 在档案管理中点击预览
3. 确认PDF能正常显示

## 修改的文件

1. **新建**: `lib/storage-config.ts` - 统一的存储配置
2. **修改**: `services/import.service.ts` - 使用新配置
3. **修改**: `app/pdfs/[filename]/route.ts` - 使用新配置 + 增强日志
4. **新建**: `scripts/verify-windows-config.ts` - 验证脚本

## 环境变量配置

Windows `.env` 文件：
```env
# 两种方式都可以
ARCHIVE_STORAGE_PATH=C:\ArchiveManagement\data\archives
# 或
PDF_STORAGE_PATH=C:\ArchiveManagement\data\archives
```

修复后两个环境变量都会被正确识别！

## 关键改进

✅ 环境变量一致性 - 导入和访问使用相同的配置
✅ 路径标准化 - 自动处理末尾分隔符和空格
✅ 跨平台兼容 - Windows/macOS/Linux都正常工作
✅ 调试友好 - 详细的日志输出
✅ 易于维护 - 集中管理配置

## 如果还有问题

检查日志输出：
```
[Storage Config] PDF Storage Path:
  - Environment PDF_STORAGE_PATH: (not set)
  - Environment ARCHIVE_STORAGE_PATH: C:\ArchiveManagement\data\archives
  - Normalized path: C:\ArchiveManagement\data\archives

[PDF Serve] Storage path: C:\ArchiveManagement\data\archives
[PDF Serve] File exists: true
```

如果路径不一致或文件不存在，检查：
1. 环境变量是否正确设置
2. 存储目录是否存在
3. 应用是否有读写权限
