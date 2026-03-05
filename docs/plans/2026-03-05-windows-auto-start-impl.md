# Windows 服务自动启动实现计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 将 Meilisearch 和 App 注册为 Windows 自动启动服务，处理组件间的启动依赖关系。

**Architecture:** Meilisearch 改为 auto 启动类型并依赖 PostgreSQL；App 使用 winsw 包装为 Windows 服务并依赖 Meilisearch。

**Tech Stack:** PowerShell, sc.exe, winsw, Windows Services

---

## Task 1: 修改 Meilisearch 服务创建逻辑

**Files:**
- Modify: `documents/deployment2win/scripts/install.ps1:686`

**Step 1: 修改服务创建命令**

找到第 686 行，将 `start= demand` 改为 `start= auto`：

```powershell
# 修改前
sc.exe create Meilisearch binPath= $binPath start= demand DisplayName= "Meilisearch Search Engine" 2>&1 | Out-Null

# 修改后
sc.exe create Meilisearch binPath= $binPath start= auto DisplayName= "Meilisearch Search Engine" 2>&1 | Out-Null
```

**Step 2: 添加服务依赖配置**

在服务创建后（约第 688 行后），添加依赖配置：

```powershell
# Configure dependency on PostgreSQL
sc.exe config Meilisearch depend= PostgreSQL 2>&1 | Out-Null
```

**Step 3: 提交更改**

```bash
git add documents/deployment2win/scripts/install.ps1
git commit -m "feat: Meilisearch 服务改为自动启动并依赖 PostgreSQL"
```

---

## Task 2: 创建 ArchiveApp 服务配置文件

**Files:**
- Create: `documents/deployment2win/services/archive-app.xml`

**Step 1: 创建 winsw 配置文件**

创建文件 `documents/deployment2win/services/archive-app.xml`：

```xml
<service>
  <id>ArchiveApp</id>
  <name>Archive Management Application</name>
  <description>档案管理系统 Web 应用</description>

  <!-- 使用 PM2 启动应用 -->
  <executable>cmd.exe</executable>
  <arguments>/c "%APPDATA%\npm\pm2.cmd" start "%ARCHIVE_HOME%\app\ecosystem.config.js"</arguments>

  <!-- 工作目录 -->
  <workingdirectory>%ARCHIVE_HOME%\app</workingdirectory>

  <!-- 日志配置 -->
  <logpath>%ARCHIVE_HOME%\logs</logpath>
  <log mode="roll-by-size">
    <sizeThreshold>10240</sizeThreshold>
    <keepFiles>8</keepFiles>
  </log>

  <!-- 服务依赖 -->
  <depend>Meilisearch</depend>

  <!-- 自动启动 -->
  <startmode>Automatic</startmode>

  <!-- 失败恢复策略 -->
  <onfailure action="restart" delay="10 sec"/>
  <onfailure action="restart" delay="20 sec"/>
  <onfailure action="none"/>

  <!-- 1小时后重置失败计数 -->
  <resetfailure>1 hour</resetfailure>

  <!-- 停止超时 -->
  <stoptimeout>30 sec</stoptimeout>

  <!-- 环境变量 -->
  <env name="NODE_ENV" value="production"/>
</service>
```

**Step 2: 提交更改**

```bash
git add documents/deployment2win/services/archive-app.xml
git commit -m "feat: 添加 ArchiveApp winsw 服务配置文件"
```

---

## Task 3: 修改 install.ps1 添加 ArchiveApp 服务安装

**Files:**
- Modify: `documents/deployment2win/scripts/install.ps1` (Step 8 之后)

**Step 1: 添加 winsw 检测函数**

在文件开头的辅助函数区域（约第 50 行后）添加：

```powershell
function Install-ArchiveAppService {
    param(
        [string]$ArchiveHome,
        [string]$ServicesDir
    )

    Write-Host "  - Configuring ArchiveApp service..." -ForegroundColor Yellow

    $winswPath = Join-Path $ServicesDir "winsw.exe"
    $xmlTemplate = Join-Path $ServicesDir "archive-app.xml"

    # Check if winsw.exe exists
    if (-not (Test-Path $winswPath)) {
        Write-Host "  - Warning: winsw.exe not found at $winswPath" -ForegroundColor Yellow
        Write-Host "  - ArchiveApp will not be installed as a service" -ForegroundColor Yellow
        Write-Host "  - Download winsw.exe from https://github.com/winsw/winsw/releases" -ForegroundColor Gray
        return $false
    }

    # Check if xml template exists
    if (-not (Test-Path $xmlTemplate)) {
        Write-Host "  - Warning: archive-app.xml not found at $xmlTemplate" -ForegroundColor Yellow
        return $false
    }

    # Read and process XML template
    $xmlContent = Get-Content $xmlTemplate -Raw

    # Replace environment variables
    $xmlContent = $xmlContent -replace '%ARCHIVE_HOME%', $ArchiveHome
    $xmlContent = $xmlContent -replace '%APPDATA%', $env:APPDATA

    # Write resolved config
    $resolvedXml = Join-Path $ServicesDir "archive-app-resolved.xml"
    $xmlContent | Set-Content $resolvedXml -Encoding UTF8

    # Install service using winsw
    try {
        $installResult = & $winswPath install $resolvedXml 2>&1
        Start-Sleep -Seconds 3

        # Verify service was created
        $svc = Get-Service -Name ArchiveApp -ErrorAction SilentlyContinue
        if ($svc) {
            Write-Host "  - ArchiveApp service installed" -ForegroundColor Green

            # Configure to auto-start
            sc.exe config ArchiveApp start= auto 2>&1 | Out-Null
            sc.exe config ArchiveApp depend= Meilisearch 2>&1 | Out-Null

            return $true
        } else {
            Write-Host "  - Failed to create ArchiveApp service" -ForegroundColor Yellow
            return $false
        }
    } catch {
        Write-Host "  - Error installing ArchiveApp service: $_" -ForegroundColor Red
        return $false
    }
}
```

**Step 2: 在 Step 8 文件复制后添加服务安装调用**

找到约第 745 行（复制 services 文件后），添加 winsw.exe 复制和服务安装：

```powershell
# Copy services
$ServicesDir = Join-Path $InstallPath "services"
if (Test-Path $ServicesDir) {
    Copy-Item -Path "$ServicesDir\*.json" -Destination "$ArchiveHome\services" -Force
    # Also copy winsw.exe and xml config if they exist
    Copy-Item -Path "$ServicesDir\winsw.exe" -Destination "$ArchiveHome\services" -Force -ErrorAction SilentlyContinue
    Copy-Item -Path "$ServicesDir\archive-app.xml" -Destination "$ArchiveHome\services" -Force -ErrorAction SilentlyContinue
}
```

**Step 3: 在启动服务部分添加 ArchiveApp 启动**

找到约第 800 行（启动服务部分），修改为 4 步启动：

```powershell
# Start PostgreSQL
Write-Host "[1/4] PostgreSQL..." -ForegroundColor Yellow
# ... 现有代码 ...

# Start Meilisearch
Write-Host "[2/4] Meilisearch..." -ForegroundColor Yellow
# ... 现有代码 ...

# Install and start ArchiveApp service (if winsw available)
Write-Host "[3/4] ArchiveApp Service..." -ForegroundColor Yellow
$targetServicesDir = Join-Path $ArchiveHome "services"
$winswExe = Join-Path $targetServicesDir "winsw.exe"

if (Test-Path $winswExe) {
    # Install service if not exists
    $archiveAppSvc = Get-Service -Name ArchiveApp -ErrorAction SilentlyContinue
    if (-not $archiveAppSvc) {
        Install-ArchiveAppService -ArchiveHome $ArchiveHome -ServicesDir $targetServicesDir
    }

    # Start service
    try {
        Start-Service -Name ArchiveApp -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 5

        $archiveAppSvc = Get-Service -Name ArchiveApp -ErrorAction SilentlyContinue
        if ($archiveAppSvc -and $archiveAppSvc.Status -eq "Running") {
            Write-Host "  - ArchiveApp service started" -ForegroundColor Green
        }
    } catch {
        Write-Host "  - ArchiveApp service start failed: $_" -ForegroundColor Yellow
    }
} else {
    Write-Host "  - winsw.exe not found, skipping service installation" -ForegroundColor Gray
}

# Start Application via PM2 (fallback)
Write-Host "[4/4] Application..." -ForegroundColor Yellow
# ... 现有代码 ...
```

**Step 4: 提交更改**

```bash
git add documents/deployment2win/scripts/install.ps1
git commit -m "feat: install.ps1 添加 ArchiveApp 服务安装逻辑"
```

---

## Task 4: 修改 toolkit.ps1 支持 ArchiveApp 服务管理

**Files:**
- Modify: `documents/deployment2win/scripts/toolkit.ps1`

**Step 1: 修改 Start-App 函数**

找到 `Start-App` 函数（约第 168 行），修改为优先使用服务：

```powershell
function Start-App {
    Write-Host "Starting Application..." -ForegroundColor $Yellow

    $ARCHIVE_HOME = Get-ArchiveHome

    # Try ArchiveApp service first
    $archiveAppSvc = Get-Service -Name ArchiveApp -ErrorAction SilentlyContinue
    if ($archiveAppSvc) {
        Write-Host "  - Starting ArchiveApp service..." -ForegroundColor Gray
        try {
            Start-Service -Name ArchiveApp -ErrorAction SilentlyContinue
            Start-Sleep -Seconds 8

            if ((Get-PortStatus 3000) -eq "LISTENING") {
                Write-Host "  [OK] Started via service" -ForegroundColor $Green
                return
            }
        } catch {
            Write-Host "  - Service start failed, falling back to PM2" -ForegroundColor Yellow
        }
    }

    # Fallback to PM2
    $pm2Path = "$env:APPDATA\npm\pm2.cmd"

    if (-not (Test-Path $pm2Path)) {
        Write-Host "  [ERROR] PM2 not found" -ForegroundColor $Red
        return
    }

    # Create logs directory if not exists
    $logsDir = "$ARCHIVE_HOME\app\logs"
    if (-not (Test-Path $logsDir)) {
        New-Item -ItemType Directory -Path $logsDir -Force | Out-Null
    }

    cd "$ARCHIVE_HOME\app"

    # Stop existing
    try { & $pm2Path delete archive-management 2>$null } catch {}
    try { & $pm2Path stop archive-management 2>$null } catch {}

    # Start
    & $pm2Path start "$ARCHIVE_HOME\app\ecosystem.config.js" 2>$null

    Start-Sleep -Seconds 8

    if ((Get-PortStatus 3000) -eq "LISTENING") {
        Write-Host "  [OK] Started via PM2" -ForegroundColor $Green
    } else {
        Write-Host "  [WARNING] May not be ready yet" -ForegroundColor $Yellow
    }
}
```

**Step 2: 修改 Stop-App 函数**

找到 `Stop-App` 函数（约第 203 行），修改为优先停止服务：

```powershell
function Stop-App {
    Write-Host "Stopping Application..." -ForegroundColor $Yellow

    # Try ArchiveApp service first
    $archiveAppSvc = Get-Service -Name ArchiveApp -ErrorAction SilentlyContinue
    if ($archiveAppSvc -and $archiveAppSvc.Status -eq "Running") {
        try {
            Stop-Service -Name ArchiveApp -Force -ErrorAction SilentlyContinue
            Start-Sleep -Seconds 3
            Write-Host "  [OK] Stopped via service" -ForegroundColor $Green
            return
        } catch {
            Write-Host "  - Service stop failed, trying PM2" -ForegroundColor Yellow
        }
    }

    # Fallback to PM2
    $pm2Path = "$env:APPDATA\npm\pm2.cmd"

    if (Test-Path $pm2Path) {
        & $pm2Path stop archive-management 2>$null
        & $pm2Path delete archive-management 2>$null
    }

    # Also kill node processes
    Stop-Process -Name node -Force -ErrorAction SilentlyContinue

    Write-Host "  [OK] Stopped" -ForegroundColor $Green
}
```

**Step 3: 修改 Show-Status 函数**

找到 `Show-Status` 函数（约第 219 行），添加 ArchiveApp 服务状态显示：

```powershell
function Show-Status {
    Write-Host ""
    Write-Host ("=" * 60) -ForegroundColor $Cyan
    Write-Host "Service Status" -ForegroundColor $Cyan
    Write-Host ("=" * 60) -ForegroundColor $Cyan
    Write-Host ""

    $ARCHIVE_HOME = Get-ArchiveHome

    # PostgreSQL
    $pgService = Get-Service -Name PostgreSQL -ErrorAction SilentlyContinue
    $pgPort = Get-PortStatus 5432
    if ($pgService.Status -eq "Running") {
        Write-Host "  PostgreSQL:  Running (Port: $pgPort)" -ForegroundColor $Green
    } else {
        Write-Host "  PostgreSQL:  Stopped (Port: $pgPort)" -ForegroundColor $Red
    }

    # Meilisearch
    $msService = Get-Service -Name Meilisearch -ErrorAction SilentlyContinue
    $msPort = Get-PortStatus 7700
    if ($msService -and $msService.Status -eq "Running") {
        Write-Host "  Meilisearch: Running (Port: $msPort)" -ForegroundColor $Green
    } elseif ($msPort -eq "LISTENING") {
        Write-Host "  Meilisearch: Running (Port: $msPort, no service)" -ForegroundColor $Yellow
    } else {
        Write-Host "  Meilisearch: Stopped (Port: $msPort)" -ForegroundColor $Red
    }

    # ArchiveApp Service
    $appService = Get-Service -Name ArchiveApp -ErrorAction SilentlyContinue
    $appPort = Get-PortStatus 3000

    if ($appService) {
        if ($appService.Status -eq "Running") {
            Write-Host "  ArchiveApp:  Running (Port: $appPort)" -ForegroundColor $Green
        } else {
            Write-Host "  ArchiveApp:  $($appService.Status) (Port: $appPort)" -ForegroundColor $Yellow
        }
    } else {
        # Check PM2 if service not installed
        $pm2Path = "$env:APPDATA\npm\pm2.cmd"
        $appRunning = $false

        if (Test-Path $pm2Path) {
            cd "$ARCHIVE_HOME\app"
            $pm2List = & $pm2Path jlist 2>$null | Out-String
            if ($pm2List -match "archive-management") {
                $appRunning = $true
            }
        }

        if ($appPort -eq "LISTENING") {
            Write-Host "  Application: Running via PM2 (Port: $appPort)" -ForegroundColor $Green
        } elseif ($appRunning) {
            Write-Host "  Application: PM2 running, port not ready" -ForegroundColor $Yellow
        } else {
            Write-Host "  Application: Stopped (Port: $appPort)" -ForegroundColor $Red
        }
    }

    Write-Host ""
}
```

**Step 4: 提交更改**

```bash
git add documents/deployment2win/scripts/toolkit.ps1
git commit -m "feat: toolkit.ps1 支持 ArchiveApp 服务管理"
```

---

## Task 5: 更新部署文档

**Files:**
- Modify: `documents/deployment2win/README.md`

**Step 1: 更新服务管理部分**

在文档中更新服务管理说明：

```markdown
## 服务管理

### 自动启动服务

安装完成后，以下服务会自动注册为 Windows 服务，开机自动启动：

| 服务 | 说明 | 依赖 |
|------|------|------|
| PostgreSQL | 数据库服务 | 无 |
| Meilisearch | 搜索引擎 | PostgreSQL |
| ArchiveApp | Web 应用 | Meilisearch |

### 手动管理

| 命令 | 说明 |
|------|------|
| `start.bat` | 启动所有服务 |
| `stop.bat` | 停止所有服务 |
| `status.bat` | 查看服务状态 |

### Windows 服务管理

也可以使用 Windows 原生命令管理：

```cmd
# 查看服务状态
sc query PostgreSQL
sc query Meilisearch
sc query ArchiveApp

# 手动启动/停止
net start ArchiveApp
net stop ArchiveApp
```
```

**Step 2: 添加 winsw.exe 说明**

在安装准备部分添加说明：

```markdown
### 可选：winsw.exe

如需将 App 注册为 Windows 服务（开机自启），请下载 winsw.exe：

1. 访问 https://github.com/winsw/winsw/releases
2. 下载 `WinSW-x64.exe`
3. 重命名为 `winsw.exe` 并放入 `services/` 目录

> 如果不提供 winsw.exe，App 将使用 PM2 管理，需要手动配置开机自启。
```

**Step 3: 提交更改**

```bash
git add documents/deployment2win/README.md
git commit -m "docs: 更新服务管理文档"
```

---

## Task 6: 添加 winsw.exe 下载说明

**Files:**
- Create: `documents/deployment2win/services/README.md`

**Step 1: 创建说明文件**

```markdown
# Windows 服务配置

## winsw.exe

winsw.exe 用于将 Node.js 应用包装为 Windows 服务。

### 下载

1. 访问 https://github.com/winsw/winsw/releases
2. 下载最新版本的 `WinSW-x64.exe`
3. 重命名为 `winsw.exe`
4. 放入此目录

### 版本要求

- Windows Server 2019+ / Windows 10+
- 64 位系统

### 验证

```cmd
winsw.exe --version
```

## archive-app.xml

ArchiveApp 服务的配置文件，在安装时会自动处理以下变量：

- `%ARCHIVE_HOME%` - 应用安装目录
- `%APPDATA%` - 用户 AppData 目录
```

**Step 2: 提交更改**

```bash
git add documents/deployment2win/services/README.md
git commit -m "docs: 添加 winsw.exe 下载说明"
```

---

## 验证清单

完成所有任务后，在 Windows 上验证：

```powershell
# 1. 检查服务启动类型
Get-WmiObject Win32_Service | Where-Object {$_.Name -in @("PostgreSQL", "Meilisearch", "ArchiveApp")} | Select-Object Name, StartMode, State

# 2. 检查服务依赖
sc.exe qc Meilisearch
sc.exe qc ArchiveApp

# 3. 检查端口
netstat -an | findstr ":3000 :5432 :7700"

# 4. 重启验证
Restart-Computer
# 重启后检查
Get-Service PostgreSQL, Meilisearch, ArchiveApp
```

---

## 回滚方案

如需回滚到 PM2 方式：

```powershell
# 删除 ArchiveApp 服务
sc.exe delete ArchiveApp

# 将 Meilisearch 改为手动启动
sc.exe config Meilisearch start= demand
```
