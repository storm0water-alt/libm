# 档案管理系统启动器设计

## 背景

用户在 Windows 上部署档案管理系统后，重启系统时可能遇到：
- PostgreSQL 作为 Windows 服务能自动启动
- Meilisearch 和 App 不会自动启动
- 导致用户无法访问 http://127.0.0.1:3000

## 需求

开发一个轻量级 exe 程序，用户双击后：
1. 检测依赖组件是否正常运行
2. 未运行的组件自动启动
3. 打开 Chrome 浏览器访问系统

## 技术方案

**Go 控制台程序**
- 单个 exe，约 2-3MB
- macOS 开发，交叉编译 Windows exe
- 调用系统命令检测和启动服务

## 程序流程

```
用户双击 launcher.exe
        ↓
┌─────────────────────────┐
│ 1. 检测 Node.js         │ → 未安装 → 提示错误并退出
│ 2. 检测 PostgreSQL      │ → 未运行 → 启动服务
│ 3. 检测 Meilisearch     │ → 未运行 → 启动服务
│ 4. 检测 App (端口3000)  │ → 未运行 → 启动 PM2
└─────────────────────────┘
        ↓
  等待 3000 端口就绪
        ↓
  打开 Chrome 访问 http://127.0.0.1:3000
```

## 检测逻辑

| 组件 | 检测方式 |
|------|----------|
| Node.js | 执行 `node --version` |
| PostgreSQL | `net start` 查找服务或检测端口 5432 |
| Meilisearch | 检测端口 7700 |
| App | 检测端口 3000 |

## 启动逻辑

| 服务 | 启动命令 |
|------|----------|
| PostgreSQL | `net start postgresql-x64-16` |
| Meilisearch | 调用 `toolkit.ps1 start ms` |
| App | 调用 `toolkit.ps1 start app` |

## 控制台输出

```
========================================
    档案管理系统启动器 v1.0
========================================

[1/4] Node.js...        ✓ v22.22.0
[2/4] PostgreSQL...     ✓ 已运行
[3/4] Meilisesarch...   ✗ 未运行 → 启动中... ✓
[4/4] 应用服务...       ✗ 未运行 → 启动中... ✓

等待服务就绪...
服务已就绪，正在打开浏览器...

按任意键退出...
```

## 项目结构

```
documents/deployment2win/
├── launcher/
│   ├── main.go
│   ├── go.mod
│   └── go.sum
└── scripts/
    └── launcher.exe    # 编译产物
```

## 编译命令

```bash
cd documents/deployment2win/launcher
GOOS=windows GOARCH=amd64 go build -o ../scripts/launcher.exe main.go
```
