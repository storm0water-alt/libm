# Archive Management System - Installation Script (PowerShell)

$ErrorActionPreference = "Stop"

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "Archive Management System - Installation" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Get script directory
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$InstallPath = Split-Path -Parent $ScriptDir
$PackagesPath = Join-Path $InstallPath "packages"

# Ensure packages directory exists
if (-not (Test-Path $PackagesPath)) {
    New-Item -ItemType Directory -Path $PackagesPath -Force | Out-Null
}

# Step 0: Select installation drive
Write-Host "[0/8] Select installation drive..." -ForegroundColor Yellow
Write-Host ""
Write-Host "Available drives:" -ForegroundColor Gray

# Get available drives
$Drives = Get-PSDrive -PSProvider FileSystem | Select-Object -ExpandProperty Name
foreach ($Drive in $Drives) {
    Write-Host "  $Drive`:" -ForegroundColor Gray
}
Write-Host ""

$InstallDrive = Read-Host "Enter installation drive (e.g. D)"
if ([string]::IsNullOrWhiteSpace($InstallDrive)) {
    $InstallDrive = "D"
}
$ArchiveHome = "${InstallDrive}:\ArchiveManagement"
Write-Host "  - Installation path: $ArchiveHome" -ForegroundColor Green

# Step 1: Check installation packages
Write-Host ""
Write-Host "[1/8] Checking installation packages..." -ForegroundColor Yellow

$Missing = $false
$PGExe = Get-ChildItem -Path $PackagesPath -Filter "postgresql-*-windows-x64.exe" -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $PGExe) {
    Write-Host "  - PostgreSQL: NOT FOUND" -ForegroundColor Red
    $Missing = $true
}
$NodeExe = Get-ChildItem -Path $PackagesPath -Filter "nodejs-*-x64.msi" -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $NodeExe) {
    Write-Host "  - Node.js: NOT FOUND" -ForegroundColor Red
    $Missing = $true
}
$MeiliExe = Get-ChildItem -Path $PackagesPath -Filter "meilisearch-windows-amd64.exe" -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $MeiliExe) {
    Write-Host "  - Meilisearch: NOT FOUND" -ForegroundColor Red
    $Missing = $true
}

if ($Missing) {
    Write-Host ""
    Write-Host "Please place the following files in $PackagesPath :" -ForegroundColor Yellow
    Write-Host "  - postgresql-16.11-2-windows-x64.exe"
    Write-Host "  - nodejs-v22.22.0-x64.msi"
    Write-Host "  - meilisearch-windows-amd64.exe"
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host "  - All packages ready" -ForegroundColor Green

# Step 2: Create directory structure
Write-Host ""
Write-Host "[2/8] Creating directory structure..." -ForegroundColor Yellow

$Dirs = @(
    (Join-Path $ArchiveHome "data\database"),
    (Join-Path $ArchiveHome "data\archives"),
    (Join-Path $ArchiveHome "data\meilisearch"),
    (Join-Path $ArchiveHome "logs"),
    (Join-Path $ArchiveHome "config"),
    (Join-Path $ArchiveHome "scripts"),
    (Join-Path $ArchiveHome "services"),
    (Join-Path $ArchiveHome "init-data"),
    (Join-Path $ArchiveHome "packages")
)

foreach ($Dir in $Dirs) {
    if (-not (Test-Path $Dir)) {
        New-Item -ItemType Directory -Path $Dir -Force | Out-Null
    }
}
Write-Host "  - Directory structure created" -ForegroundColor Green

# Step 3: Generate installation configuration
Write-Host ""
Write-Host "[3/8] Generating installation configuration..." -ForegroundColor Yellow

$Timestamp = Get-Date -Format "yyyyMMddHHmmss"
$PGPass = "pg_$Timestamp"
$MeiliKey = "meili_$Timestamp"
$AuthKey = "auth_$Timestamp"

# Generate config.ini
$ConfigIni = @"
ARCHIVE_HOME=$ArchiveHome
PG_DATA_DIR=$ArchiveHome\data\database
MEILI_DATA_DIR=$ArchiveHome\data\meilisearch
"@
$ConfigIniPath = Join-Path $InstallPath "config.ini"
$ConfigIni | Out-File -FilePath $ConfigIniPath -Encoding UTF8

# Generate .env file
$EnvTemplatePath = Join-Path $InstallPath "config\.env.template"
$EnvPath = Join-Path $InstallPath "config\.env"
$EnvContent = Get-Content -Path $EnvTemplatePath -Raw
$EnvContent = $EnvContent.Replace("CHANGE_ME_PASSWORD", $PGPass)
$EnvContent = $EnvContent.Replace("CHANGE_ME_KEY", $MeiliKey)
$EnvContent = $EnvContent.Replace("CHANGE_ME_SECRET", $AuthKey)
$EnvContent = $EnvContent.Replace("%ARCHIVE_HOME%", $ArchiveHome)
$EnvContent | Out-File -FilePath $EnvPath -Encoding UTF8

Write-Host "  - config.ini generated" -ForegroundColor Green
Write-Host "  - .env generated" -ForegroundColor Green
Write-Host "  - Password: $PGPass" -ForegroundColor Gray

# Step 4: Install PostgreSQL
Write-Host ""
Write-Host "[4/8] Installing PostgreSQL (C:\Program Files\PostgreSQL\16)..." -ForegroundColor Yellow

$PGInstallArgs = @(
    "--mode", "unattended",
    "--superpassword", $PGPass,
    "--servicename", "PostgreSQL",
    "--servicepassword", $PGPass,
    "--datadir", "$ArchiveHome\data\database"
)
Start-Process -FilePath $PGExe.FullName -ArgumentList $PGInstallArgs -Wait -NoNewWindow

# Verify PostgreSQL installation
$PGService = Get-Service -Name "PostgreSQL" -ErrorAction SilentlyContinue
if ($PGService -and $PGService.Status -eq "Running") {
    Write-Host "  - PostgreSQL installed" -ForegroundColor Green
} else {
    Write-Host "  - PostgreSQL installation failed or service not running" -ForegroundColor Red
    Write-Host "  Please check the installation manually" -ForegroundColor Yellow
}

# Step 5: Install Node.js
Write-Host ""
Write-Host "[5/8] Installing Node.js (C:\Program Files\nodejs)..." -ForegroundColor Yellow

$NodeArgs = @("/i", $NodeExe.FullName, "/quiet", "/norestart")
Start-Process -FilePath "msiexec.exe" -ArgumentList $NodeArgs -Wait -NoNewWindow

# Verify Node.js installation
$NodePath = "C:\Program Files\nodejs\node.exe"
if (Test-Path $NodePath) {
    Write-Host "  - Node.js installed" -ForegroundColor Green
} else {
    Write-Host "  - Node.js installation failed" -ForegroundColor Red
    exit 1
}

# Step 6: Install PM2
Write-Host ""
Write-Host "[6/8] Installing PM2..." -ForegroundColor Yellow

$npmPath = "C:\Program Files\nodejs\npm.cmd"
$pm2Path = "C:\Program Files\nodejs\pm2.cmd"

if (-not (Test-Path $pm2Path)) {
    & "$npmPath" config set loglevel error 2>&1 | Out-Null
    & "$npmPath" install -g pm2 2>&1 | Out-Null
}
Write-Host "  - PM2 installed" -ForegroundColor Green

# Step 7: Install Meilisearch
Write-Host ""
Write-Host "[7/8] Installing Meilisearch (C:\Program Files\Meilisearch)..." -ForegroundColor Yellow

$MeiliDir = "C:\Program Files\Meilisearch"
if (-not (Test-Path $MeiliDir)) {
    New-Item -ItemType Directory -Path $MeiliDir -Force | Out-Null
}
Copy-Item -Path $MeiliExe.FullName -Destination (Join-Path $MeiliDir "meilisearch.exe") -Force

# Verify Meilisearch installation
$MeiliPath = Join-Path $MeiliDir "meilisearch.exe"
if (Test-Path $MeiliPath) {
    Write-Host "  - Meilisearch installed" -ForegroundColor Green
} else {
    Write-Host "  - Meilisearch installation failed" -ForegroundColor Red
    exit 1
}

# Step 8: Copy application configuration to installation directory
Write-Host ""
Write-Host "[8/8] Copying application configuration..." -ForegroundColor Yellow

if ($InstallPath -ne $ArchiveHome) {
    $ConfigDir = Join-Path $InstallPath "config"
    $ScriptsDir = Join-Path $InstallPath "scripts"
    $ServicesDir = Join-Path $InstallPath "services"
    $InitDataDir = Join-Path $InstallPath "init-data"

    Copy-Item -Path "$ConfigDir\*" -Destination (Join-Path $ArchiveHome "config") -Recurse -Force
    Copy-Item -Path "$ScriptsDir\*.bat" -Destination (Join-Path $ArchiveHome "scripts") -Force
    Copy-Item -Path "$ScriptsDir\*.ps1" -Destination (Join-Path $ArchiveHome "scripts") -Force
    Copy-Item -Path "$ServicesDir\*.json" -Destination (Join-Path $ArchiveHome "services") -Force
    Copy-Item -Path "$InitDataDir\*.sql" -Destination (Join-Path $ArchiveHome "init-data") -Force
    Write-Host "  - Configuration copied to $ArchiveHome" -ForegroundColor Green
} else {
    Write-Host "  - Installation path same as source, skipping copy" -ForegroundColor Gray
}

# Completion
Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "Installation Complete!" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Installation path: $ArchiveHome" -ForegroundColor Gray
Write-Host "Default account: admin / admin123" -ForegroundColor Gray
Write-Host "Application: http://localhost:3000" -ForegroundColor Gray
Write-Host "Search service: http://localhost:7700" -ForegroundColor Gray
Write-Host ""
Write-Host "Please run $ArchiveHome\scripts\start.bat to start services" -ForegroundColor Yellow
Write-Host ""
