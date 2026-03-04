# Bug分析：Windows系统PDF预览失败

## 问题描述
- **症状**: PDF导入后正常存储，但预览时显示"文件不存在"
- **环境差异**: Windows系统失败，macOS系统正常
- **影响**: Windows用户无法预览PDF文件

## Phase 1: 根本原因调查

### 1.1 数据流分析

```
导入流程:
源文件路径 (Windows: C:\path\to\file.pdf)
  ↓
存储路径: join(PDF_STORAGE_PATH, `${archiveId}.pdf`)
  ↓
数据库记录: fileUrl = `/pdfs/${archiveId}.pdf`
  ↓
预览请求: GET /pdfs/[filename]
  ↓
文件查找: join(pdfStoragePath, safeFilename)
```

### 1.2 关键代码分析

#### 导入服务 (import.service.ts:156)
```typescript
const PDF_STORAGE_PATH = process.env.PDF_STORAGE_PATH || "./public/pdfs";
```

**问题1**: 相对路径在不同系统上的解析
- macOS: `./public/pdfs` → `/Users/.../public/pdfs` ✅
- Windows: `./public/pdfs` → `C:\...\public\pdfs` ✅ (Node.js自动处理)

#### PDF服务端点 (app/pdfs/[filename]/route.ts:18-30)
```typescript
const pdfStoragePath = process.env.PDF_STORAGE_PATH || join(process.cwd(), "public", "pdfs");
const safeFilename = filename.replace(/\.\./g, "").replace(/[\/\\]/g, "");
const filePath = join(pdfStoragePath, safeFilename);
```

**问题2**: 环境变量读取不一致
- 导入服务: `PDF_STORAGE_PATH || ARCHIVE_STORAGE_PATH || "./public/pdfs"`
- PDF端点: `PDF_STORAGE_PATH || join(cwd(), "public", "pdfs")`

**关键差异**:
- 导入服务默认值: `./public/pdfs` (相对路径)
- PDF端点默认值: `join(cwd(), "public", "pdfs")` (绝对路径)

### 1.3 假设验证

#### 假设1: 相对路径解析问题

**测试场景**:
1. 未设置 `PDF_STORAGE_PATH` 环境变量
2. 导入服务使用: `./public/pdfs`
3. PDF端点使用: `C:\project\public\pdfs`

**问题**:
- 如果工作目录不同，`./public/pdfs` 可能解析到不同位置
- 导入时写入: `C:\project\.\public\pdfs\abc.pdf`
- 预览时读取: `C:\project\public\pdfs\abc.pdf`
- 虽然理论上应该相同，但在某些情况下可能不同

#### 假设2: 路径分隔符问题

**代码检查**:
```typescript
// import.service.ts:560
const destPath = join(PDF_STORAGE_PATH, `${archiveId}.pdf`);
```

✅ 使用 `join()` 函数会自动处理路径分隔符

#### 假设3: 环境变量配置差异

**最可能的原因**:
1. Windows上设置了 `PDF_STORAGE_PATH` 环境变量
2. 环境变量值使用了反斜杠: `C:\data\pdfs`
3. 导入服务直接使用该值
4. 但是在某些情况下，路径末尾的反斜杠或空格可能导致问题

### 1.4 Windows特有问题

#### 路径末尾的反斜杠问题

**场景**:
```env
PDF_STORAGE_PATH=C:\data\pdfs\
```

导入时:
```typescript
join("C:\\data\\pdfs\\", "abc.pdf")  // → "C:\\data\\pdfs\\abc.pdf" ✅
```

但是，如果环境变量末尾有空格或特殊字符：
```env
PDF_STORAGE_PATH=C:\data\pdfs\  # 末尾有空格
```

这可能导致路径不匹配。

## Phase 2: 模式分析

### 2.1 对比macOS和Windows的差异

| 方面 | macOS | Windows |
|------|-------|---------|
| 路径分隔符 | `/` | `\` |
| 默认存储路径 | `./public/pdfs` | `./public/pdfs` |
| 工作目录 | 通常稳定 | 可能因启动方式而异 |
| 环境变量 | 通常不设置或使用正斜杠 | 可能使用反斜杠 |

### 2.2 已有的跨平台处理

#### platform.ts 中的 normalizePath
```typescript
export function normalizePath(inputPath: string): string {
  if (!inputPath) return getDefaultBrowsePath();

  if (isWindows()) {
    return inputPath.split("/").join("\\");
  }
  return inputPath.split("\\").join("/");
}
```

❌ **但是这个函数没有被用在PDF存储路径处理中！**

## Phase 3: 根本原因确定

### 主要原因

**环境变量默认值不一致**:
- 导入服务和PDF端点使用了不同的默认值逻辑
- 导入: `PDF_STORAGE_PATH || ARCHIVE_STORAGE_PATH || "./public/pdfs"`
- 端点: `PDF_STORAGE_PATH || join(cwd(), "public", "pdfs")`

**潜在问题**:
1. 如果未设置环境变量，导入用相对路径，端点用绝对路径
2. 相对路径依赖于进程的当前工作目录
3. Windows上工作目录可能因启动方式不同而变化

### 次要原因

**缺少路径标准化**:
- `PDF_STORAGE_PATH` 环境变量可能包含：
  - 末尾的反斜杠
  - 末尾空格
  - 混合的分隔符
- 导入时和访问时没有统一标准化

## Phase 4: 修复方案

### 方案1: 统一默认值逻辑（推荐）

**修改点**: 统一两个地方的默认值处理

```typescript
// 创建共享配置函数
function getPdfStoragePath(): string {
  const path = process.env.PDF_STORAGE_PATH ||
               process.env.ARCHIVE_STORAGE_PATH ||
               join(process.cwd(), "public", "pdfs");

  // 标准化路径：移除末尾的分隔符和空格
  return path.replace(/[\/\\]+$/, "").trim();
}
```

### 方案2: 添加路径标准化

**修改点**: 在使用路径前进行标准化

```typescript
import { normalizePath } from '@/lib/platform';

const PDF_STORAGE_PATH = normalizePath(
  process.env.PDF_STORAGE_PATH ||
  process.env.ARCHIVE_STORAGE_PATH ||
  join(process.cwd(), "public", "pdfs")
);
```

### 方案3: 添加调试日志

**修改点**: 在PDF端点添加详细日志

```typescript
console.log("[PDF Serve] Environment PDF_STORAGE_PATH:", process.env.PDF_STORAGE_PATH);
console.log("[PDF Serve] Resolved storage path:", pdfStoragePath);
console.log("[PDF Serve] File path:", filePath);
console.log("[PDF Serve] File exists:", existsSync(filePath));
console.log("[PDF Serve] Current working directory:", process.cwd());
```

## 验证步骤

1. **收集信息**:
   - Windows上的 `PDF_STORAGE_PATH` 环境变量值
   - 实际文件存储位置
   - PDF端点尝试访问的路径
   - 工作目录

2. **测试修复**:
   - 统一默认值逻辑
   - 添加路径标准化
   - 添加详细日志
   - 测试各种路径格式

## 结论

**根本原因**: 环境变量默认值处理不一致 + 缺少路径标准化

**影响**: Windows环境下路径解析差异导致文件查找失败

**优先级**: 高 - 影响核心功能

**建议**: 实施方案1（统一默认值）+ 方案2（路径标准化）
