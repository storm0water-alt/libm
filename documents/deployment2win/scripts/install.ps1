# 档案管理系统 - 一键安装脚本

<#
.SYNOPSIS
    档案管理系统极简Windows原生部署 - 一键安装脚本
.DESCRIPTION
    自动安装PostgreSQL、Meilisearch、Node.js应用，配置为Windows服务
.PARAMETER InstallPath
    安装路径，默认为当前目录
.PARAMETER ConfigFile
    配置文件路径，默认为当前目录下的config.json
.EXAMPLE
    .\install.ps1
    .\install.ps1 -InstallPath "D:\ArchiveManagement"
    .\install.ps1 -ConfigFile "D:\CustomConfig\config.json"
#>

param(
    [string]$InstallPath = (Get-Location).Path,
    [string]$ConfigFile = "$InstallPath\config\config.json"
)

# 检查管理员权限
function Test-Administrator {
    $currentUser = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($currentUser)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

Write-Host "🚀 档案管理系统 - 一键安装脚本" -ForegroundColor Green
Write-Host "==================================" -ForegroundColor Yellow

# 1. 环境检查
if (-not (Test-Administrator)) {
    Write-Host "❌ 错误: 需要管理员权限运行此脚本" -ForegroundColor Red
    Write-Host "请右键点击PowerShell选择'以管理员身份运行'" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ 管理员权限检查通过" -ForegroundColor Green

# 2. 创建目录结构
Write-Host "📁 创建目录结构..." -ForegroundColor Cyan
$directories = @(
    "$InstallPath\packages",
    "$InstallPath\config",
    "$InstallPath\services",
    "$InstallPath\scripts",
    "$InstallPath\data\database",
    "$InstallPath\data\archives",
    "$InstallPath\logs\app",
    "$InstallPath\logs\database",
    "$InstallPath\logs\meilisearch"
)

foreach ($dir in $directories) {
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
        Write-Host "  ✅ 创建: $dir" -ForegroundColor Gray
    }
}

# 3. 检查安装包
Write-Host "📦 检查安装包..." -ForegroundColor Cyan

$packages = @{
    "nodejs" = "$InstallPath\packages\nodejs-v22.22.0-x64.msi"
    "postgresql" = "$InstallPath\packages\postgresql-16.11-2-windows-x64.exe"
    "meilisearch" = "$InstallPath\packages\meilisearch-windows-amd64.exe"
}

$packageCheck = $true
foreach ($pkg in $packages.GetEnumerator()) {
    if (-not (Test-Path $pkg.Value)) {
        Write-Host "  ❌ 缺失: $($pkg.Key) - $($pkg.Value)" -ForegroundColor Red
        $packageCheck = $false
    } else {
        Write-Host "  ✅ 找到: $($pkg.Key)" -ForegroundColor Gray
    }
}

if (-not $packageCheck) {
    Write-Host ""
    Write-Host "❌ 错误: 缺少必要的安装包" -ForegroundColor Red
    Write-Host "请将以下文件放置在 packages\ 目录中:" -ForegroundColor Yellow
    foreach ($pkg in $packages.GetEnumerator()) {
        Write-Host "  - $($pkg.Value)" -ForegroundColor Gray
    }
    exit 1
}

# 4. 创建配置文件
Write-Host "⚙️ 创建配置文件..." -ForegroundColor Cyan

# 创建 .env 文件
$envContent = @"
# ===================================
# 数据库配置 (SSL启用)
# ===================================
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=archive_management
POSTGRES_USER=postgres
POSTGRES_PASSWORD=secure_password_$(Get-Date -Format 'yyyyMMddHHmm')

# ===================================
# Meilisearch配置
# ===================================
MEILISEARCH_HOST=localhost
MEILISEARCH_PORT=7700
MEILISEARCH_MASTER_KEY=search_master_key_$(Get-Date -Format 'yyyyMMddHHmm')

# ===================================
# 应用配置
# ===================================
NEXTAUTH_SECRET=nextauth_secret_$(Get-Date -Format 'yyyyMMddHHmm')
NEXTAUTH_URL=http://localhost:3000
APP_PORT=3000

# ===================================
# 存储配置
# ===================================
ARCHIVE_STORAGE_PATH=$InstallPath\data\archives
BACKUP_PATH=D:\ArchiveBackups
LOG_PATH=$InstallPath\logs

# ===================================
# 服务配置
# ===================================
PM2_LOG_LEVEL=info
SERVICE_RESTART_DELAY=30
HEALTH_CHECK_INTERVAL=60
"@

$envFile = "$InstallPath\.env"
$envContent | Out-File -FilePath $envFile -Encoding UTF8
Write-Host "  ✅ 创建: .env" -ForegroundColor Gray

# 创建 config.json 文件
$configContent = @{
    database = @{
        host = "localhost"
        port = 5432
        database = "archive_management"
        user = "postgres"
        ssl = @{
            enabled = $true
            certPath = "$InstallPath\config\server.crt"
            keyPath = "$InstallPath\config\server.key"
        }
    }
    meilisearch = @{
        host = "localhost"
        port = 7700
        masterKey = "search_master_key_$(Get-Date -Format 'yyyyMMddHHmm')"
    }
    archive = @{
        port = 3000
        storagePath = "$InstallPath\data\archives"
        tempPath = "D:\ArchiveTemp"
    }
    logging = @{
        baseDir = "$InstallPath\logs"
        maxFileSize = "100MB"
        rotatePolicy = "daily"
        retentionDays = 30
        importantLogFile = "critical-errors.log"
    }
    services = @{
        restartDelay = 30
        healthCheckInterval = 60
        startupTimeout = 300
    }
}

$configContent | ConvertTo-Json -Depth 4 | Out-File -FilePath $ConfigFile -Encoding UTF8
Write-Host "  ✅ 创建: config.json" -ForegroundColor Gray

# 5. 生成SSL证书 (开发环境)
Write-Host "🔐 生成SSL证书..." -ForegroundColor Cyan

$certPath = "$InstallPath\config\server.crt"
$keyPath = "$InstallPath\config\server.key"

# 生成自签名证书 (PostgreSQL 16.11.2 SSL要求)
openssl req -x509 -nodes -days 365 -newkey rsa:2048 `
    -keyout $keyPath `
    -out $certPath `
    -subj "/C=CN/ST=State/L=City/O=ArchiveManagement/CN=localhost" `
    2>$null

if (Test-Path $certPath -and Test-Path $keyPath) {
    Write-Host "  ✅ 生成: SSL证书" -ForegroundColor Gray
} else {
    Write-Host "  ⚠️ 警告: SSL证书生成失败" -ForegroundColor Yellow
}

# 6. 安装PostgreSQL
Write-Host "🐘 安装PostgreSQL..." -ForegroundColor Cyan

$postgresInstaller = $packages.postgresql
$postgresInstallArgs = @(
    "--mode", "unattended",
    "--unattendedmodeui", "none",
    "--superpassword", "postgres",
    "--servicename", "PostgreSQL",
    "--servicepassword", "postgres_$(Get-Date -Format 'yyyyMMddHHmm')",
    "--datadir", "$InstallPath\data\database",
    "--servicestartup", "automatic"
)

Start-Process -FilePath $postgresInstaller -ArgumentList $postgresInstallArgs -Wait
Write-Host "  ✅ PostgreSQL安装完成" -ForegroundColor Gray

# 7. 安装Meilisearch
Write-Host "🔍 安装Meilisearch..." -ForegroundColor Cyan

$meiliInstaller = $packages.meilisearch
$meiliInstallDir = "C:\Program Files\Meilisearch"

if (-not (Test-Path $meiliInstallDir)) {
    New-Item -ItemType Directory -Path $meiliInstallDir -Force | Out-Null
}

Copy-Item $meiliInstaller $meiliInstallDir -Force
Write-Host "  ✅ Meilisearch安装完成" -ForegroundColor Gray

# 8. 安装Node.js
Write-Host "💚 安装Node.js..." -ForegroundColor Cyan

$nodeInstaller = $packages.nodejs
$nodeInstallArgs = @(
    "/quiet",
    "/norestart",
    "/norestart",
    "/addlocal"
)

Start-Process -FilePath $nodeInstaller -ArgumentList $nodeInstallArgs -Wait
Write-Host "  ✅ Node.js安装完成" -ForegroundColor Gray

# 9. 数据库初始化
Write-Host "🗄️ 初始化数据库..." -ForegroundColor Cyan

# 等待PostgreSQL服务启动
Write-Host "  ⏳ 等待PostgreSQL服务启动..." -ForegroundColor Yellow
Start-Sleep -Seconds 15

# 检查数据库连接
$maxRetries = 10
$retryCount = 0
$dbConnected = $false

while ($retryCount -lt $maxRetries -and -not $dbConnected) {
    try {
        $testResult = & "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d archive_management -c "SELECT 1;" -h localhost -p 5432 -q 2>$null
        if ($LASTEXITCODE -eq 0) {
            $dbConnected = $true
            Write-Host "  ✅ 数据库连接成功" -ForegroundColor Green
        } else {
            Write-Host "  ⚠️ 数据库连接失败，重试 $retryCount/$maxRetries" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "  ❌ 数据库连接异常: $($_)" -ForegroundColor Red
    }
    
    $retryCount++
    Start-Sleep -Seconds 3
}

if (-not $dbConnected) {
    Write-Host "  ❌ 数据库连接失败，跳过初始化" -ForegroundColor Red
} else {
    # 执行数据库初始化
    try {
        $initScript = "$InstallPath\init-data\init-database.sql"
        if (Test-Path $initScript) {
            Write-Host "  🚀 执行数据库初始化脚本..." -ForegroundColor Green
            $initResult = & "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d archive_management -f $initScript -h localhost -p 5432 2>$null
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host "  ✅ 数据库初始化完成" -ForegroundColor Green
            } else {
                Write-Host "  ❌ 数据库初始化失败" -ForegroundColor Red
            }
        } else {
            Write-Host "  ⚠️ 初始化脚本不存在，跳过数据库初始化" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "  ❌ 数据库初始化异常: $($_)" -ForegroundColor Red
    }
}

# 10. 创建Windows服务
Write-Host "⚙️ 创建Windows服务..." -ForegroundColor Cyan

# PostgreSQL服务配置
$postgresServiceConfig = @{
    name = "PostgreSQL"
    displayName = "PostgreSQL Database Service"
    description = "PostgreSQL database server for archive management"
    binaryPath = "C:\Program Files\PostgreSQL\16\bin\pg_ctl.exe"
    configPath = "$InstallPath\data\database\postgresql.conf"
    dataPath = "$InstallPath\data\database"
    logPath = "$InstallPath\logs\database\postgresql.log"
}

$postgresServiceConfig | ConvertTo-Json -Depth 4 | Out-File "$InstallPath\services\postgresql-service.json" -Encoding UTF8

# Meilisearch服务配置
$meiliServiceConfig = @{
    name = "Meilisearch"
    displayName = "Archive Search Service"
    description = "Meilisearch full-text search engine"
    binaryPath = "C:\Program Files\Meilisearch\meilisearch.exe"
    configPath = "$InstallPath\config\meilisearch.toml"
    dataPath = "$InstallPath\data\meilisearch"
    logPath = "$InstallPath\logs\meilisearch\meilisearch.log"
}

$meiliServiceConfig | ConvertTo-Json -Depth 4 | Out-File "$InstallPath\services\meilisearch-service.json" -Encoding UTF8

# 创建PM2配置
$pm2Config = @{
    apps = @(
        @{
            name = "archive-management"
            script = "$InstallPath\app\server.js"
            cwd = "$InstallPath\app"
            instances = 1
            autorestart = $true
            max_memory_restart = "1G"
            min_uptime = "10s"
            error_file = "$InstallPath\logs\pm2-error.log"
            out_file = "$InstallPath\logs\pm2-out.log"
            log_file = "$InstallPath\logs\pm2-combined.log"
            env = @{
                NODE_ENV = "production"
                PORT = "3000"
                DATABASE_URL = "postgresql://postgres:admin123@localhost:5432/archive_management?sslmode=require"
                MEILISEARCH_URL = "http://localhost:7700"
                MEILISEARCH_MASTER_KEY = "search_master_key_$(Get-Date -Format 'yyyyMMddHHmm')"
                NEXTAUTH_SECRET = "nextauth_secret_$(Get-Date -Format 'yyyyMMddHHmm')"
                NEXTAUTH_URL = "http://localhost:3000"
            }
        }
    )
}

$pm2Config | ConvertTo-Json -Depth 4 | Out-File "$InstallPath\config\ecosystem.config.js" -Encoding UTF8

Write-Host "  ✅ 服务配置完成" -ForegroundColor Gray

# 10. 启动服务
Write-Host "🚀 启动服务..." -ForegroundColor Cyan

# 启动PostgreSQL
& "C:\Program Files\PostgreSQL\16\bin\pg_ctl.exe" start -D "$InstallPath\data\database" -l "$InstallPath\logs\database\postgresql.log"

# 等待PostgreSQL启动
Write-Host "  ⏳ 等待PostgreSQL启动..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# 启动Meilisearch
& "C:\Program Files\Meilisearch\meilisearch.exe" --master-key="search_master_key_$(Get-Date -Format 'yyyyMMddHHmm')" --db-path="$InstallPath\data\meilisearch" --http-addr="localhost:7700"

# 等待Meilisearch启动
Write-Host "  ⏳ 等待Meilisearch启动..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# 启动Node.js应用 (通过PM2)
$envPath = "$InstallPath\.env"
$pm2Path = "$env:APPDATA\npm2"
if (Test-Path $pm2Path) {
    & "$pm2Path\pm2.cmd" start "$InstallPath\config\ecosystem.config.js"
} else {
    Write-Host "  ⚠️ 警告: PM2未找到，请手动启动Node.js应用" -ForegroundColor Yellow
    Write-Host "  命令: cd `"$InstallPath\app` && set NODE_ENV=production && set DATABASE_URL=postgresql://postgres:secure_password_$(Get-Date -Format 'yyyyMMddHHmm')@localhost:5432/archive_management?sslmode=require && node server.js" -ForegroundColor Gray
}

Write-Host ""
Write-Host "🎉 安装完成！" -ForegroundColor Green
Write-Host "==================================" -ForegroundColor Yellow
Write-Host "📁 安装路径: $InstallPath" -ForegroundColor Gray
Write-Host "⚙️ 配置文件: $ConfigFile" -ForegroundColor Gray
Write-Host "🌐 应用访问: http://localhost:3000" -ForegroundColor Gray
Write-Host "🔍 搜索服务: http://localhost:7700" -ForegroundColor Gray
Write-Host "📊 服务管理: 运行 services\start-services.ps1" -ForegroundColor Gray
Write-Host "📋 服务状态: 运行 services\check-status.ps1" -ForegroundColor Gray
Write-Host "📝 日志位置: $InstallPath\logs" -ForegroundColor Gray
Write-Host ""