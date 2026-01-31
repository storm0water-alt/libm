# 档案管理系统 - 服务状态检查脚本

<#
.SYNOPSIS
    检查档案管理系统所有服务的运行状态
.DESCRIPTION
    检查PostgreSQL、Meilisearch、Archive Management服务状态
.PARAMETER Detailed
    显示详细的服务信息
.PARAMETER Report
    生成状态报告文件
.EXAMPLE
    .\check-status.ps1
    .\check-status.ps1 -Detailed
    .\check-status.ps1 -Report
#>

param(
    [switch]$Detailed,
    [switch]$Report
)

Write-Host "📊 档案管理系统 - 服务状态检查" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Yellow

# 服务配置
$services = @(
    @{
        Name = "PostgreSQL"
        DisplayName = "PostgreSQL Database Service"
        Port = 5432
        ProcessName = "postgres"
        ServiceType = "Windows"
    },
    @{
        Name = "Meilisearch"
        DisplayName = "Archive Search Service"
        Port = 7700
        ProcessName = "meilisearch"
        ServiceType = "Windows"
    },
    @{
        Name = "ArchiveManagement"
        DisplayName = "Archive Management Application"
        Port = 3000
        ProcessName = "node"
        ServiceType = "PM2"
    }
)

$allHealthy = $true

# 检查每个服务
foreach ($service in $services) {
    Write-Host ""
    Write-Host "🔍 检查服务: $($service.DisplayName)" -ForegroundColor Gray
    
    $serviceHealthy = $false
    $serviceInfo = ""
    
    if ($service.ServiceType -eq "Windows") {
        # 检查Windows服务状态
        $windowsService = Get-Service -Name $service.Name -ErrorAction SilentlyContinue
        if ($windowsService) {
            $status = $windowsService.Status
            $serviceInfo = "状态: $status"
            
            if ($status -eq "Running") {
                $serviceHealthy = $true
                Write-Host "  ✅ Windows服务状态: 运行中" -ForegroundColor Green
            } else {
                $serviceHealthy = $false
                Write-Host "  ❌ Windows服务状态: $status" -ForegroundColor Red
            }
        } else {
            Write-Host "  ⚠️ Windows服务未安装" -ForegroundColor Yellow
        }
        
        # 检查端口占用
        $portCheck = netstat -an | findstr ":$($service.Port) "
        if ($portCheck) {
            Write-Host "  🌐 端口 $port`: 已占用" -ForegroundColor Green
        } else {
            Write-Host "  🌐 端口 $port`: 未占用" -ForegroundColor Yellow
            $serviceHealthy = $false
        }
        
        # 检查进程
        $processCheck = Get-Process | Where-Object { $_.ProcessName -like "*$($service.ProcessName)*" }
        if ($processCheck) {
            Write-Host "  💻 进程状态: 运行中" -ForegroundColor Green
        } else {
            Write-Host "  💻 进程状态: 未运行" -ForegroundColor Yellow
        }
        
    } elseif ($service.ServiceType -eq "PM2") {
        # 检查PM2管理的Node.js应用
        try {
            $pm2Path = "$env:APPDATA\npm2"
            if (Test-Path $pm2Path) {
                $pm2Status = & "$pm2Path\pm2.cmd" status archive-management 2>$null
                if ($pm2Status -like "*online*") {
                    $serviceHealthy = $true
                    $serviceInfo = "PM2状态: 在线"
                    Write-Host "  ✅ PM2状态: 在线" -ForegroundColor Green
                } else {
                    $serviceHealthy = $false
                    $serviceInfo = "PM2状态: 离线"
                    Write-Host "  ❌ PM2状态: 离线" -ForegroundColor Red
                }
            } else {
                Write-Host "  ⚠️ PM2未安装" -ForegroundColor Yellow
                $serviceHealthy = $false
            }
        } catch {
            Write-Host "  ❌ PM2状态检查失败" -ForegroundColor Red
            $serviceHealthy = $false
        }
        
        # 检查端口
        $portCheck = netstat -an | findstr ":$($service.Port) "
        if ($portCheck) {
            Write-Host "  🌐 端口 $port`: 已占用" -ForegroundColor Green
        } else {
            Write-Host "  🌐 端口 $port`: 未占用" -ForegroundColor Yellow
            $serviceHealthy = $false
        }
        
        # 检查进程
        $processCheck = Get-Process | Where-Object { $_.ProcessName -eq "node" }
        if ($processCheck) {
            Write-Host "  💻 Node.js进程: 运行中" -ForegroundColor Green
        } else {
            Write-Host "  💻 Node.js进程: 未运行" -ForegroundColor Yellow
            $serviceHealthy = $false
        }
    }
    
    if ($Detailed) {
        Write-Host "  📋 详细信息: $serviceInfo" -ForegroundColor Gray
    }
    
    if (-not $serviceHealthy) {
        $allHealthy = $false
    }
}

# 应用访问测试
Write-Host ""
Write-Host "🌐 应用连接测试" -ForegroundColor Gray

try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/api/health" -TimeoutSec 10 -UseBasicParsing:$false
    if ($response.StatusCode -eq 200) {
        Write-Host "  ✅ 应用健康检查: 通过" -ForegroundColor Green
    } else {
        Write-Host "  ❌ 应用健康检查: 失败 (HTTP $($response.StatusCode))" -ForegroundColor Red
        $allHealthy = $false
    }
} catch {
    Write-Host "  ❌ 应用健康检查: 无法连接" -ForegroundColor Red
    $allHealthy = $false
}

# 数据库连接测试
Write-Host ""
Write-Host "🐘 数据库连接测试" -ForegroundColor Gray

try {
    $dbTest = & "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d archive_management -c "SELECT 1;" -h localhost -p 5432 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✅ 数据库连接: 正常" -ForegroundColor Green
    } else {
        Write-Host "  ❌ 数据库连接: 失败" -ForegroundColor Red
        $allHealthy = $false
    }
} catch {
    Write-Host "  ❌ 数据库连接: 异常" -ForegroundColor Red
    $allHealthy = $false
}

# 搜索服务测试
Write-Host ""
Write-Host "🔍 搜索服务测试" -ForegroundColor Gray

try {
    $searchResponse = Invoke-WebRequest -Uri "http://localhost:7700/health" -TimeoutSec 10 -UseBasicParsing:$false
    if ($searchResponse.StatusCode -eq 200) {
        Write-Host "  ✅ 搜索服务: 正常" -ForegroundColor Green
    } else {
        Write-Host "  ❌ 搜索服务: 失败 (HTTP $($searchResponse.StatusCode))" -ForegroundColor Red
        $allHealthy = $false
    }
} catch {
    Write-Host "  ❌ 搜索服务: 无法连接" -ForegroundColor Red
    $allHealthy = $false
}

# 总体状态
Write-Host ""
Write-Host "============================================" -ForegroundColor Yellow

if ($allHealthy) {
    Write-Host "🎉 所有服务运行正常！" -ForegroundColor Green
} else {
    Write-Host "⚠️ 发现问题，请检查上述详细信息" -ForegroundColor Yellow
}

# 系统资源信息
Write-Host ""
Write-Host "💾 系统资源信息" -ForegroundColor Gray

# CPU使用率
$cpuUsage = Get-WmiObject -Class Win32_Processor | Measure-Object -Property LoadPercentage | Select-Object -ExpandProperty LoadPercentage
Write-Host "  💻 CPU使用率: $($cpuUsage.LoadPercentage)%"

# 内存使用
$memory = Get-WmiObject -Class Win32_OperatingSystem | Select-Object TotalVisibleMemorySize, FreePhysicalMemory
$usedMemory = $memory.TotalVisibleMemorySize - $memory.FreePhysicalMemory
$memoryUsage = [math]::Round(($usedMemory / $memory.TotalVisibleMemorySize) * 100, 2)
Write-Host "  🧠 内存使用: $($memoryUsage)% ($([math]::Round($usedMemory/1MB, 0))MB / $([math]::Round($memory.TotalVisibleMemorySize/1MB, 0))MB)"

# 磁盘空间 (D盘)
$diskD = Get-WmiObject -Class Win32_LogicalDisk -Filter "DeviceID='D:'"
if ($diskD) {
    $freeSpace = [math]::Round($diskD.FreeSpace / 1GB, 2)
    $totalSpace = [math]::Round($diskD.Size / 1GB, 2)
    $usedSpace = $totalSpace - $freeSpace
    $diskUsage = [math]::Round(($usedSpace / $totalSpace) * 100, 2)
    Write-Host "  💾 D盘使用: $($diskUsage)% ($($freeSpace)GB可用 / $($totalSpace)GB总计)"
}

Write-Host ""

# 日志文件检查
Write-Host "📝 最近日志文件" -ForegroundColor Gray

$logDirs = @("C:\ArchiveLogs\app", "C:\ArchiveLogs\database", "C:\ArchiveLogs\meilisearch")

foreach ($logDir in $logDirs) {
    if (Test-Path $logDir) {
        $latestLog = Get-ChildItem "$logDir\*.log" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
        if ($latestLog) {
            $logSize = [math]::Round($latestLog.Length / 1MB, 2)
            $lastModified = $latestLog.LastWriteTime
            Write-Host "  📄 $($latestLog.Name): $($logSize)MB, 更新时间: $($lastModified.ToString('yyyy-MM-dd HH:mm:ss'))"
        }
    }
}

# 生成报告
if ($Report) {
    $reportData = @{
        timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        services = @()
        systemResources = @{
            cpuUsage = $cpuUsage.LoadPercentage
            memoryUsage = $memoryUsage
            diskUsage = if ($diskD) { $diskUsage } else { "N/A" }
        }
        allHealthy = $allHealthy
    }
    
    foreach ($service in $services) {
        $serviceStatus = @{
            name = $service.Name
            displayName = $service.DisplayName
            healthy = if ($allHealthy) { $true } else { $false }
            port = $service.Port
        }
        $reportData.services += $serviceStatus
    }
    
    $reportFile = "D:\ArchiveManagement\health-report-$(Get-Date -Format 'yyyyMMdd-HHmmss').json"
    $reportData | ConvertTo-Json -Depth 4 | Out-File -FilePath $reportFile -Encoding UTF8
    
    Write-Host ""
    Write-Host "📋 健康报告已生成: $reportFile" -ForegroundColor Green
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Yellow