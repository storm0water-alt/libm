# ============================================================================
# 登录验证脚本
# ============================================================================
# 用途：验证登录功能是否正常工作
# ============================================================================

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "登录功能验证工具" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# 配置
$ArchiveHome = if ($env:ARCHIVE_HOME) { $env:ARCHIVE_HOME } else { "D:\ArchiveManagement" }
$AppUrl = "http://localhost:3000"
$HealthUrl = "$AppUrl/api/health"
$LoginUrl = "$AppUrl/api/auth/callback/credentials"

# ============================================================================
# Step 1: 检查服务状态
# ============================================================================
Write-Host "[Step 1/5] 检查服务状态..." -ForegroundColor Yellow
Write-Host ""

# PostgreSQL
$PGService = Get-Service -Name PostgreSQL -ErrorAction SilentlyContinue
if ($PGService -and $PGService.Status -eq "Running") {
    Write-Host "  ✓ PostgreSQL: 运行中" -ForegroundColor Green
} else {
    Write-Host "  ❌ PostgreSQL: 未运行" -ForegroundColor Red
    exit 1
}

# Meilisearch
$MeiliService = Get-Service -Name Meilisearch -ErrorAction SilentlyContinue
if ($MeiliService -and $MeiliService.Status -eq "Running") {
    Write-Host "  ✓ Meilisearch: 运行中" -ForegroundColor Green
} elseif (Test-NetConnection -ComputerName localhost -Port 7700 -InformationLevel Quiet -WarningAction SilentlyContinue) {
    Write-Host "  ✓ Meilisearch: 运行中（端口 7700）" -ForegroundColor Green
} else {
    Write-Host "  ⚠ Meilisearch: 未运行（可选）" -ForegroundColor Yellow
}

# PM2
$pm2Path = "$env:APPDATA\npm\pm2.cmd"
if (Test-Path $pm2Path) {
    $pm2List = & $pm2Path jlist 2>$null | ConvertFrom-Json
    $app = $pm2List | Where-Object { $_.name -eq "archive-management" }
    
    if ($app -and $app.pm2_env.status -eq "online") {
        Write-Host "  ✓ Application: 运行中 (PID: $($app.pid))" -ForegroundColor Green
    } else {
        Write-Host "  ❌ Application: 未运行" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "  ❌ PM2: 未安装" -ForegroundColor Red
    exit 1
}

Write-Host ""

# ============================================================================
# Step 2: 健康检查
# ============================================================================
Write-Host "[Step 2/5] 健康检查..." -ForegroundColor Yellow
Write-Host ""

try {
    $health = Invoke-RestMethod -Uri $HealthUrl -Method Get -TimeoutSec 10
    
    if ($health.status -eq "ok") {
        Write-Host "  ✓ 应用健康检查: 通过" -ForegroundColor Green
        
        if ($health.checks.database -eq "ok") {
            Write-Host "  ✓ 数据库连接: 正常" -ForegroundColor Green
        } else {
            Write-Host "  ❌ 数据库连接: 失败" -ForegroundColor Red
            Write-Host "    请运行 fix-postgres-auth.ps1 修复" -ForegroundColor Gray
            exit 1
        }
        
        if ($health.checks.redis -eq "ok") {
            Write-Host "  ✓ Redis 连接: 正常" -ForegroundColor Green
        } else {
            Write-Host "  ⚠ Redis 连接: 失败（可选）" -ForegroundColor Yellow
        }
        
        if ($health.checks.meilisearch -eq "ok") {
            Write-Host "  ✓ Meilisearch 连接: 正常" -ForegroundColor Green
        } else {
            Write-Host "  ⚠ Meilisearch 连接: 失败（可选）" -ForegroundColor Yellow
        }
    } else {
        Write-Host "  ❌ 应用健康检查: 失败" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "  ❌ 无法访问健康检查端点: $_" -ForegroundColor Red
    Write-Host "    请确认应用正在运行: $AppUrl" -ForegroundColor Gray
    exit 1
}

Write-Host ""

# ============================================================================
# Step 3: 检查数据库用户
# ============================================================================
Write-Host "[Step 3/5] 检查数据库用户..." -ForegroundColor Yellow
Write-Host ""

$PGPath = "C:\Program Files\PostgreSQL\16"

try {
    $userCheck = & "$PGPath\bin\psql.exe" -U postgres -d archive_management -t -c "SELECT username, role, status FROM \""User\"" WHERE username='admin'" 2>$null
    $userCheck = $userCheck.Trim()
    
    if ($userCheck -match "admin") {
        Write-Host "  ✓ admin 用户存在" -ForegroundColor Green
        Write-Host "    $userCheck" -ForegroundColor Gray
    } else {
        Write-Host "  ❌ admin 用户不存在" -ForegroundColor Red
        Write-Host "    请运行 init-database.sql 初始化数据" -ForegroundColor Gray
        exit 1
    }
} catch {
    Write-Host "  ❌ 无法查询数据库: $_" -ForegroundColor Red
    Write-Host "    请运行 fix-postgres-auth.ps1 修复数据库连接" -ForegroundColor Gray
    exit 1
}

Write-Host ""

# ============================================================================
# Step 4: 检查 PM2 环境变量
# ============================================================================
Write-Host "[Step 4/5] 检查 PM2 环境变量..." -ForegroundColor Yellow
Write-Host ""

$pm2Env = & $pm2Path env 0 2>$null

if ($pm2Env -match "LANG.*C.UTF-8") {
    Write-Host "  ✓ LANG: C.UTF-8" -ForegroundColor Green
} else {
    Write-Host "  ⚠ LANG: 未设置或不是 UTF-8" -ForegroundColor Yellow
    Write-Host "    可能导致中文显示乱码" -ForegroundColor Gray
}

if ($pm2Env -match "LC_ALL.*C.UTF-8") {
    Write-Host "  ✓ LC_ALL: C.UTF-8" -ForegroundColor Green
} else {
    Write-Host "  ⚠ LC_ALL: 未设置或不是 UTF-8" -ForegroundColor Yellow
    Write-Host "    可能导致中文显示乱码" -ForegroundColor Gray
}

Write-Host ""

# ============================================================================
# Step 5: 测试登录
# ============================================================================
Write-Host "[Step 5/5] 测试登录..." -ForegroundColor Yellow
Write-Host ""

Write-Host "  尝试访问登录页面..." -ForegroundColor Gray

try {
    $loginPage = Invoke-WebRequest -Uri "$AppUrl/login" -Method Get -TimeoutSec 10 -UseBasicParsing
    
    if ($loginPage.StatusCode -eq 200) {
        Write-Host "  ✓ 登录页面可访问" -ForegroundColor Green
    } else {
        Write-Host "  ❌ 登录页面返回状态码: $($loginPage.StatusCode)" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "  ❌ 无法访问登录页面: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "  注意：由于 NextAuth 的 CSRF 保护，无法通过脚本直接测试登录" -ForegroundColor Gray
Write-Host "  请手动测试：" -ForegroundColor Gray
Write-Host "    1. 打开浏览器访问: $AppUrl/login" -ForegroundColor Cyan
Write-Host "    2. 输入用户名: admin" -ForegroundColor Cyan
Write-Host "    3. 输入密码: admin123" -ForegroundColor Cyan
Write-Host "    4. 点击登录按钮" -ForegroundColor Cyan
Write-Host ""

# ============================================================================
# 总结
# ============================================================================
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "验证完成！" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "检查清单:" -ForegroundColor White
Write-Host "  ✓ PostgreSQL 服务运行正常"
Write-Host "  ✓ 应用健康检查通过"
Write-Host "  ✓ 数据库连接正常"
Write-Host "  ✓ admin 用户存在"
Write-Host ""

Write-Host "如果登录仍然失败：" -ForegroundColor Yellow
Write-Host "  1. 查看应用日志:"
Write-Host "     cd $ArchiveHome\scripts" -ForegroundColor Cyan
Write-Host "     .\logs.bat" -ForegroundColor Cyan
Write-Host ""
Write-Host "  2. 检查浏览器 Network 面板:"
Write-Host "     - 打开 F12 开发工具" -ForegroundColor Gray
Write-Host "     - 切换到 Network 标签" -ForegroundColor Gray
Write-Host "     - 点击登录按钮" -ForegroundColor Gray
Write-Host "     - 查看 login 请求的响应" -ForegroundColor Gray
Write-Host ""
Write-Host "  3. 如果响应是乱码："
Write-Host "     - 确认 ecosystem.config.js 中设置了 LANG 和 LC_ALL" -ForegroundColor Gray
Write-Host "     - 重启应用: .\restart.bat" -ForegroundColor Gray
Write-Host ""
