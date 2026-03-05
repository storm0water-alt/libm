# Windows 服务自动启动设计

## 背景

当前问题：Windows 重启后，Meilisearch 和 App 不会自动启动，只有 PostgreSQL 自动启动。

## 目标

将所有应用注册为 Windows 自动启动的服务，并处理组件间的启动依赖关系。

## 当前状态

| 组件 | 当前启动方式 | 重启后行为 |
|------|-------------|-----------|
| PostgreSQL | Windows 服务 (pg_ctl register) | 自动启动 |
| Meilisearch | Windows 服务 (`start= demand`) | 不自动启动 |
| App | PM2 管理 | 不自动启动 |

## 设计方案

### 架构

```
系统启动
    ↓
PostgreSQL (Automatic) ─── 已就绪
    ↓
Meilisearch (Automatic, 依赖 PostgreSQL)
    ↓
ArchiveApp (Automatic, 依赖 Meilisearch)
```

### 组件方案

#### 1. Meilisearch

**方案：** 将服务启动类型从 `demand` 改为 `auto`，并配置依赖关系。

**修改点：** `install.ps1`

```powershell
# 创建服务时使用 auto 启动类型
sc.exe create Meilisearch binPath= $binPath start= auto DisplayName= "Meilisearch Search Engine"

# 配置依赖 PostgreSQL
sc.exe config Meilisearch depend= PostgreSQL
```

#### 2. App (ArchiveApp)

**方案：** 使用 winsw 将 PM2 启动命令包装为 Windows 服务。

**为什么选择 winsw：**
- 系统级启动，无需用户登录
- 支持配置服务依赖
- 支持失败自动恢复
- 单文件，无额外安装

**服务配置：** `services/archive-app.xml`

```xml
<service>
  <id>ArchiveApp</id>
  <name>Archive Management Application</name>
  <description>档案管理系统 Web 应用</description>
  <executable>%APPDATA%\npm\pm2.cmd</executable>
  <arguments>start %ARCHIVE_HOME%\app\ecosystem.config.js</arguments>
  <workingdirectory>%ARCHIVE_HOME%\app</workingdirectory>
  <logpath>%ARCHIVE_HOME%\logs</logpath>
  <depend>Meilisearch</depend>
  <startmode>Automatic</startmode>
  <onfailure action="restart" delay="10 sec"/>
  <onfailure action="restart" delay="20 sec"/>
  <onfailure action="none"/>
  <resetfailure>1 hour</resetfailure>
</service>
```

## 文件变更清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `scripts/install.ps1` | 修改 | Meilisearch auto + winsw 安装 |
| `scripts/toolkit.ps1` | 修改 | 支持 ArchiveApp 服务管理 |
| `services/winsw.exe` | 新增 | Windows 服务包装器 (~500KB) |
| `services/archive-app.xml` | 新增 | ArchiveApp 服务配置 |
| `documents/deployment2win/README.md` | 修改 | 更新文档 |

## 安装流程变更

### install.ps1 变更

**Step 7 (Meilisearch):**
- 服务创建时使用 `start= auto`
- 添加依赖配置 `depend= PostgreSQL`

**新增 Step 8.5 (ArchiveApp 服务):**
1. 复制 winsw.exe 到 `services/`
2. 生成 archive-app.xml（替换路径变量）
3. 执行 `winsw.exe install` 创建服务

### toolkit.ps1 变更

- `start` 命令：启动 ArchiveApp 服务
- `stop` 命令：停止 ArchiveApp 服务
- `status` 命令：显示 ArchiveApp 服务状态

## 依赖关系

| 服务 | 依赖 | 启动顺序 |
|------|------|----------|
| PostgreSQL | 无 | 1 |
| Meilisearch | PostgreSQL | 2 |
| ArchiveApp | Meilisearch | 3 |

## 恢复策略

| 服务 | 失败处理 |
|------|----------|
| Meilisearch | Windows 默认（需手动重启） |
| ArchiveApp | 第1次：10秒后重启；第2次：20秒后重启；第3次：不处理 |

## 验证方法

```powershell
# 查看服务状态
Get-Service PostgreSQL, Meilisearch, ArchiveApp

# 查看服务依赖
sc.exe qc Meilisearch
sc.exe qc ArchiveApp

# 查看启动类型
Get-WmiObject Win32_Service | Where-Object {$_.Name -in @("PostgreSQL", "Meilisearch", "ArchiveApp")} | Select-Object Name, StartMode
```

## 风险与缓解

| 风险 | 缓解措施 |
|------|----------|
| winsw.exe 未包含在部署包 | 在 install.ps1 中检测并提示 |
| 服务启动超时 | 配置合理的恢复策略 |
| 依赖服务未就绪 | Windows 服务管理器自动处理依赖 |

## 回滚方案

如需回滚：

```powershell
# 删除 ArchiveApp 服务
sc.exe delete ArchiveApp

# 将 Meilisearch 改为手动启动
sc.exe config Meilisearch start= demand
```
