# ============================================================================
# PostgreSQL Authentication Fix Script
# ============================================================================

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "PostgreSQL Authentication Fix Tool" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ArchiveHome = Split-Path -Parent $ScriptDir

$PGPath = "C:\Program Files\PostgreSQL\16"
$PGDataPath = Join-Path $ArchiveHome "data\database"
$PGHbaConf = Join-Path $PGDataPath "pg_hba.conf"
$PGHbaConfBackup = Join-Path $PGDataPath "pg_hba.conf.backup"

Write-Host "[Step 1/6] Checking current status..." -ForegroundColor Yellow
Write-Host ""

$PGService = Get-Service -Name PostgreSQL -ErrorAction SilentlyContinue
if (-not $PGService) {
    Write-Host "  ERROR: PostgreSQL service not found" -ForegroundColor Red
    Write-Host "  Please run install.ps1 first" -ForegroundColor Gray
    exit 1
}

Write-Host "  OK: PostgreSQL service status: $($PGService.Status)" -ForegroundColor Green

if (-not (Test-Path $PGHbaConf)) {
    Write-Host "  ERROR: pg_hba.conf not found: $PGHbaConf" -ForegroundColor Red
    exit 1
}

Write-Host "  OK: pg_hba.conf file exists" -ForegroundColor Green
Write-Host ""

Write-Host "  Testing database connection..." -ForegroundColor Gray

try {
    $testResult = & "$PGPath\bin\psql.exe" -U postgres -d archive_management -c "SELECT 1" 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  OK: Connection successful (trust auth)" -ForegroundColor Green
        $canConnect = $true
    }
} catch {
    Write-Host "  WARN: Connection failed (password auth required)" -ForegroundColor Yellow
    $canConnect = $false
}

$hbaContent = Get-Content $PGHbaConf -Raw
if ($hbaContent -match "scram-sha-256") {
    Write-Host "  Current auth: scram-sha-256" -ForegroundColor Yellow
} elseif ($hbaContent -match "trust") {
    Write-Host "  Current auth: trust" -ForegroundColor Green
}

Write-Host ""
Write-Host "[Step 2/6] Select fix method..." -ForegroundColor Yellow
Write-Host ""
Write-Host "Please select a fix method:" -ForegroundColor Cyan
Write-Host ""
Write-Host "  [1] Change to trust auth (Recommended)" -ForegroundColor White
Write-Host "  [2] Exit" -ForegroundColor White
Write-Host ""

$choice = Read-Host "Enter choice (1/2)"

if ($choice -eq "2") {
    Write-Host "Exit" -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "[Step 3/6] Backing up config file..." -ForegroundColor Yellow
Copy-Item $PGHbaConf $PGHbaConfBackup -Force
Write-Host "  OK: Backup created: $PGHbaConfBackup" -ForegroundColor Green
Write-Host ""

Write-Host "[Step 4/6] Modifying pg_hba.conf..." -ForegroundColor Yellow

# Check service status before stopping
$svc = Get-Service -Name PostgreSQL
$wasRunning = $false
if ($svc.Status -eq "Running") {
    $wasRunning = $true
    Write-Host "  Stopping PostgreSQL service..." -ForegroundColor Gray
    Stop-Service -Name PostgreSQL -Force
    Start-Sleep -Seconds 2
}

Write-Host "  Changing auth to trust..." -ForegroundColor Gray
$newHbaContent = $hbaContent -replace "scram-sha-256", "trust"
$newHbaContent = $newHbaContent -replace "md5", "trust"
$newHbaContent | Out-File -FilePath $PGHbaConf -Encoding UTF8 -NoNewline
Write-Host "  OK: pg_hba.conf modified" -ForegroundColor Green
Write-Host ""

Write-Host "[Step 5/6] Starting service..." -ForegroundColor Yellow

if ($wasRunning) {
    Start-Service -Name PostgreSQL
    Start-Sleep -Seconds 3
}

$svc = Get-Service -Name PostgreSQL
if ($svc.Status -eq "Running") {
    Write-Host "  OK: PostgreSQL service is running" -ForegroundColor Green
} else {
    Write-Host "  ERROR: PostgreSQL service is not running" -ForegroundColor Red
    Write-Host "  Try starting manually: Start-Service -Name PostgreSQL" -ForegroundColor Gray
    exit 1
}
Write-Host ""

Write-Host "[Step 6/6] Verifying fix..." -ForegroundColor Yellow
Write-Host ""

Write-Host "  Testing connection..." -ForegroundColor Gray
$testConn = & "$PGPath\bin\psql.exe" -U postgres -d archive_management -c "SELECT version();" 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "  OK: Connection successful" -ForegroundColor Green
} else {
    Write-Host "  ERROR: Connection failed" -ForegroundColor Red
    exit 1
}

Write-Host "  Checking admin user..." -ForegroundColor Gray
$checkUser = & "$PGPath\bin\psql.exe" -U postgres -d archive_management -t -c "SELECT username FROM \""User\"" WHERE username='admin'" 2>$null
$checkUser = $checkUser.Trim()

if ($checkUser -eq "admin") {
    Write-Host "  OK: admin user exists" -ForegroundColor Green
} else {
    Write-Host "  WARN: admin user not found" -ForegroundColor Yellow
    Write-Host "       Initializing data..." -ForegroundColor Gray
    
    $initSQL = Join-Path $ArchiveHome "init-data\init-database.sql"
    if (Test-Path $initSQL) {
        & "$PGPath\bin\psql.exe" -U postgres -d archive_management -f $initSQL 2>&1 | Out-Null
        Write-Host "  OK: Data initialized" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "Fix Complete!" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor White
Write-Host "  1. Restart application: cd $ArchiveHome\scripts && .\restart.bat" -ForegroundColor Gray
Write-Host "  2. Visit http://localhost:3000" -ForegroundColor Gray
Write-Host "  3. Login with: admin / admin123" -ForegroundColor Gray
Write-Host ""
