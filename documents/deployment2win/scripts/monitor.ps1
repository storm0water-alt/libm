# ============================================================================
# Archive Management System - Monitor Script
# ============================================================================
# Usage:
#   .\monitor.ps1 status          - View service status
#   .\monitor.ps1 start           - Start all services
#   .\monitor.ps1 start postgresql - Start PostgreSQL only
#   .\monitor.ps1 start meilisearch - Start Meilisearch only
#   .\monitor.ps1 start app       - Start Application only
#   .\monitor.ps1 stop            - Stop all services
#   .\monitor.ps1 stop postgresql - Stop PostgreSQL only
#   .\monitor.ps1 stop meilisearch - Stop Meilisearch only
#   .\monitor.ps1 stop app        - Stop Application only
#   .\monitor.ps1 restart         - Restart all services
#   .\monitor.ps1 restart postgresql - Restart PostgreSQL only
#   .\monitor.ps1 restart meilisearch - Restart Meilisearch only
#   .\monitor.ps1 restart app     - Restart Application only
#   .\monitor.ps1 logs            - View logs (default 50 lines)
#   .\monitor.ps1 logs --lines 100 - View 100 lines
#   .\monitor.ps1 health          - Health check
#   .\monitor.ps1 backup          - Database backup (keep 7 by default)
#   .\monitor.ps1 backup --keep 14 - Backup keeping 14 versions
#   .\monitor.ps1 install         - Run installation
#   .\monitor.ps1 help            - Show this help
# ============================================================================

$ErrorActionPreference = "Continue"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# Colors
$GREEN = "Green"
$RED = "Red"
$YELLOW = "Yellow"
$CYAN = "Cyan"
$GRAY = "Gray"

# Check if running from scripts directory
$ExpectedScriptPath = Join-Path $ScriptDir "monitor.ps1"
if ($MyInvocation.MyCommand.Path -ne $ExpectedScriptPath) {
    Write-Host "[WARNING] Please run this script from the scripts directory:" -ForegroundColor $YELLOW
    Write-Host "  cd $ScriptDir" -ForegroundColor $YELLOW
    Write-Host "  .\monitor.ps1 status" -ForegroundColor $YELLOW
    Write-Host ""
}

# Parse parameters manually
$Action = "status"
$Lines = 50
$Keep = 7
$Target = "all"

$Args = $MyInvocation.Line.Split(" ", [StringSplitOptions]::RemoveEmptyEntries)
for ($i = 0; $i -lt $Args.Length; $i++) {
    if ($Args[$i] -eq "--lines" -and $i + 1 -lt $Args.Length) {
        try {
            $Lines = [int]$Args[$i + 1]
        } catch {
        }
    }
    if ($Args[$i] -eq "--keep" -and $i + 1 -lt $Args.Length) {
        try {
            $Keep = [int]$Args[$i + 1]
        } catch {
        }
    }
    $ValidActions = @("status", "start", "stop", "restart", "logs", "health", "backup", "install", "help")
    if ($ValidActions -contains $Args[$i]) {
        $Action = $Args[$i]
    }
    $ValidTargets = @("all", "postgresql", "pg", "meilisearch", "ms", "app", "application")
    if ($ValidTargets -contains $Args[$i]) {
        $Target = $Args[$i]
    }
}

# Load configuration
function Get-ArchiveHome {
    $ConfigPath = Join-Path (Split-Path -Parent $ScriptDir) "config.ini"
    if (Test-Path $ConfigPath) {
        $Line = Select-String "ARCHIVE_HOME=" $ConfigPath | Select-Object -First 1
        if ($Line) {
            return $Line.Line.Split("=")[1].Trim()
        }
    }
    Write-Host "[ERROR] config.ini not found" -ForegroundColor $RED
    exit 1
}

$ARCHIVE_HOME = Get-ArchiveHome
$DATA_DIR = Join-Path $ARCHIVE_HOME "data"
$LOG_DIR = Join-Path $ARCHIVE_HOME "logs"
$BACKUP_DIR = Join-Path (Split-Path -Parent $ARCHIVE_HOME) "ArchiveBackups"

function Write-Title {
    param([string]$Text)
    Write-Host ""
    Write-Host ("=" * 60) -ForegroundColor $CYAN
    Write-Host $Text -ForegroundColor $CYAN
    Write-Host ("=" * 60) -ForegroundColor $CYAN
}

function Write-StatusItem {
    param([string]$Name, [string]$Status, [string]$Color = $GRAY)
    $Padding = " " * (20 - $Name.Length)
    Write-Host "  $Name`:$padding" -NoNewline -ForegroundColor $GRAY
    Write-Host $Status -ForegroundColor $Color
}

function Get-PortStatus {
    param([int]$Port)
    if (netstat -an | findstr ":$Port ") { return "LISTENING" }
    return "NOT LISTENING"
}

function Start-PostgreSQL {
    Write-Host "  Starting PostgreSQL..." -ForegroundColor $YELLOW
    net start PostgreSQL 2>&1 | Out-Null
    Start-Sleep -Seconds 3
    $PGStatus = Get-Service PostgreSQL -ErrorAction SilentlyContinue
    if ($PGStatus -and $PGStatus.Status -eq "Running") {
        Write-Host "    [OK] PostgreSQL started" -ForegroundColor $GREEN
    } else {
        Write-Host "    [FAILED] PostgreSQL failed to start" -ForegroundColor $RED
    }
}

function Start-Meilisearch {
    Write-Host "  Starting Meilisearch..." -ForegroundColor $YELLOW
    $MeiliPath = "C:\Program Files\Meilisearch\meilisearch.exe"
    if (Test-Path $MeiliPath) {
        $EnvPath = Join-Path $ARCHIVE_HOME "config\.env"
        if (Test-Path $EnvPath) {
            $MeiliKey = (Select-String "MEILISEARCH_MASTER_KEY=" $EnvPath | Select-Object -First 1).Line.Split("=")[1].Trim()
            $env:MEILISEARCH_MASTER_KEY = $MeiliKey
        } else {
            $MeiliKey = "master-key-not-found"
        }

        $MeiliLog = Join-Path $LOG_DIR "meilisearch.log"
        Stop-Process -Name meilisearch -ErrorAction SilentlyContinue | Out-Null
        Start-Sleep -Seconds 1

        $psi = New-Object System.Diagnostics.ProcessStartInfo
        $psi.FileName = $MeiliPath
        $psi.Arguments = "--master-key `"$MeiliKey`" --db-path `"$DATA_DIR\meilisearch`" --http-addr `"localhost:7700`""
        $psi.WindowStyle = "Hidden"
        $psi.CreateNoWindow = $true
        [System.Diagnostics.Process]::Start($psi) | Out-Null

        Start-Sleep -Seconds 5

        if ((Get-PortStatus 7700) -eq "LISTENING") {
            Write-Host "    [OK] Meilisearch started" -ForegroundColor $GREEN
        } else {
            Write-Host "    [FAILED] Meilisearch failed to start" -ForegroundColor $RED
            if (Test-Path $MeiliLog) {
                Get-Content $MeiliLog -Tail 10
            }
        }
    } else {
        Write-Host "    [FAILED] Meilisearch not found at $MeiliPath" -ForegroundColor $RED
    }
}

function Start-App {
    Write-Host "  Starting PM2 application..." -ForegroundColor $YELLOW
    $npmPath = Join-Path $env:APPDATA "npm\pm2.cmd"
    if (Test-Path $npmPath) {
        cd $ARCHIVE_HOME\app

        & $npmPath stop archive-management 2>&1 | Out-Null
        & $npmPath kill 2>&1 | Out-Null
        Start-Sleep -Seconds 2

        $EcosystemPath = Join-Path $ARCHIVE_HOME "app\ecosystem.config.js"
        if (Test-Path $EcosystemPath) {
            & $npmPath start $EcosystemPath 2>&1 | Out-Null
            Start-Sleep -Seconds 5

            $PM2List = & $npmPath jlist 2>&1 | Out-String
            if ($PM2List -match '"name":"archive-management"') {
                if ((Get-PortStatus 3000) -eq "LISTENING") {
                    Write-Host "    [OK] Application started (Port 3000)" -ForegroundColor $GREEN
                } else {
                    Write-Host "    [WARN] PM2 started but port 3000 not listening yet" -ForegroundColor $YELLOW
                }
            } else {
                Write-Host "    [WARN] Application may not have started properly" -ForegroundColor $YELLOW
                Write-Host "    Run 'pm2 logs archive-management' to check" -ForegroundColor $GRAY
            }
        } else {
            Write-Host "    [FAILED] ecosystem.config.js not found" -ForegroundColor $RED
        }
    } else {
        Write-Host "    [FAILED] PM2 not found" -ForegroundColor $RED
    }
}

function Start-Services {
    param([string]$Target = "all")
    Write-Title "Starting Services"

    if ($Target -eq "all" -or $Target -eq "postgresql" -or $Target -eq "pg") {
        Start-PostgreSQL
    }
    if ($Target -eq "all" -or $Target -eq "meilisearch" -or $Target -eq "ms") {
        Start-Meilisearch
    }
    if ($Target -eq "all" -or $Target -eq "app" -or $Target -eq "application") {
        Start-App
    }

    Write-Host ""
    Write-Host "Done. Run '.\monitor.ps1 status' to verify." -ForegroundColor $CYAN
    Write-Host ""
}

function Stop-PostgreSQL {
    Write-Host "  Stopping PostgreSQL..." -ForegroundColor $YELLOW
    net stop PostgreSQL 2>&1 | Out-Null
    Start-Sleep -Seconds 1
    $PGService = Get-Service PostgreSQL -ErrorAction SilentlyContinue
    if (-not $PGService -or $PGService.Status -ne "Running") {
        Write-Host "    [OK] PostgreSQL stopped" -ForegroundColor $GREEN
    } else {
        Write-Host "    [FAILED] PostgreSQL still running" -ForegroundColor $RED
    }
}

function Stop-Meilisearch {
    Write-Host "  Stopping Meilisearch..." -ForegroundColor $YELLOW
    Stop-Process -Name meilisearch -ErrorAction SilentlyContinue | Out-Null
    Start-Sleep -Seconds 1
    if (-not (Get-Process meilisearch -ErrorAction SilentlyContinue)) {
        Write-Host "    [OK] Meilisearch stopped" -ForegroundColor $GREEN
    } else {
        Write-Host "    [WARN] Meilisearch may still be running" -ForegroundColor $YELLOW
    }
}

function Stop-App {
    Write-Host "  Stopping PM2 application..." -ForegroundColor $YELLOW
    $npmPath = Join-Path $env:APPDATA "npm\pm2.cmd"
    if (Test-Path $npmPath) {
        & $npmPath stop archive-management 2>&1 | Out-Null
        & $npmPath kill 2>&1 | Out-Null
        Write-Host "    [OK] PM2 stopped" -ForegroundColor $GREEN
    } else {
        Stop-Process -Name node -ErrorAction SilentlyContinue | Out-Null
        Write-Host "    [OK] Node processes stopped" -ForegroundColor $GREEN
    }
}

function Stop-Services {
    param([string]$Target = "all")
    Write-Title "Stopping Services"

    if ($Target -eq "all" -or $Target -eq "postgresql" -or $Target -eq "pg") {
        Stop-PostgreSQL
    }
    if ($Target -eq "all" -or $Target -eq "meilisearch" -or $Target -eq "ms") {
        Stop-Meilisearch
    }
    if ($Target -eq "all" -or $Target -eq "app" -or $Target -eq "application") {
        Stop-App
    }

    Write-Host ""
    Write-Host "Done." -ForegroundColor $CYAN
    Write-Host ""
}

function Get-ServiceStatus {
    Write-Title "Archive Management System - Service Status"

    $PGService = Get-Service PostgreSQL -ErrorAction SilentlyContinue
    $PGPort = Get-PortStatus 5432
    if ($PGService.Status -eq "Running") {
        Write-StatusItem "PostgreSQL" "Running (Port: $PGPort)" $GREEN
    } else {
        Write-StatusItem "PostgreSQL" "Stopped (Port: $PGPort)" $RED
    }

    $MeiliPort = Get-PortStatus 7700
    if (Get-Process meilisearch -ErrorAction SilentlyContinue) {
        Write-StatusItem "Meilisearch" "Running (Port: $MeiliPort)" $GREEN
    } else {
        Write-StatusItem "Meilisearch" "Not Running (Port: $MeiliPort)" $RED
    }

    # Check PM2 status
    $npmPath = Join-Path $env:APPDATA "npm\pm2.cmd"
    $AppRunning = $false
    if (Test-Path $npmPath) {
        cd $ARCHIVE_HOME\app
        $PM2List = & $npmPath jlist 2>&1 | Out-String
        if ($PM2List -match '"name":"archive-management"') {
            $AppRunning = $true
        }
    }
    
    $AppPort = Get-PortStatus 3000
    if ($AppRunning -and $AppPort -eq "LISTENING") {
        Write-StatusItem "Application" "Running (Port: $AppPort)" $GREEN
    } elseif ($AppRunning) {
        Write-StatusItem "Application" "PM2 running, port not listening yet" $YELLOW
    } else {
        Write-StatusItem "Application" "Not Running (Port: $AppPort)" $RED
    }

    # Disk usage
    Write-Host ""
    Write-Host "  Disk Usage:" -ForegroundColor $GRAY
    $Drive = (Get-Item $ARCHIVE_HOME).Root.Name
    try {
        $Disk = Get-PSDrive $Drive.Trim(":") -ErrorAction Stop | Select-Object Used, Free
        $TotalGB = [math]::Round(($Disk.Used + $Disk.Free) / 1GB, 2)
        $UsedGB = [math]::Round($Disk.Used / 1GB, 2)
        Write-Host "    $Drive`: $UsedGB GB / $TotalGB GB used" -ForegroundColor $GRAY
    } catch {
        Write-Host "    $Drive`: Unable to get disk info" -ForegroundColor $YELLOW
    }

    # Data Directories
    Write-Host ""
    Write-Host "  Data Directories:" -ForegroundColor $GRAY
    $ArchivesCount = (Get-ChildItem $DATA_DIR\archives -ErrorAction SilentlyContinue | Measure-Object).Count
    $BackupsCount = (Get-ChildItem $BACKUP_DIR\*.sql -ErrorAction SilentlyContinue | Measure-Object).Count
    Write-Host "    Archives: $ArchivesCount files" -ForegroundColor $GRAY
    Write-Host "    Backups: $BackupsCount files" -ForegroundColor $GRAY

    Write-Host ""
    Write-Host "  Commands:" -ForegroundColor $GRAY
    Write-Host "    pm2 status           - View PM2 processes" -ForegroundColor $GRAY
    Write-Host "    pm2 logs archive    - View application logs" -ForegroundColor $GRAY
    Write-Host ""

    # Quick start/stop buttons
    Write-Host "  Quick Actions:" -ForegroundColor $GRAY
    Write-Host "    .\monitor.ps1 start   - Start all services" -ForegroundColor $CYAN
    Write-Host "    .\monitor.ps1 stop    - Stop all services" -ForegroundColor $CYAN
    Write-Host "    .\monitor.ps1 restart - Restart all services" -ForegroundColor $CYAN
    Write-Host "    .\monitor.ps1 health  - Health check" -ForegroundColor $CYAN
    Write-Host ""
}

function Show-Logs {
    Write-Title "Application Logs (Last $Lines lines)"
    $npmPath = Join-Path $env:APPDATA "npm\pm2.cmd"
    if (Test-Path $npmPath) {
        cd $ARCHIVE_HOME\app
        & $npmPath logs archive-management --lines $Lines --nostream
    } else {
        Write-Host "PM2 not found" -ForegroundColor $RED
    }
    Write-Host ""
}

function Test-Health {
    Write-Title "Health Check"
    $Issues = @()

    $PGService = Get-Service PostgreSQL -ErrorAction SilentlyContinue
    if ($PGService.Status -ne "Running") {
        $Issues += "PostgreSQL not running"
        Write-StatusItem "PostgreSQL" "FAILED" $RED
    } else {
        Write-StatusItem "PostgreSQL" "OK" $GREEN
    }

    if ((Get-PortStatus 7700) -ne "LISTENING") {
        $Issues += "Meilisearch not listening on port 7700"
        Write-StatusItem "Meilisearch" "FAILED" $RED
    } else {
        Write-StatusItem "Meilisearch" "OK" $GREEN
    }

    # Check PM2
    $npmPath = Join-Path $env:APPDATA "npm\pm2.cmd"
    $AppOK = $false
    if (Test-Path $npmPath) {
        cd $ARCHIVE_HOME\app
        $PM2List = & $npmPath jlist 2>&1 | Out-String
        if ($PM2List -match '"name":"archive-management"' -and (Get-PortStatus 3000) -eq "LISTENING") {
            $AppOK = $true
        }
    }
    
    if (-not $AppOK) {
        $Issues += "Application not running (check PM2)"
        Write-StatusItem "Application" "FAILED" $RED
    } else {
        Write-StatusItem "Application" "OK" $GREEN
    }

    # Check database connection
    try {
        $PGPath = "C:\Program Files\PostgreSQL\16\bin\psql.exe"
        if (Test-Path $PGPath) {
            $EnvPath = Join-Path $ARCHIVE_HOME "config\.env"
            if (Test-Path $EnvPath) {
                $DBPass = (Select-String "POSTGRES_PASSWORD=" $EnvPath | Select-Object -First 1).Line.Split("=")[1].Trim()
                $env:PGPASSWORD = $DBPass
                $Result = & $PGPath -U postgres -d archive_management -c "SELECT 1;" 2>&1 | Out-String
                if ($Result -match "1 row") {
                    Write-StatusItem "Database" "OK" $GREEN
                } else {
                    Write-StatusItem "Database" "Connection test failed" $YELLOW
                }
            } else {
                Write-StatusItem "Database" ".env file not found" $YELLOW
            }
        }
    } catch {
        Write-StatusItem "Database" "Could not test" $YELLOW
    }

    Write-Host ""
    if ($Issues.Count -eq 0) {
        Write-Host "All health checks passed!" -ForegroundColor $GREEN
        Write-Host ""
    } else {
        Write-Host "Found $($Issues.Count) issue(s):" -ForegroundColor $RED
        $Issues | ForEach-Object { Write-Host "  - $_" -ForegroundColor $YELLOW }
        Write-Host ""
        Write-Host "Troubleshooting:" -ForegroundColor $CYAN
        Write-Host "  pm2 logs archive-management  - View application logs" -ForegroundColor $GRAY
        Write-Host "  pm2 restart archive-management - Restart application" -ForegroundColor $GRAY
        Write-Host ""
    }
}

function Invoke-Backup {
    Write-Title "Database Backup (Keep last $Keep versions)"

    if (-not (Test-Path $BACKUP_DIR)) {
        New-Item -ItemType Directory -Path $BACKUP_DIR -Force | Out-Null
    }

    $Timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $BackupFile = Join-Path $BACKUP_DIR "backup-$Timestamp.sql"

    $PGPath = "C:\Program Files\PostgreSQL\16\bin\pg_dump.exe"
    $EnvPath = Join-Path $ARCHIVE_HOME "config\.env"
    $DBPass = (Select-String "POSTGRES_PASSWORD=" $EnvPath | Select-Object -First 1).Line.Split("=")[1].Trim()
    $env:PGPASSWORD = $DBPass
    & $PGPath -U postgres -d archive_management -f $BackupFile 2>&1

    if (Test-Path $BackupFile) {
        $Size = (Get-Item $BackupFile).Length / 1KB
        Write-Host "  Backup complete: $([math]::Round($Size, 2)) KB" -ForegroundColor $GREEN

        $OldBackups = Get-ChildItem $BACKUP_DIR -Filter "backup-*.sql" | Sort-Object LastWriteTime -Descending | Select-Object -Skip $Keep
        $OldBackups | Remove-Item -Force -ErrorAction SilentlyContinue
        Write-Host "  Cleaned $($OldBackups.Count) old backup(s)" -ForegroundColor $GRAY
    } else {
        Write-Host "  Backup failed!" -ForegroundColor $RED
    }
    Write-Host ""
    Write-Host "Backup location: $BACKUP_DIR" -ForegroundColor $CYAN
    Write-Host ""
}

function Show-Help {
    Write-Host @"
===============================================================================
Archive Management System - Monitor Script
===============================================================================
Usage: .\monitor.ps1 <command> [target] [options]

Commands:
  status              Show service status
  start               Start all services
  start postgresql    Start PostgreSQL only
  start meilisearch   Start Meilisearch only (alias: ms)
  start app           Start Application only (alias: application)
  stop                Stop all services
  stop postgresql     Stop PostgreSQL only (alias: pg)
  stop meilisearch    Stop Meilisearch only (alias: ms)
  stop app            Stop Application only (alias: application)
  restart             Restart all services
  restart postgresql  Restart PostgreSQL only
  restart meilisearch Restart Meilisearch only
  restart app         Restart Application only
  logs                View logs (default 50 lines)
  logs --lines 100    View 100 lines
  health              Health check
  backup              Database backup (keep 7 by default)
  backup --keep 14    Keep 14 versions
  install             Run installation
  help                Show this help

Examples:
  cd C:\ArchiveManagement\scripts
  .\monitor.ps1 status        - View service status
  .\monitor.ps1 start         - Start all services
  .\monitor.ps1 start app     - Start application only
  .\monitor.ps1 stop postgresql - Stop PostgreSQL only
  .\monitor.ps1 restart       - Restart all services
  .\monitor.ps1 restart app   - Restart application only
  .\monitor.ps1 health        - Health check
  .\monitor.ps1 logs --lines 100 - View 100 log lines
  .\monitor.ps1 backup --keep 14 - Backup keeping 14 versions

Service Aliases:
  postgresql, pg  - PostgreSQL service
  meilisearch, ms - Meilisearch service
  app, application - Next.js application (PM2)

Troubleshooting:
  pm2 status                  - View PM2 processes
  pm2 logs archive-management - View application logs
  pm2 restart archive-management - Restart application
  pm2 monit                   - Monitor processes

===============================================================================
"@ -ForegroundColor $CYAN
}

# Main switch
switch ($Action.ToLower()) {
    "status"   { Get-ServiceStatus }
    "start"    { Start-Services -Target $Target }
    "stop"     { Stop-Services -Target $Target }
    "restart"  { Stop-Services -Target $Target; Start-Services -Target $Target }
    "logs"     { Show-Logs }
    "health"   { Test-Health }
    "backup"   { Invoke-Backup }
    "install"  { & "$ScriptDir\install.ps1" }
    "help"     { Show-Help }
    default    { Write-Host "Unknown action: $Action" -ForegroundColor $RED; Show-Help }
}
