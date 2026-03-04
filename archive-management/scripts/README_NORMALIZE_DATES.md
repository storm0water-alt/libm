# 日期格式标准化修复

## 快速开始

### 1. 部署修复

```bash
# 构建项目
npm run build

# 启动服务
npm run start
```

### 2. 修复现有数据

运行迁移脚本来标准化数据库中现有的日期格式：

```bash
npx ts-node scripts/normalize-dates.ts
```

**预期输出：**
```
Starting date normalization...
Found XXX archives with date values
✓ Updated archive-001: "20210127" → "2021-01-27"
✓ Updated archive-002: "2021年1月27日" → "2021-01-27"
...

=== Migration Summary ===
Total archives processed: XXX
Updated: XX
Skipped (already normalized): XX
Errors: 0
Date normalization complete!
```

### 3. 验证修复

1. **测试 CSV 导入**：
   - 准备一个包含各种日期格式的 CSV 文件
   - 导入 CSV 文件
   - 检查数据库中的日期字段是否都已标准化为 YYYY-MM-DD 格式

2. **测试日期范围查询**：
   - 在档案管理页面选择日期范围
   - 验证是否能正确查询到符合条件的记录

## 支持的日期格式

CSV 导入和迁移脚本支持以下日期格式：

| 格式 | 示例 | 标准化结果 |
|------|------|-----------|
| YYYY-MM-DD | 2024-12-31 | 2024-12-31 |
| YYYYMMDD | 20210127 | 2021-01-27 |
| YYYY | 2011 | 2011-01-01 |
| YYYY年MM月DD日 | 2021年01月27日 | 2021-01-27 |
| YYYY年MM月DD | 2021年01月27 | 2021-01-27 |
| YYYY年M月D日 | 2021年1月27日 | 2021-01-27 |
| YYYY年M月D | 2021年1月27 | 2021-01-27 |
| YYYY/MM/DD | 2021/01/27 | 2021-01-27 |
| YYYY.MM.DD | 2021.01.27 | 2021-01-27 |

## 技术细节

详细的技术实现和设计决策请参阅 [BUGFIX_SUMMARY.md](../BUGFIX_SUMMARY.md)

## 测试

运行单元测试：

```bash
npm test -- __tests__/utils/date.test.ts
```

## 故障排查

### 问题：某些日期没有被标准化

**可能原因：**
- 日期格式不在支持列表中
- 日期值无效（如 2021-13-01，月份超出范围）

**解决方法：**
1. 检查迁移脚本的日志输出，查找警告信息
2. 手动修正 CSV 文件中的日期格式
3. 重新导入 CSV 或手动更新数据库记录

### 问题：日期范围查询仍然不准确

**可能原因：**
- 数据库中仍有未标准化的日期

**解决方法：**
1. 重新运行迁移脚本
2. 检查是否有新的未标准化数据被导入
3. 确保使用最新版本的 CSV 导入功能
