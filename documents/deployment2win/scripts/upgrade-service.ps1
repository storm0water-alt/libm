# ============================================================================
# Archive Management System - Service Upgrade Script
# ============================================================================
# 用于已安装系统升级到自动启动服务版本
# 运行方式：以管理员身份运行 PowerShell
# ============================================================================

$ErrorActionPreference = "Continue"

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "Archive Management - Service Upgrade" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Get script directory
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ArchiveHome = Split-Path -Parent $ScriptDir

# Try to get ARCHIVE_HOME from config.ini
$ConfigIniPath = Join-Path $ArchiveHome "config\config.ini"
if (Test-Path $ConfigIniPath) {
    $line = Select-String "ARCHIVE_HOME=" $ConfigIniPath | Select-Object -First 1
    if ($line) {
        $ArchiveHome = $line.Line.Split("=")[1].Trim()
    }
}

Write-Host "Installation path: $ArchiveHome" -ForegroundColor Gray
Write-Host ""

# ============================================================================
# Step 1: Upgrade Meilisearch Service
# ============================================================================
Write-Host "[Step 1/2] Upgrading Meilisearch service..." -ForegroundColor Yellow

$MeiliService = Get-Service -Name Meilisearch -ErrorAction SilentlyContinue

if ($MeiliService) {
    # Get current startup type
    $currentStartMode = (Get-WmiObject Win32_Service -Filter "Name='Meilisearch'").StartMode

    if ($currentStartMode -ne "Auto") {
        Write-Host "  - Current startup type: $currentStartMode" -ForegroundColor Gray
        Write-Host "  - Changing to Automatic..." -ForegroundColor Gray

        sc.exe config Meilisearch start= auto 2>&1 | Out-Null
        Start-Sleep -Seconds 2

        # Verify
        $newStartMode = (Get-WmiObject Win32_Service -Filter "Name='Meilisearch'").StartMode
        if ($newStartMode -eq "Auto") {
            Write-Host "  - Startup type changed to Automatic" -ForegroundColor Green
        } else {
            Write-Host "  - Warning: Failed to change startup type" -ForegroundColor Yellow
        }
    } else {
        Write-Host "  - Meilisearch already set to Automatic" -ForegroundColor Green
    }

    # Configure dependency on PostgreSQL
    Write-Host "  - Configuring dependency on PostgreSQL..." -ForegroundColor Gray
    sc.exe config Meilisearch depend= PostgreSQL 2>&1 | Out-Null

    # Verify dependency
    $serviceConfig = sc.exe qc Meilisearch
    if ($serviceConfig -match "PostgreSQL") {
        Write-Host "  - Dependency configured: PostgreSQL -> Meilisearch" -ForegroundColor Green
    } else {
        Write-Host "  - Dependency may not be configured (PostgreSQL service might not exist)" -ForegroundColor Yellow
    }

} else {
    Write-Host "  - Meilisearch service not found" -ForegroundColor Red
    Write-Host "  - Please run install.ps1 first" -ForegroundColor Yellow
}

# ============================================================================
# Step 2: Install ArchiveApp Service (if winsw.exe exists)
# ============================================================================
Write-Host ""
Write-Host "[Step 2/2] Installing ArchiveApp service..." -ForegroundColor Yellow

$ServicesDir = Join-Path $ArchiveHome "services"
$winswPath = Join-Path $ServicesDir "winsw.exe"
$xmlTemplate = Join-Path $ServicesDir "archive-app.xml"

# Check if ArchiveApp service already exists
$ArchiveAppService = Get-Service -Name ArchiveApp -ErrorAction SilentlyContinue

if ($ArchiveAppService) {
    Write-Host "  - ArchiveApp service already exists" -ForegroundColor Green

    # Ensure it's set to auto-start
    $currentStartMode = (Get-WmiObject Win32_Service -Filter "Name='ArchiveApp'").StartMode
    if ($currentStartMode -ne "Auto") {
        sc.exe config ArchiveApp start= auto 2>&1 | Out-Null
        Write-Host "  - Startup type changed to Automatic" -ForegroundColor Green
    }

    # Ensure dependency on Meilisearch
    sc.exe config ArchiveApp depend= Meilisearch 2>&1 | Out-Null
    Write-Host "  - Dependency configured: Meilisearch -> ArchiveApp" -ForegroundColor Gray

} else {
    # Check for winsw.exe
    if (-not (Test-Path $winswPath)) {
        Write-Host "  - winsw.exe not found at: $winswPath" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "  To enable ArchiveApp service:" -ForegroundColor Cyan
        Write-Host "  1. Download from: https://github.com/winsw/winsw/releases" -ForegroundColor Gray
        Write-Host "  2. Download WinSW-x64.exe" -ForegroundColor Gray
        Write-Host "  3. Rename to winsw.exe" -ForegroundColor Gray
        Write-Host "  4. Place in: $ServicesDir" -ForegroundColor Gray
        Write-Host "  5. Run this script again" -ForegroundColor Gray
        Write-Host ""
        Write-Host "  Without winsw.exe, the app will continue using PM2 (manual start required)." -ForegroundColor Yellow

    } elseif (-not (Test-Path $xmlTemplate)) {
        Write-Host "  - archive-app.xml not found at: $xmlTemplate" -ForegroundColor Yellow
        Write-Host "  - Please ensure the deployment package is complete" -ForegroundColor Yellow

    } else {
        # Generate resolved XML with actual paths
        Write-Host "  - Found winsw.exe, installing service..." -ForegroundColor Gray

        $xmlContent = Get-Content $xmlTemplate -Raw
        $resolvedXml = Join-Path $ServicesDir "archive-app-resolved.xml"

        # Replace environment variables
        $xmlContent = $xmlContent -replace '%ARCHIVE_HOME%', $ArchiveHome
        $xmlContent = $xmlContent -replace '%APPDATA%', $env:APPDATA
        $xmlContent | Set-Content $resolvedXml -Encoding UTF8

        # Install service
        try {
            $installResult = & $winswPath install $resolvedXml 2>&1 | Out-Null
            Start-Sleep -Seconds 3

            # Verify service was created
            $ArchiveAppService = Get-Service -Name ArchiveApp -ErrorAction SilentlyContinue
            if ($ArchiveAppService) {
                Write-Host "  - ArchiveApp service installed" -ForegroundColor Green

                # Configure to auto-start
                sc.exe config ArchiveApp start= auto 2>&1 | Out-Null

                # Configure dependency
                sc.exe config ArchiveApp depend= Meilisearch 2>&1 | Out-Null

                Write-Host "  - Dependency configured: Meilisearch -> ArchiveApp" -ForegroundColor Gray
                Write-Host "  - Startup type: Automatic" -ForegroundColor Gray

                # Start service
                Write-Host "  - Starting ArchiveApp service..." -ForegroundColor Gray
                try {
                    Start-Service -Name ArchiveApp -ErrorAction SilentlyContinue
                    Start-Sleep -Seconds 8

                    $ArchiveAppService = Get-Service -Name ArchiveApp -ErrorAction SilentlyContinue
                    if ($ArchiveAppService -and $ArchiveAppService.Status -eq "Running") {
                        Write-Host "  - ArchiveApp service started" -ForegroundColor Green
                    } else {
                        Write-Host "  - Service installed but not running (check logs)" -ForegroundColor Yellow
                    }
                } catch {
                    Write-Host "  - Service start failed: $_" -ForegroundColor Yellow
                }

            } else {
                Write-Host "  - Failed to create ArchiveApp service" -ForegroundColor Red
            }

        } catch {
            Write-Host "  - Error installing service: $_" -ForegroundColor Red
        }
    }
}

# ============================================================================
# Summary
# ============================================================================
Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "Upgrade Summary" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Check all services
$services = @("PostgreSQL", "Meilisearch", "ArchiveApp")
foreach ($svcName in $services) {
    $svc = Get-Service -Name $svcName -ErrorAction SilentlyContinue
    if ($svc) {
        $startMode = (Get-WmiObject Win32_Service -Filter "Name='$svcName'").StartMode
        $status = $svc.Status
        $color = if ($status -eq "Running") { "Green" } else { "Yellow" }
        Write-Host "  $svcName" -ForegroundColor $color
        Write-Host "    Status: $status" -ForegroundColor Gray
        Write-Host "    Startup: $startMode" -ForegroundColor Gray
    } else {
        Write-Host "  $svcName" -ForegroundColor Red
        Write-Host "    Status: Not installed" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "Service dependency chain:" -ForegroundColor Cyan
Write-Host "  PostgreSQL -> Meilisearch -> ArchiveApp" -ForegroundColor Gray
Write-Host ""
Write-Host "After Windows restart, services will start automatically." -ForegroundColor Green
Write-Host ""
