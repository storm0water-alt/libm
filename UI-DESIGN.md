# UI 设计规范说明

## 🎯 核心理念

**参考 archive-management-ui 的整体结构和功能，使用 React + shadcn/ui + Tailwind CSS 实现。**

### ✅ 我们要做的

- 参考整体页面布局结构
- 保持设计系统和美学一致
- 使用统一的组件库（shadcn/ui）
- 注重功能完整性和用户体验

### ❌ 我们不做的

- 像素级还原（Vue UI → React UI）
- 完全匹配颜色值和间距
- 盲目复制设计稿的每个细节

## 📚 完整规范文档

**详细规范请查看**: [`.spec-workflow/steering/ui-design-cn.md`](.spec-workflow/steering/ui-design-cn.md)

包含：
- 设计系统和组件规范
- 页面实现指南
- 响应式设计
- 可访问性要求
- 开发检查清单

## 🛠️ 技术栈

```typescript
// 组件库
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Table } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Alert } from "@/components/ui/alert"

// 图标
import { Search, Plus, Edit, Trash, Download } from "lucide-react"
```

## 📐 布局结构

参考 archive-management-ui 的整体布局：

```
┌────────────────────────────────────────┐
│ Header (64px)                           │
├──────────┬─────────────────────────────┤
│ Sidebar  │ Main Content                │
│ (240px)  │ - 页面标题                 │
│          │ - 工具栏                    │
│ 导航菜单 │ - 表格/卡片                 │
└──────────┴─────────────────────────────┘
```

## 🎨 组件使用示例

### Button 按钮

```typescript
import { Button } from "@/components/ui/button"

<Button variant="default">确认</Button>
<Button variant="secondary">取消</Button>
<Button variant="destructive">删除</Button>
<Button variant="ghost" size="sm">关闭</Button>
```

### Input 输入框

```typescript
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

<div className="space-y-2">
  <Label htmlFor="email">邮箱</Label>
  <Input id="email" type="email" placeholder="请输入邮箱" />
</div>
```

### Card 卡片

```typescript
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

<Card>
  <CardHeader>
    <CardTitle>标题</CardTitle>
  </CardHeader>
  <CardContent>
    内容
  </CardContent>
</Card>
```

### Table 表格

```typescript
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

<Table>
  <TableHeader>
    <TableRow>
      <TableHead>列名</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell>数据</TableCell>
    </TableRow>
  </TableBody>
</Table>
```

## 📱 响应式设计

使用 Tailwind CSS 断点：

```typescript
// 移动端 → 桌面
<div className="
  grid-cols-1           // 移动端: 1列
  md:grid-cols-2       // 平板: 2列
  lg:grid-cols-3       // 桌面: 3列
  gap-4
">
```

### 移动端适配

- 侧边栏使用抽屉组件
- 表格改为卡片列表
- 表单全宽显示

## 🔄 添加 shadcn/ui 组件

```bash
# 添加组件
npx shadcn-ui@latest add button
npx shadcn-ui@latest add input
npx shadcn-ui@latest add card
npx shadcn-ui@latest add table
npx shadcn-ui@latest add badge
npx shadcn-ui@latest add alert
npx shadcnui@latest add label
npx shadcn-ui@latest add sheet

# 更多组件...
```

## 🎯 开发流程

1. **参考设计** - 查看 archive-management-ui 对应页面的整体结构
2. **选择组件** - 从 shadcn/ui 选择合适的组件
3. **实现布局** - 使用 Tailwind CSS 实现页面布局
4. **优化体验** - 添加交互、动画、状态反馈

## ✅ 检查清单

每个页面完成时验证：

- [ ] 参考了整体页面结构
- [ ] 使用了 shadcn/ui 组件
- [ ] 使用 Tailwind CSS 样式
- [ ] 功能完整可用
- [ ] 响应式正常
- [ ] Loading/Empty/Error 状态正确
- [ ] 键盘导航可用

## 📚 参考资源

- **shadcn/ui**: https://ui.shadcn.com
- **Tailwind CSS**: https://tailwindcss.com
- **Lucide Icons**: https://lucide.dev

---

**记住**: 参考设计，灵活实现，保持一致，注重质量！🎨
