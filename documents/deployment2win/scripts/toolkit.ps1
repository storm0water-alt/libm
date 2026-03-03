# ============================================================================
# Archive Management System - Operation Toolkit
# ============================================================================

$ErrorActionPreference = "Continue"

# Colors
$Cyan = "Cyan"
$Green = "Green"
$Red = "Red"
$Yellow = "Yellow"
$Gray = "Gray"

# ============================================================================
# Helper Functions
# ============================================================================

function Get-ArchiveHome {
    # Use $PSScriptRoot which is more reliable
    if ($PSScriptRoot) {
        $scriptPath = $PSScriptRoot
    } elseif ($MyInvocation.MyCommand.Path) {
        $scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
    } else {
        # Fallback to default
        return "C:\ArchiveManagement"
    }

    $archiveHome = Split-Path -Parent $scriptPath

    $configPath = Join-Path $archiveHome "config.ini"
    if ($configPath -and (Test-Path $configPath)) {
        $line = Select-String "ARCHIVE_HOME=" $configPath | Select-Object -First 1
        if ($line) {
            return $line.Line.Split("=")[1].Trim()
        }
    }

    # Try to find from registry or default
    return "C:\ArchiveManagement"
}

function Get-PortStatus {
    param([int]$Port)
    $result = netstat -an | Select-String ":$Port "
    if ($result -match "LISTENING") { return "LISTENING" }
    return "NOT LISTENING"
}

function Write-Menu {
    param([string]$Title, [array]$Items)
    $width = 50
    Write-Host ""
    Write-Host ("=" * $width) -ForegroundColor $Cyan
    Write-Host $Title -ForegroundColor $Cyan
    Write-Host ("=" * $width) -ForegroundColor $Cyan
    Write-Host ""

    $i = 1
    foreach ($item in $Items) {
        Write-Host "  $i. $($item.text)" -ForegroundColor Gray
        $i++
    }
    Write-Host ""
}

# ============================================================================
# Service Control Functions
# ============================================================================

function Start-PostgreSQL {
    Write-Host "Starting PostgreSQL..." -ForegroundColor $Yellow

    $service = Get-Service -Name PostgreSQL -ErrorAction SilentlyContinue
    if ($service.Status -eq "Running") {
        Write-Host "  [OK] Already running" -ForegroundColor $Green
        return
    }

    try {
        Start-Service -Name PostgreSQL -ErrorAction Stop
        Start-Sleep -Seconds 5

        $service = Get-Service -Name PostgreSQL
        if ($service.Status -eq "Running") {
            Write-Host "  [OK] Started successfully" -ForegroundColor $Green
        } else {
            Write-Host "  [ERROR] Service not running" -ForegroundColor $Red
        }
    } catch {
        Write-Host "  [ERROR] Failed to start: $_" -ForegroundColor $Red
    }
}

function Stop-PostgreSQL {
    Write-Host "Stopping PostgreSQL..." -ForegroundColor $Yellow

    $service = Get-Service -Name PostgreSQL -ErrorAction SilentlyContinue
    if (-not $service -or $service.Status -ne "Running") {
        Write-Host "  [OK] Already stopped" -ForegroundColor $Green
        return
    }

    try {
        Stop-Service -Name PostgreSQL -ErrorAction Stop
        Start-Sleep -Seconds 2
        Write-Host "  [OK] Stopped" -ForegroundColor $Green
    } catch {
        Write-Host "  [ERROR] Failed: $_" -ForegroundColor $Red
    }
}

function Start-Meilisearch {
    Write-Host "Starting Meilisearch..." -ForegroundColor $Yellow

    # Check if running as service
    $service = Get-Service -Name Meilisearch -ErrorAction SilentlyContinue
    if ($service -and $service.Status -eq "Running") {
        Write-Host "  [OK] Already running (service)" -ForegroundColor $Green
        return
    }

    # Check if running as process
    if (Get-Process -Name meilisearch -ErrorAction SilentlyContinue) {
        Write-Host "  [OK] Already running (process)" -ForegroundColor $Green
        return
    }

    # Start as process
    $ARCHIVE_HOME = Get-ArchiveHome
    $meiliPath = "C:\Program Files\Meilisearch\meilisearch.exe"
    $envPath = Join-Path $ARCHIVE_HOME "config\.env"

    if (Test-Path $envPath) {
        $key = (Select-String "MEILI_MASTER_KEY=" $envPath | Select-Object -First 1).Line.Split("=")[1].Trim()

        $args = "--master-key=$key --db-path=$ARCHIVE_HOME\data\meilisearch --http-addr=localhost:7700"
        Start-Process -FilePath $meiliPath -ArgumentList $args -WindowStyle Hidden

        Start-Sleep -Seconds 5

        if ((Get-PortStatus 7700) -eq "LISTENING") {
            Write-Host "  [OK] Started successfully" -ForegroundColor $Green
        } else {
            Write-Host "  [WARNING] May not be ready yet" -ForegroundColor $Yellow
        }
    } else {
        Write-Host "  [ERROR] Configuration not found" -ForegroundColor $Red
    }
}

function Stop-Meilisearch {
    Write-Host "Stopping Meilisearch..." -ForegroundColor $Yellow

    # Stop service
    $service = Get-Service -Name Meilisearch -ErrorAction SilentlyContinue
    if ($service -and $service.Status -eq "Running") {
        Stop-Service -Name Meilisearch -ErrorAction SilentlyContinue
    }

    # Stop process
    Stop-Process -Name meilisearch -Force -ErrorAction SilentlyContinue

    Start-Sleep -Seconds 2
    Write-Host "  [OK] Stopped" -ForegroundColor $Green
}

function Start-App {
    Write-Host "Starting Application..." -ForegroundColor $Yellow

    $ARCHIVE_HOME = Get-ArchiveHome
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
        Write-Host "  [OK] Started successfully" -ForegroundColor $Green
    } else {
        Write-Host "  [WARNING] May not be ready yet" -ForegroundColor $Yellow
    }
}

function Stop-App {
    Write-Host "Stopping Application..." -ForegroundColor $Yellow

    $pm2Path = "$env:APPDATA\npm\pm2.cmd"

    if (Test-Path $pm2Path) {
        & $pm2Path stop archive-management 2>$null
        & $pm2Path delete archive-management 2>$null
    }

    # Also kill node processes
    Stop-Process -Name node -Force -ErrorAction SilentlyContinue

    Write-Host "  [OK] Stopped" -ForegroundColor $Green
}

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
    $msPort = Get-PortStatus 7700
    $msProcess = Get-Process -Name meilisearch -ErrorAction SilentlyContinue
    if ($msPort -eq "LISTENING") {
        Write-Host "  Meilisearch: Running (Port: $msPort)" -ForegroundColor $Green
    } elseif ($msProcess) {
        Write-Host "  Meilisearch: Running (no port)" -ForegroundColor $Yellow
    } else {
        Write-Host "  Meilisearch: Stopped (Port: $msPort)" -ForegroundColor $Red
    }

    # Application
    $appPort = Get-PortStatus 3000
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
        Write-Host "  Application: Running (Port: $appPort)" -ForegroundColor $Green
    } elseif ($appRunning) {
        Write-Host "  Application: PM2 running, port not ready" -ForegroundColor $Yellow
    } else {
        Write-Host "  Application: Stopped (Port: $appPort)" -ForegroundColor $Red
    }

    Write-Host ""
}

function Show-Health {
    Write-Host ""
    Write-Host ("=" * 60) -ForegroundColor $Cyan
    Write-Host "Health Check" -ForegroundColor $Cyan
    Write-Host ("=" * 60) -ForegroundColor $Cyan
    Write-Host ""

    $issues = 0

    # PostgreSQL
    $pg = Get-Service -Name PostgreSQL -ErrorAction SilentlyContinue
    if ($pg.Status -eq "Running") {
        Write-Host "  [OK] PostgreSQL" -ForegroundColor $Green
    } else {
        Write-Host "  [FAIL] PostgreSQL not running" -ForegroundColor $Red
        $issues++
    }

    # Meilisearch
    try {
        $resp = Invoke-WebRequest -Uri "http://localhost:7700/health" -Method Get -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop
        if ($resp.StatusCode -eq 200) {
            Write-Host "  [OK] Meilisearch" -ForegroundColor $Green
        }
    } catch {
        Write-Host "  [FAIL] Meilisearch health check failed" -ForegroundColor $Red
        $issues++
    }

    # Application
    if ((Get-PortStatus 3000) -eq "LISTENING") {
        Write-Host "  [OK] Application" -ForegroundColor $Green
    } else {
        Write-Host "  [FAIL] Application not responding" -ForegroundColor $Red
        $issues++
    }

    Write-Host ""

    if ($issues -eq 0) {
        Write-Host "All services healthy!" -ForegroundColor $Green
    } else {
        Write-Host "Found $issues issue(s)" -ForegroundColor $Red
    }
    Write-Host ""
}

function Show-Logs {
    Write-Host "Application Logs (last 50 lines):" -ForegroundColor $Cyan
    Write-Host ""

    $pm2Path = "$env:APPDATA\npm\pm2.cmd"

    if (Test-Path $pm2Path) {
        & $pm2Path logs archive-management --lines 50 --nostream
    } else {
        Write-Host "PM2 not found" -ForegroundColor $Red
    }

    Write-Host ""
}

function Invoke-Backup {
    Write-Host "Database Backup..." -ForegroundColor $Cyan
    Write-Host ""

    $ARCHIVE_HOME = Get-ArchiveHome
    $backupDir = Join-Path (Split-Path -Parent $ARCHIVE_HOME) "ArchiveBackups"

    if (-not (Test-Path $backupDir)) {
        New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
    }

    $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $backupFile = Join-Path $backupDir "backup-$timestamp.sql"

    $pgPath = "C:\Program Files\PostgreSQL\16\bin\pg_dump.exe"
    $envPath = Join-Path $ARCHIVE_HOME "config\.env"
    $dbPass = (Select-String "POSTGRES_PASSWORD=" $envPath | Select-Object -First 1).Line.Split("=")[1].Trim()

    $env:PGPASSWORD = $dbPass

    & $pgPath -U postgres -d archive_management -f $backupFile 2>$null

    if (Test-Path $backupFile) {
        $size = (Get-Item $backupFile).Length / 1KB
        Write-Host "  [OK] Backup saved: $([math]::Round($size, 2)) KB" -ForegroundColor $Green
        Write-Host "  Location: $backupFile" -ForegroundColor $Gray
    } else {
        Write-Host "  [ERROR] Backup failed" -ForegroundColor $Red
    }

    Write-Host ""
}

function Reset-AdminPassword {
    param(
        [string]$Password = "admin123"
    )

    Write-Host ""
    Write-Host ("=" * 60) -ForegroundColor $Cyan
    Write-Host "Admin Password Reset" -ForegroundColor $Cyan
    Write-Host ("=" * 60) -ForegroundColor $Cyan
    Write-Host ""

    $ARCHIVE_HOME = Get-ArchiveHome

    # Find PostgreSQL
    $pgPaths = @(
        "C:\Program Files\PostgreSQL\16\bin",
        "C:\Program Files\PostgreSQL\15\bin",
        "C:\Program Files\PostgreSQL\14\bin"
    )

    $psqlPath = $null
    foreach ($path in $pgPaths) {
        if (Test-Path "$path\psql.exe") {
            $psqlPath = $path
            break
        }
    }

    if (-not $psqlPath) {
        $psqlInPath = Get-Command psql -ErrorAction SilentlyContinue
        if ($psqlInPath) {
            $psqlPath = Split-Path $psqlInPath.Source
        }
    }

    if (-not $psqlPath) {
        Write-Host "  [ERROR] PostgreSQL not found" -ForegroundColor $Red
        return
    }

    Write-Host "  PostgreSQL: $psqlPath" -ForegroundColor $Gray

    # Find Node.js
    $nodePath = Get-Command node -ErrorAction SilentlyContinue
    if (-not $nodePath) {
        Write-Host "  [ERROR] Node.js not found" -ForegroundColor $Red
        return
    }

    Write-Host "  Node.js: $($nodePath.Source)" -ForegroundColor $Gray

    # Find bcryptjs module
    $bcryptPaths = @(
        "$ARCHIVE_HOME\app\node_modules\bcryptjs",
        "C:\ArchiveManagement\app\node_modules\bcryptjs"
    )

    $bcryptPath = $null
    foreach ($path in $bcryptPaths) {
        if (Test-Path $path) {
            $bcryptPath = $path
            break
        }
    }

    if (-not $bcryptPath) {
        Write-Host ""
        Write-Host "  [ERROR] bcryptjs module not found" -ForegroundColor $Red
        Write-Host "  Looking for: $ARCHIVE_HOME\app\node_modules\bcryptjs" -ForegroundColor $Gray
        Write-Host ""
        Write-Host "  Please run: cd $ARCHIVE_HOME\app && npm install bcryptjs" -ForegroundColor $Yellow
        return
    }

    # Generate password hash
    Write-Host ""
    Write-Host "  Generating password hash..." -ForegroundColor $Yellow

    $hashScript = "const bcrypt = require('$bcryptPath'); console.log(bcrypt.hashSync('$Password', 10));"
    $hash = $hashScript | & $($nodePath.Source) - 2>&1

    if ($LASTEXITCODE -ne 0) {
        Write-Host "  [ERROR] Failed to generate hash: $hash" -ForegroundColor $Red
        return
    }

    $hash = $hash.Trim()
    Write-Host "  Hash: $($hash.Substring(0, 20))..." -ForegroundColor $Gray

    # Update password in database
    Write-Host ""
    Write-Host "  Updating password in database..." -ForegroundColor $Yellow

    $updateSql = "UPDATE \""User\"" SET password = '$hash' WHERE username = 'admin';"

    # Set environment for passwordless connection
    $env:PGHOST = "localhost"
    $env:PGPORT = "5432"
    $env:PGDATABASE = "archive_management"
    $env:PGUSER = "postgres"

    $result = & "$psqlPath\psql.exe" -c $updateSql 2>&1

    if ($LASTEXITCODE -ne 0) {
        Write-Host "  [ERROR] Database update failed" -ForegroundColor $Red
        Write-Host "  $result" -ForegroundColor $Gray
        Write-Host ""
        Write-Host "  Try running: .\fix-postgres-auth.ps1" -ForegroundColor $Yellow
        return
    }

    # Verify
    Write-Host "  Verifying admin user..." -ForegroundColor $Yellow

    $verifySql = "SELECT username, role, status FROM \""User\"" WHERE username='admin';"
    $verifyResult = & "$psqlPath\psql.exe" -c $verifySql 2>&1

    Write-Host ""
    Write-Host ("=" * 60) -ForegroundColor $Green
    Write-Host "  Password Reset Successful!" -ForegroundColor $Green
    Write-Host ("=" * 60) -ForegroundColor $Green
    Write-Host ""
    Write-Host "  Username: admin" -ForegroundColor $White
    Write-Host "  Password: $Password" -ForegroundColor $White
    Write-Host ""
    Write-Host "  User info:" -ForegroundColor $Gray
    Write-Host $verifyResult
    Write-Host ""
}

# ============================================================================
# Database Initialization Function
# ============================================================================

function Initialize-Database {
    Write-Host ""
    Write-Host ("=" * 60) -ForegroundColor $Cyan
    Write-Host "Database Initialization" -ForegroundColor $Cyan
    Write-Host ("=" * 60) -ForegroundColor $Cyan
    Write-Host ""

    $ARCHIVE_HOME = Get-ArchiveHome
    $PGPath = "C:\Program Files\PostgreSQL\16"

    # Step 1: Ensure PostgreSQL is running
    Write-Host "[Step 1/4] Checking PostgreSQL service..." -ForegroundColor $Yellow

    $pgService = Get-Service -Name PostgreSQL -ErrorAction SilentlyContinue
    if (-not $pgService -or $pgService.Status -ne "Running") {
        Write-Host "  - Starting PostgreSQL service..." -ForegroundColor Gray
        Start-Service -Name PostgreSQL -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 5
    }

    # Wait for PostgreSQL to be ready
    $maxRetries = 10
    $retryCount = 0
    $postgresReady = $false

    Write-Host "  - Waiting for PostgreSQL to be ready..." -ForegroundColor Gray
    while ($retryCount -lt $maxRetries) {
        try {
            $testConnection = & "$PGPath\bin\psql.exe" -U postgres -d postgres -c "SELECT 1" 2>$null
            if ($LASTEXITCODE -eq 0) {
                $postgresReady = $true
                break
            }
        } catch {}

        Start-Sleep -Seconds 1
        $retryCount++
    }

    if (-not $postgresReady) {
        Write-Host "  [ERROR] PostgreSQL is not responding" -ForegroundColor $Red
        Write-Host "  Please check PostgreSQL installation" -ForegroundColor $Yellow
        return
    }

    Write-Host "  [OK] PostgreSQL is ready" -ForegroundColor $Green

    # Step 2: Create database if not exists
    Write-Host ""
    Write-Host "[Step 2/4] Creating database..." -ForegroundColor $Yellow

    $ErrorActionPreference = "Continue"
    try {
        $dbExists = & "$PGPath\bin\psql.exe" -U postgres -d postgres -q -t -c "SELECT 1 FROM pg_database WHERE datname='archive_management'" 2>$null
    } catch {}
    $ErrorActionPreference = "Stop"

    $dbExists = $dbExists.Trim()

    if ([string]::IsNullOrWhiteSpace($dbExists)) {
        Write-Host "  - Creating database 'archive_management'..." -ForegroundColor Gray

        $ErrorActionPreference = "Continue"
        try {
            & "$PGPath\bin\createdb.exe" -U postgres archive_management 2>&1 | Out-Null
        } catch {}
        $ErrorActionPreference = "Stop"

        Start-Sleep -Seconds 2

        # Verify database was created
        $ErrorActionPreference = "Continue"
        try {
            $dbCheck = & "$PGPath\bin\psql.exe" -U postgres -d postgres -q -t -c "SELECT 1 FROM pg_database WHERE datname='archive_management'" 2>$null
        } catch {}
        $ErrorActionPreference = "Stop"

        $dbCheck = $dbCheck.Trim()

        if (-not [string]::IsNullOrWhiteSpace($dbCheck)) {
            Write-Host "  [OK] Database 'archive_management' created" -ForegroundColor $Green
        } else {
            Write-Host "  [ERROR] Database creation failed" -ForegroundColor $Red
            return
        }
    } else {
        Write-Host "  [OK] Database 'archive_management' already exists" -ForegroundColor $Green
    }

    # Step 3: Create schema
    Write-Host ""
    Write-Host "[Step 3/4] Creating database schema..." -ForegroundColor $Yellow

    $schemaSQL = Join-Path $ARCHIVE_HOME "init-data\init-schema.sql"

    if (-not (Test-Path $schemaSQL)) {
        Write-Host "  [ERROR] Schema file not found: $schemaSQL" -ForegroundColor $Red
        return
    }

    # Check if tables already exist
    $ErrorActionPreference = "Continue"
    try {
        $tableCheck = & "$PGPath\bin\psql.exe" -U postgres -d archive_management -q -t -c "SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='User'" 2>$null
    } catch {}
    $ErrorActionPreference = "Stop"

    if ([string]::IsNullOrWhiteSpace($tableCheck)) {
        Write-Host "  - Executing init-schema.sql..." -ForegroundColor Gray

        $ErrorActionPreference = "Continue"
        try {
            $output = & "$PGPath\bin\psql.exe" -U postgres -d archive_management -q -f $schemaSQL 2>&1
            $exitCode = $LASTEXITCODE
        } catch {}
        $ErrorActionPreference = "Stop"

        if ($exitCode -eq 0) {
            Write-Host "  [OK] Database schema created" -ForegroundColor $Green
        } else {
            # Verify if tables were created
            $ErrorActionPreference = "Continue"
            try {
                $verifyCheck = & "$PGPath\bin\psql.exe" -U postgres -d archive_management -q -t -c "SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='User'" 2>$null
            } catch {}
            $ErrorActionPreference = "Stop"

            if (-not [string]::IsNullOrWhiteSpace($verifyCheck)) {
                Write-Host "  [OK] Database schema created (with warnings)" -ForegroundColor $Green
            } else {
                Write-Host "  [ERROR] Schema creation failed" -ForegroundColor $Red
                Write-Host "  Output: $output" -ForegroundColor $Gray
                return
            }
        }
    } else {
        Write-Host "  [OK] Database schema already exists" -ForegroundColor $Green
    }

    # Step 4: Insert initial data
    Write-Host ""
    Write-Host "[Step 4/4] Inserting initial data..." -ForegroundColor $Yellow

    $initSQL = Join-Path $ARCHIVE_HOME "init-data\init-database.sql"

    if (-not (Test-Path $initSQL)) {
        Write-Host "  [ERROR] Init data file not found: $initSQL" -ForegroundColor $Red
        return
    }

    # Check if admin user exists
    $ErrorActionPreference = "Continue"
    try {
        $adminCheck = & "$PGPath\bin\psql.exe" -U postgres -d archive_management -q -t -c "SELECT 1 FROM \""User\"" WHERE username='admin' LIMIT 1" 2>$null
    } catch {}
    $ErrorActionPreference = "Stop"

    if ($adminCheck -notmatch "1") {
        Write-Host "  - Executing init-database.sql..." -ForegroundColor Gray

        $ErrorActionPreference = "Continue"
        try {
            $sqlOutput = & "$PGPath\bin\psql.exe" -U postgres -d archive_management -q -f $initSQL 2>&1
            $exitCode = $LASTEXITCODE
        } catch {}
        $ErrorActionPreference = "Stop"

        if ($exitCode -eq 0) {
            Write-Host "  [OK] Initial data inserted" -ForegroundColor $Green
        } else {
            # Verify if admin user was created
            $ErrorActionPreference = "Continue"
            try {
                $verifyUser = & "$PGPath\bin\psql.exe" -U postgres -d archive_management -q -t -c "SELECT 1 FROM \""User\"" WHERE username='admin'" 2>$null
            } catch {}
            $ErrorActionPreference = "Stop"

            if (-not [string]::IsNullOrWhiteSpace($verifyUser)) {
                Write-Host "  [OK] Initial data inserted (with warnings)" -ForegroundColor $Green
            } else {
                Write-Host "  [ERROR] Initial data insertion failed" -ForegroundColor $Red
                Write-Host "  Output: $sqlOutput" -ForegroundColor $Gray
                return
            }
        }
    } else {
        Write-Host "  [OK] Initial data already exists (admin user found)" -ForegroundColor $Green
    }

    # Summary
    Write-Host ""
    Write-Host ("=" * 60) -ForegroundColor $Cyan
    Write-Host "Database Initialization Complete!" -ForegroundColor $Cyan
    Write-Host ("=" * 60) -ForegroundColor $Cyan
    Write-Host ""
    Write-Host "  Database:     archive_management" -ForegroundColor $Gray
    Write-Host "  Admin User:   admin" -ForegroundColor $Gray
    Write-Host "  Password:     admin123" -ForegroundColor $Gray
    Write-Host ""
}

function Test-Database {
    param([string]$Target = "all")

    $ErrorActionPreference = "Continue"
    $PGPath = "C:\Program Files\PostgreSQL\16"

    Write-Host ""
    Write-Host ("=" * 60) -ForegroundColor $Cyan
    Write-Host "Database Diagnostics" -ForegroundColor $Cyan
    Write-Host ("=" * 60) -ForegroundColor $Cyan
    Write-Host ""

    # Check database existence
    Write-Host "[1] Database 'archive_management':" -ForegroundColor $Gray
    $ErrorActionPreference = "Continue"
    try {
        $dbCheck = & "$PGPath\bin\psql.exe" -U postgres -d postgres -q -t -c "SELECT 1 FROM pg_database WHERE datname='archive_management'" 2>$null
    } catch {}
    $ErrorActionPreference = "Stop"

    if ([string]::IsNullOrWhiteSpace($dbCheck)) {
        Write-Host "  Status: NOT CREATED" -ForegroundColor $Red
        Write-Host "  ERROR: Database does not exist!" -ForegroundColor $Red
        Write-Host "  Solution: Run 'toolkit.bat init-db' to create the database" -ForegroundColor $Yellow
    } else {
        Write-Host "  Status: EXISTS" -ForegroundColor $Green

        # Check tables
        Write-Host "[2] Required Tables:" -ForegroundColor $Gray
        $requiredTables = @("User", "Archive", "ImportRecord", "OperationLog", "SystemConfig", "ConfigHistory", "License")
        $missingTables = @()
        foreach ($table in $requiredTables) {
            $ErrorActionPreference = "Continue"
            try {
                $tableCheck = & "$PGPath\bin\psql.exe" -U postgres -d archive_management -q -t -c "SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='$table'" 2>$null
            } catch {}
            $ErrorActionPreference = "Stop"


            if ([string]::IsNullOrWhiteSpace($tableCheck)) {
                Write-Host "  - $table : MISSING" -ForegroundColor $Red
                $missingTables += $table
            } else {
                Write-Host "  - $table : EXISTS" -ForegroundColor $Green
            }
        }

        if ($missingTables.Count -gt 0) {
            Write-Host ""
            Write-Host "  ERROR: $($missingTables.Count) table(s) missing!" -ForegroundColor $Red
            Write-Host "  Missing tables: $($missingTables -join ', ')" -ForegroundColor $Red
            Write-Host "  Solution: Run 'toolkit.bat init-db' to create the database schema" -ForegroundColor $Yellow
        } else {
            Write-Host "  All required tables exist" -ForegroundColor $Green
        }
    }

    # Check admin user
    Write-Host "[3] Admin User:" -ForegroundColor $Gray
    $ErrorActionPreference = "Continue"
    try {
        $adminCheck = & "$PGPath\bin\psql.exe" -U postgres -d archive_management -q -t -c "SELECT username, role FROM \""User\"" WHERE username='admin'" 2>$null
    } catch {}
    $ErrorActionPreference = "Stop"

    if ([string]::IsNullOrWhiteSpace($adminCheck)) {
        Write-Host "  Status: NOT FOUND" -ForegroundColor $Red
        Write-Host "  ERROR: Admin user does not exist!" -ForegroundColor $Red
        Write-Host "  Solution: Run 'toolkit.bat init-db' to create initial data" -ForegroundColor $Yellow
    } else {
        Write-Host "  Status: FOUND" -ForegroundColor $Green
        Write-Host "    $adminCheck" -ForegroundColor $Gray
    }

    # Check database connection
    Write-Host "[4] Database Connection Test:" -ForegroundColor $Gray
    $ErrorActionPreference = "Continue"
    try {
        $connTest = & "$PGPath\bin\psql.exe" -U postgres -d archive_management -q -c "SELECT version()" 2>$null
    } catch {}
    $ErrorActionPreference = "Stop"


    if ($LASTEXITCODE -eq 0) {
        Write-Host "  Connection: SUCCESS" -ForegroundColor $Green
    } else {
        Write-Host "  Connection: FAILED" -ForegroundColor $Red
        Write-Host "  ERROR: Cannot connect to database!" -ForegroundColor $Red
        Write-Host "  Check if PostgreSQL is running and PostgreSQL service is started" -ForegroundColor $Yellow
    }
}

function Reset-Service {
    param(
        [string]$Target = "all",
        [switch]$CleanData
    )

    Write-Host ""
    Write-Host ("=" * 60) -ForegroundColor $Cyan
    Write-Host "Service Reset" -ForegroundColor $Cyan
    Write-Host ("=" * 60) -ForegroundColor $Cyan
    Write-Host ""

    $ARCHIVE_HOME = Get-ArchiveHome

    if ($Target -eq "all" -or $Target -eq "pg" -or $Target -eq "postgresql") {
        Write-Host "--- Resetting PostgreSQL ---" -ForegroundColor $Yellow
        Write-Host ""

        # Get data path from registry
        $dataPath = $null
        try {
            $serviceKey = Get-ItemProperty "HKLM:\SYSTEM\CurrentControlSet\Services\PostgreSQL*" -ErrorAction Stop
            if ($serviceKey.ImagePath -is [string]) {
                if ($serviceKey.ImagePath -match '-D\s+"([^"]+)"') {
                    $dataPath = $matches[1]
                } elseif ($serviceKey.ImagePath -match '-D\s+([^\s]+)') {
                    $dataPath = $matches[1].Trim('"')
                }
            }
        } catch {}

        if (-not $dataPath) {
            $dataPath = "$ARCHIVE_HOME\data\database"
        }

        Write-Host "  Data path: $dataPath" -ForegroundColor $Gray

        # Stop service
        Write-Host "  [1/3] Stopping service..." -ForegroundColor Gray
        try {
            Stop-Service -Name PostgreSQL -Force -ErrorAction SilentlyContinue
            Start-Sleep -Seconds 3
            Write-Host "        Service stopped" -ForegroundColor $Green
        } catch {
            Write-Host "        Service not running" -ForegroundColor $Gray
        }

        # Delete service
        Write-Host "  [2/3] Removing service..." -ForegroundColor Gray
        $svc = Get-Service -Name PostgreSQL -ErrorAction SilentlyContinue
        if ($svc) {
            sc.exe delete PostgreSQL >$null 2>&1
            Start-Sleep -Seconds 3

            $svc = Get-Service -Name PostgreSQL -ErrorAction SilentlyContinue
            if (-not $svc) {
                Write-Host "        Service removed" -ForegroundColor $Green
            } else {
                Write-Host "        Failed to remove service" -ForegroundColor $Red
            }
        } else {
            Write-Host "        Service not found" -ForegroundColor $Gray
        }

        # Clean data if requested
        if ($CleanData) {
            Write-Host "  [3/3] Cleaning data directory..." -ForegroundColor Gray
            if (Test-Path $dataPath) {
                Remove-Item "$dataPath\*" -Recurse -Force -ErrorAction SilentlyContinue
                Write-Host "        Data cleaned" -ForegroundColor $Green
            } else {
                Write-Host "        Data directory not found" -ForegroundColor $Gray
            }
        } else {
            Write-Host "  [3/3] Keeping data directory (use -clean to remove)" -ForegroundColor $Gray
        }

        Write-Host ""
        Write-Host "  PostgreSQL reset complete. Run 'toolkit.bat init-db' to reinitialize database." -ForegroundColor $Cyan
        Write-Host ""
    }

    if ($Target -eq "all" -or $Target -eq "ms" -or $Target -eq "meilisearch") {
        Write-Host "--- Resetting Meilisearch ---" -ForegroundColor $Yellow
        Write-Host ""

        # Stop process
        Write-Host "  [1/3] Stopping process..." -ForegroundColor Gray
        Stop-Process -Name meilisearch -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 2

        # Stop and delete service
        Write-Host "  [2/3] Removing service..." -ForegroundColor Gray
        try {
            Stop-Service -Name Meilisearch -Force -ErrorAction SilentlyContinue
            sc.exe delete Meilisearch >$null 2>&1
            Start-Sleep -Seconds 2
            Write-Host "        Service removed" -ForegroundColor $Green
        } catch {
            Write-Host "        Service not found" -ForegroundColor $Gray
        }

        # Clean data if requested
        $dataPath = "$ARCHIVE_HOME\data\meilisearch"
        if ($CleanData) {
            Write-Host "  [3/3] Cleaning data directory..." -ForegroundColor Gray
            if (Test-Path $dataPath) {
                Remove-Item "$dataPath\*" -Recurse -Force -ErrorAction SilentlyContinue
                Write-Host "        Data cleaned" -ForegroundColor $Green
            }
        } else {
            Write-Host "  [3/3] Keeping data directory" -ForegroundColor $Gray
        }

        Write-Host ""
        Write-Host "  Meilisearch reset complete." -ForegroundColor $Cyan
        Write-Host ""
    }

    if ($Target -eq "all" -or $Target -eq "app" -or $Target -eq "application") {
        Write-Host "--- Resetting Application ---" -ForegroundColor $Yellow
        Write-Host ""

        $pm2Path = "$env:APPDATA\npm\pm2.cmd"

        # Stop PM2 process
        Write-Host "  [1/2] Stopping PM2 process..." -ForegroundColor Gray
        if (Test-Path $pm2Path) {
            & $pm2Path stop archive-management 2>$null
            & $pm2Path delete archive-management 2>$null
            Write-Host "        Process stopped" -ForegroundColor $Green
        } else {
            Write-Host "        PM2 not found" -ForegroundColor $Gray
        }

        # Kill node processes
        Stop-Process -Name node -Force -ErrorAction SilentlyContinue

        # Clean logs if requested
        if ($CleanData) {
            Write-Host "  [2/2] Cleaning logs..." -ForegroundColor $Gray
            $logsPath = "$ARCHIVE_HOME\app\logs"
            if (Test-Path $logsPath) {
                Remove-Item "$logsPath\*" -Recurse -Force -ErrorAction SilentlyContinue
                Write-Host "        Logs cleaned" -ForegroundColor $Green
            }
        } else {
            Write-Host "  [2/2] Keeping logs" -ForegroundColor $Gray
        }

        Write-Host ""
        Write-Host "  Application reset complete." -ForegroundColor $Cyan
        Write-Host ""
    }

    Write-Host ("=" * 60) -ForegroundColor $Cyan
    Write-Host "Reset Complete" -ForegroundColor $Cyan
    Write-Host ("=" * 60) -ForegroundColor $Cyan
    Write-Host ""
}

function Invoke-Diagnose {
    param([string]$Target = "all")

    Write-Host ""
    Write-Host ("=" * 60) -ForegroundColor $Cyan
    Write-Host "System Diagnostics" -ForegroundColor $Cyan
    Write-Host ("=" * 60) -ForegroundColor $Cyan
    Write-Host ""

    if ($Target -eq "all" -or $Target -eq "pg" -or $Target -eq "postgresql") {
        Write-Host "--- PostgreSQL Diagnostics ---" -ForegroundColor $Yellow
        Write-Host ""

        # Initialize paths
        $pgPath = "C:\Program Files\PostgreSQL\16"
        $configDataPath = $null

        # Check service
        Write-Host "[1] Service Status:" -ForegroundColor $Gray
        $pgService = Get-Service -Name "*postgresql*" -ErrorAction SilentlyContinue
        if ($pgService) {
            $pgService | Format-List Name, Status, DisplayName, StartType
        } else {
            Write-Host "  No PostgreSQL service found!" -ForegroundColor $Red
        }

        # Check registry for configured data path FIRST
        Write-Host "[2] Service Configuration (Registry):" -ForegroundColor $Gray
        try {
            $serviceKey = Get-ItemProperty "HKLM:\SYSTEM\CurrentControlSet\Services\PostgreSQL*" -ErrorAction Stop
            if ($serviceKey) {
                $imagePath = $serviceKey.ImagePath
                Write-Host "  ImagePath: $imagePath" -ForegroundColor $Gray

                # Try to extract data path from ImagePath
                if ($imagePath -is [string] -and $imagePath.Length -gt 0) {
                    if ($imagePath -match '-D\s+"([^"]+)"') {
                        $configDataPath = $matches[1]
                    } elseif ($imagePath -match '-D\s+([^\s]+)') {
                        $configDataPath = $matches[1].Trim('"')
                    }
                    if ($configDataPath) {
                        Write-Host "  Configured data path: $configDataPath" -ForegroundColor $Cyan
                    }
                }
            }
        } catch {
            Write-Host "  Could not read service configuration: $($_.Exception.Message)" -ForegroundColor $Yellow
        }

        # Determine actual data path to use
        $actualDataPath = if ($configDataPath) { $configDataPath } else { Join-Path $pgPath "data" }
        Write-Host "  Using data path: $actualDataPath" -ForegroundColor $Cyan
        Write-Host "  Data path exists: $(Test-Path $actualDataPath)" -ForegroundColor $(if (Test-Path $actualDataPath) { $Green } else { $Red })

        # Check installation
        Write-Host "[3] Installation Directory:" -ForegroundColor $Gray
        if (Test-Path $pgPath) {
            Write-Host "  Found: $pgPath" -ForegroundColor $Green
            $binPath = Join-Path $pgPath "bin"
            Write-Host "  Bin exists: $(Test-Path $binPath)" -ForegroundColor $(if (Test-Path $binPath) { $Green } else { $Red })
        } else {
            Write-Host "  NOT found: $pgPath" -ForegroundColor $Red
        }

        # Check pg_ctl status with correct data path
        Write-Host "[4] pg_ctl status:" -ForegroundColor $Gray
        $pgCtl = Join-Path $pgPath "bin\pg_ctl.exe"
        if (Test-Path $pgCtl) {
            if (Test-Path $actualDataPath) {
                $result = & $pgCtl status -D $actualDataPath 2>&1
                Write-Host "  $result" -ForegroundColor $Gray
            } else {
                Write-Host "  Cannot check status - data directory does not exist" -ForegroundColor $Red
            }
        } else {
            Write-Host "  pg_ctl.exe not found" -ForegroundColor $Red
        }

        # Check logs with correct data path
        Write-Host "[5] Recent PostgreSQL Logs:" -ForegroundColor $Gray
        $logPath = Join-Path $actualDataPath "log"
        if (Test-Path $logPath) {
            $latestLog = Get-ChildItem $logPath -Filter "*.log" -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 1
            if ($latestLog) {
                Write-Host "  Latest log: $($latestLog.Name)" -ForegroundColor $Gray
                Write-Host "  Last 10 lines:" -ForegroundColor $Gray
                Get-Content $latestLog.FullName -Tail 10 -ErrorAction SilentlyContinue | ForEach-Object { Write-Host "    $_" -ForegroundColor $Gray }
            } else {
                Write-Host "  No log files found in: $logPath" -ForegroundColor $Yellow
            }
        } else {
            Write-Host "  Log directory not found: $logPath" -ForegroundColor $Red
        }

        # Check port
        Write-Host "[6] Port 5432:" -ForegroundColor $Gray
        $portStatus = Get-PortStatus 5432
        Write-Host "  Status: $portStatus" -ForegroundColor $(if ($portStatus -eq "LISTENING") { $Green } else { $Yellow })

        Write-Host ""
    }

    if ($Target -eq "all" -or $Target -eq "db" -or $Target -eq "database") {
        Test-Database -Target $Target
    }

    if ($Target -eq "all" -or $Target -eq "ms" -or $Target -eq "meilisearch") {
        Write-Host "--- Meilisearch Diagnostics ---" -ForegroundColor $Yellow
        Write-Host ""

        # Check process
        Write-Host "[1] Process Status:" -ForegroundColor $Gray
        $msProcess = Get-Process -Name meilisearch -ErrorAction SilentlyContinue
        if ($msProcess) {
            Write-Host "  Running (PID: $($msProcess.Id))" -ForegroundColor $Green
        } else {
            Write-Host "  Not running" -ForegroundColor $Red
        }

        # Check service
        Write-Host "[2] Service Status:" -ForegroundColor $Gray
        $msService = Get-Service -Name Meilisearch -ErrorAction SilentlyContinue
        if ($msService) {
            Write-Host "  Service: $($msService.Status)" -ForegroundColor $Gray
        } else {
            Write-Host "  No Meilisearch service (running as process)" -ForegroundColor $Yellow
        }

        # Check installation
        Write-Host "[3] Installation:" -ForegroundColor $Gray
        $msPath = "C:\Program Files\Meilisearch\meilisearch.exe"
        if (Test-Path $msPath) {
            Write-Host "  Found: $msPath" -ForegroundColor $Green
        } else {
            Write-Host "  NOT found: $msPath" -ForegroundColor $Red
        }

        # Check health endpoint
        Write-Host "[4] Health Check:" -ForegroundColor $Gray
        try {
            $resp = Invoke-WebRequest -Uri "http://localhost:7700/health" -Method Get -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop
            Write-Host "  Status: OK (HTTP $($resp.StatusCode))" -ForegroundColor $Green
        } catch {
            Write-Host "  Failed: $($_.Exception.Message)" -ForegroundColor $Red
        }

        # Check port
        Write-Host "[5] Port 7700:" -ForegroundColor $Gray
        $portStatus = Get-PortStatus 7700
        Write-Host "  Status: $portStatus" -ForegroundColor $(if ($portStatus -eq "LISTENING") { $Green } else { $Yellow })

        Write-Host ""
    }

    if ($Target -eq "all" -or $Target -eq "app" -or $Target -eq "application") {
        Write-Host "--- Application Diagnostics ---" -ForegroundColor $Yellow
        Write-Host ""

        $ARCHIVE_HOME = Get-ArchiveHome

        # Check PM2
        Write-Host "[1] PM2 Status:" -ForegroundColor $Gray
        $pm2Path = "$env:APPDATA\npm\pm2.cmd"
        if (Test-Path $pm2Path) {
            Write-Host "  PM2 found: $pm2Path" -ForegroundColor $Green
            $pm2List = & $pm2Path list 2>&1 | Out-String
            Write-Host $pm2List -ForegroundColor $Gray
        } else {
            Write-Host "  PM2 NOT found" -ForegroundColor $Red
        }

        # Check app directory
        Write-Host "[2] Application Directory:" -ForegroundColor $Gray
        $appPath = Join-Path $ARCHIVE_HOME "app"
        if (Test-Path $appPath) {
            Write-Host "  Found: $appPath" -ForegroundColor $Green
            $ecoConfig = Join-Path $appPath "ecosystem.config.js"
            Write-Host "  ecosystem.config.js: $(Test-Path $ecoConfig)" -ForegroundColor $(if (Test-Path $ecoConfig) { $Green } else { $Red })
        } else {
            Write-Host "  NOT found: $appPath" -ForegroundColor $Red
        }

        # Check port
        Write-Host "[3] Port 3000:" -ForegroundColor $Gray
        $portStatus = Get-PortStatus 3000
        Write-Host "  Status: $portStatus" -ForegroundColor $(if ($portStatus -eq "LISTENING") { $Green } else { $Yellow })

        # Check node process
        Write-Host "[4] Node Processes:" -ForegroundColor $Gray
        $nodeProcesses = Get-Process -Name node -ErrorAction SilentlyContinue
        if ($nodeProcesses) {
            Write-Host "  Found $($nodeProcesses.Count) node process(es)" -ForegroundColor $Green
            $nodeProcesses | Format-Table Id, CPU, WorkingSet -AutoSize
        } else {
            Write-Host "  No node processes running" -ForegroundColor $Yellow
        }

        Write-Host ""
    }

    # Show fix suggestions based on findings
    Write-Host "--- Suggestions ---" -ForegroundColor $Yellow
    Write-Host ""

    if ($Target -eq "all" -or $Target -eq "pg" -or $Target -eq "postgresql") {
        # Re-read config data path from registry for suggestions section
        $suggestionDataPath = $null
        try {
            $serviceKey = Get-ItemProperty "HKLM:\SYSTEM\CurrentControlSet\Services\PostgreSQL*" -ErrorAction Stop
            if ($serviceKey.ImagePath -is [string]) {
                if ($serviceKey.ImagePath -match '-D\s+"([^"]+)"') {
                    $suggestionDataPath = $matches[1]
                } elseif ($serviceKey.ImagePath -match '-D\s+([^\s]+)') {
                    $suggestionDataPath = $matches[1].Trim('"')
                }
            }
        } catch {}

        $pgPath = "C:\Program Files\PostgreSQL\16"
        $dataPath = if ($suggestionDataPath) { $suggestionDataPath } else { Join-Path $pgPath "data" }

        if (-not (Test-Path $dataPath)) {
            Write-Host "[PostgreSQL] Data directory missing: $dataPath" -ForegroundColor $Red
            Write-Host ""
            Write-Host "Options:" -ForegroundColor $Yellow
            Write-Host "  1. If you have a backup, restore it to:" -ForegroundColor $Gray
            Write-Host "     $dataPath" -ForegroundColor $Cyan
            Write-Host ""
            Write-Host "  2. To initialize a NEW database (WARNING: loses all data):" -ForegroundColor $Gray
            Write-Host "     Run 'toolkit.bat init-db' to create database and schema" -ForegroundColor $Cyan
            Write-Host ""
        } else {
            Write-Host "[PostgreSQL] Data directory exists: $dataPath" -ForegroundColor $Green
            Write-Host "  If service still fails to start, check:" -ForegroundColor $Gray
            Write-Host "  - Directory permissions (postgres user needs full access)" -ForegroundColor $Gray
            Write-Host "  - postgresql.conf and pg_hba.conf files exist" -ForegroundColor $Gray
            Write-Host "  - Postgres logs in: $dataPath\log" -ForegroundColor $Gray
            Write-Host ""
        }
    }

    Write-Host ("=" * 60) -ForegroundColor $Cyan
    Write-Host "Diagnostics Complete" -ForegroundColor $Cyan
    Write-Host ("=" * 60) -ForegroundColor $Cyan
    Write-Host ""
}

function Show-Help {
    Write-Host @"
===============================================================================
Archive Management System - Operation Toolkit
===============================================================================

Usage:
  toolkit.bat <command> [target] [options]

Commands:
  status              View service status
  start               Start all services
  stop                Stop all services
  restart             Restart all services
  health              Health check
  logs                View application logs
  backup              Database backup
  diagnose            Run diagnostics (detailed troubleshooting)
  init-db             Initialize database (create DB, schema, seed data)
  reset               Reset service (remove, keep data by default)
  help                Show this help

Targets (for start/stop/restart/diagnose/reset):
  all                 All services (default)
  pg, postgresql     PostgreSQL only
  ms, meilisearch    Meilisearch only
  app, application   Application only
  db, database       Database only (for diagnose)

Options (for reset):
  -clean              Also clean data directory (WARNING: destructive)

Examples:
  toolkit.bat status              - View status
  toolkit.bat start               - Start all
  toolkit.bat start app           - Start application only
  toolkit.bat stop pg             - Stop PostgreSQL
  toolkit.bat restart ms          - Restart Meilisearch
  toolkit.bat health              - Health check
  toolkit.bat logs                - View logs
  toolkit.bat backup              - Backup database
  toolkit.bat init-db             - Initialize database (offline mode)
  toolkit.bat diagnose            - Diagnose all services
  toolkit.bat diagnose pg         - Diagnose PostgreSQL only
  toolkit.bat diagnose db         - Diagnose database only
  toolkit.bat reset pg            - Reset PostgreSQL service
  toolkit.bat reset pg -clean     - Reset PostgreSQL and clean data

Shortcuts:
  start.bat     = toolkit.bat start
  stop.bat      = toolkit.bat stop
  restart.bat   = toolkit.bat restart
  health.bat    = toolkit.bat health
  logs.bat      = toolkit.bat logs
  backup.bat    = toolkit.bat backup
===============================================================================
"@ -ForegroundColor $Cyan
}

# ============================================================================
# Main
# ============================================================================

$cmd = $args[0]
$target = $args[1]

if (-not $cmd) {
    Show-Help
    exit 0
}

switch ($cmd.ToLower()) {
    "status"   { Show-Status }
    "health"  { Show-Health }
    "logs"    { Show-Logs }
    "backup"  { Invoke-Backup }
    "diagnose" { Invoke-Diagnose -Target $target }
    "init-db" { Initialize-Database }
    "help"    { Show-Help }

    "start" {
        if ($target -eq "pg" -or $target -eq "postgresql") {
            Start-PostgreSQL
        } elseif ($target -eq "ms" -or $target -eq "meilisearch") {
            Start-Meilisearch
        } elseif ($target -eq "app" -or $target -eq "application") {
            Start-App
        } else {
            Write-Host "Starting all services..." -ForegroundColor $Cyan
            Start-PostgreSQL
            Start-Meilisearch
            Start-App
            Show-Status
        }
    }

    "stop" {
        if ($target -eq "pg" -or $target -eq "postgresql") {
            Stop-PostgreSQL
        } elseif ($target -eq "ms" -or $target -eq "meilisearch") {
            Stop-Meilisearch
        } elseif ($target -eq "app" -or $target -eq "application") {
            Stop-App
        } else {
            Write-Host "Stopping all services..." -ForegroundColor $Cyan
            Stop-App
            Stop-Meilisearch
            Stop-PostgreSQL
            Show-Status
        }
    }

    "restart" {
        if ($target -eq "pg" -or $target -eq "postgresql") {
            Stop-PostgreSQL
            Start-PostgreSQL
        } elseif ($target -eq "ms" -or $target -eq "meilisearch") {
            Stop-Meilisearch
            Start-Meilisearch
        } elseif ($target -eq "app" -or $target -eq "application") {
            Stop-App
            Start-App
        } else {
            Write-Host "Restarting all services..." -ForegroundColor $Cyan
            Stop-App
            Stop-Meilisearch
            Stop-PostgreSQL
            Start-Sleep -Seconds 3
            Start-PostgreSQL
            Start-Meilisearch
            Start-App
            Show-Status
        }
    }

    "reset" {
        # Check for -clean option
        $cleanData = $false
        if ($args -contains "-clean") {
            $cleanData = $true
        }

        # Determine target
        $resetTarget = $target
        if ($resetTarget -eq "-clean") {
            $resetTarget = "all"
        }

        Reset-Service -Target $resetTarget -CleanData:$cleanData
    }

    default {
        Write-Host "Unknown command: $cmd" -ForegroundColor $Red
        Show-Help
    }
}
