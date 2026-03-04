# ============================================================================
# Archive Management System - Installation Script
# ============================================================================

$ErrorActionPreference = "Stop"

Write-Host ""
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

# ============================================================================
# Step 0: Select installation drive
# ============================================================================
Write-Host "[Step 0/8] Select installation drive..." -ForegroundColor Yellow
Write-Host ""

$Drives = Get-PSDrive -PSProvider FileSystem | Select-Object -ExpandProperty Name
Write-Host "Available drives:" -ForegroundColor Gray
foreach ($Drive in $Drives) {
    Write-Host "  $Drive`:" -ForegroundColor Gray
}
Write-Host ""

$InstallDrive = Read-Host "Enter installation drive (default: C)"
if ([string]::IsNullOrWhiteSpace($InstallDrive)) {
    $InstallDrive = "C"
}
$ArchiveHome = "${InstallDrive}:\ArchiveManagement"
Write-Host "  - Installation path: $ArchiveHome" -ForegroundColor Green
Write-Host ""

# ============================================================================
# Step 1: Check components
# ============================================================================
Write-Host "[Step 1/8] Checking components..." -ForegroundColor Yellow

# Check PostgreSQL
$PGInstalled = $false
$PGService = Get-Service -Name "PostgreSQL" -ErrorAction SilentlyContinue
if ($PGService) {
    Write-Host "  - PostgreSQL: Service exists" -ForegroundColor Green
    $PGInstalled = $true
} elseif (Test-Path "C:\Program Files\PostgreSQL\16\bin\pg_ctl.exe") {
    Write-Host "  - PostgreSQL: Installed (no service)" -ForegroundColor Yellow
    $PGInstalled = $true  # Binary exists, just need to create service
} else {
    Write-Host "  - PostgreSQL: Not found" -ForegroundColor Gray
}

# Check Node.js
$NodeInstalled = $false
if (Test-Path "C:\Program Files\nodejs\node.exe") {
    Write-Host "  - Node.js: Installed" -ForegroundColor Green
    $NodeInstalled = $true
}

# Check PM2
$PM2Installed = $false
$pm2Path = "$env:APPDATA\npm\pm2.cmd"
if (Test-Path $pm2Path) {
    Write-Host "  - PM2: Installed" -ForegroundColor Green
    $PM2Installed = $true
}

# Check Meilisearch
$MeiliInstalled = $false
$MeiliServiceExists = $false
$MeiliService = Get-Service -Name "Meilisearch" -ErrorAction SilentlyContinue
if ($MeiliService) {
    Write-Host "  - Meilisearch: Service exists ($($MeiliService.Status))" -ForegroundColor Green
    $MeiliServiceExists = $true
    $MeiliInstalled = $true
} elseif (Test-Path "C:\Program Files\Meilisearch\meilisearch.exe") {
    Write-Host "  - Meilisearch: Installed (no service)" -ForegroundColor Yellow
    $MeiliInstalled = $true
} elseif (Test-Path "C:\Program Files\Meilisearch\meilisearch.exe") {
    Write-Host "  - Meilisearch: Installed (no service)" -ForegroundColor Yellow
    $MeiliInstalled = $true
    $MeiliServiceExists = $false
} else {
    Write-Host "  - Meilisearch: Not found" -ForegroundColor Gray
    $MeiliInstalled = $false
    $MeiliServiceExists = $false
}

# Check for packages
$MissingPackages = @()
# Check for packages
$MissingPackages = @()
if (-not $PGInstalled) {
    $pg = Get-ChildItem -Path $PackagesPath -Filter "postgresql-*.exe" -ErrorAction SilentlyContinue | Select-Object -First 1
    if (-not $pg) { $MissingPackages += "PostgreSQL" }
}
if (-not $NodeInstalled) {
    $node = Get-ChildItem -Path $PackagesPath -Filter "nodejs-*.msi" -ErrorAction SilentlyContinue | Select-Object -First 1
    if (-not $node) { $MissingPackages += "Node.js" }
}
if (-not $MeiliInstalled) {
    $meili = Get-ChildItem -Path $PackagesPath -Filter "meilisearch*.exe" -ErrorAction SilentlyContinue | Select-Object -First 1
    if (-not $meili) { $MissingPackages += "Meilisearch" }
}

if ($MissingPackages.Count -gt 0) {
    Write-Host ""
    Write-Host "Missing packages: $($MissingPackages -join ', ')" -ForegroundColor Red
    Write-Host "Please place installation packages in: $PackagesPath" -ForegroundColor Yellow
    Write-Host ""
    $cont = Read-Host "Continue anyway? (y/n)"
    if ($cont -ne "y" -and $cont -ne "Y") { exit 0 }
}

# ============================================================================
# Step 2: Create directories
# ============================================================================
Write-Host ""
Write-Host "[Step 2/8] Creating directories..." -ForegroundColor Yellow

$Dirs = @(
    "$ArchiveHome\data\database",
    "$ArchiveHome\data\archives",
    "$ArchiveHome\data\meilisearch",
    "$ArchiveHome\logs",
    "$ArchiveHome\config",
    "$ArchiveHome\scripts",
    "$ArchiveHome\services",
    "$ArchiveHome\init-data",
    "$ArchiveHome\packages"
)

foreach ($Dir in $Dirs) {
    if (-not (Test-Path $Dir)) {
        New-Item -ItemType Directory -Path $Dir -Force | Out-Null
    }
}
Write-Host "  - Directories created" -ForegroundColor Green

# ============================================================================
# Step 3: Generate config
# ============================================================================
Write-Host ""
Write-Host "[Step 3/8] Generating configuration..." -ForegroundColor Yellow

# Generate config.ini (only if not exists)
$ConfigIniPath = "$ArchiveHome\config.ini"
if (-not (Test-Path $ConfigIniPath)) {
    $ConfigIni = "ARCHIVE_HOME=$ArchiveHome`nPG_DATA_DIR=$ArchiveHome\data\database`nMEILI_DATA_DIR=$ArchiveHome\data\meilisearch"
    $ConfigIni | Out-File -FilePath $ConfigIniPath -Encoding UTF8
    Write-Host "  - config.ini generated" -ForegroundColor Green
} else {
    Write-Host "  - config.ini already exists, skipping" -ForegroundColor Gray
}

# Generate .env
$Timestamp = Get-Date -Format "yyyyMMddHHmmss"
$PGPass = "pg_$Timestamp"
$MeiliKey = "meili_$Timestamp"
$AuthKey = "auth_$Timestamp"

$EnvPath = "$ArchiveHome\config\.env"

if (-not (Test-Path $EnvPath)) {
    $EnvTemplate = Join-Path $InstallPath "config\.env.template"
    if (Test-Path $EnvTemplate) {
        $EnvContent = Get-Content $EnvTemplate -Raw
        $EnvContent = $EnvContent -replace "CHANGE_ME_PASSWORD", $PGPass
        $EnvContent = $EnvContent -replace "CHANGE_ME_KEY", $MeiliKey
        $EnvContent = $EnvContent -replace "CHANGE_ME_SECRET", $AuthKey
        $EnvContent = $EnvContent -replace "%ARCHIVE_HOME%", $ArchiveHome
        $EnvContent | Out-File -FilePath $EnvPath -Encoding UTF8
        Write-Host "  - .env generated" -ForegroundColor Green
    } else {
        Write-Host "  - .env.template not found, skipping .env generation" -ForegroundColor Yellow
    }
} else {
    # Update existing .env with missing required variables
    Write-Host "  - .env already exists, checking for missing variables..." -ForegroundColor Gray
    
    $EnvContent = Get-Content $EnvPath -Raw
    $NeedsUpdate = $false
    $PGPass = $null
    $MeiliKey = $null
    
    # Extract existing password from DATABASE_URL if present
    if ($EnvContent -match "DATABASE_URL=postgresql://postgres:([^@]+)@") {
        $PGPass = $Matches[1]
    }
    # Or from POSTGRES_PASSWORD
    if ($null -eq $PGPass -and $EnvContent -match "POSTGRES_PASSWORD=(.+)") {
        $PGPass = $Matches[1].Trim()
    }
    if ($null -eq $PGPass) {
        $PGPass = "pg_$Timestamp"
    }
    
    # Extract MEILI_MASTER_KEY
    if ($EnvContent -match "MEILI_MASTER_KEY=(.+)") {
        $MeiliKey = $Matches[1].Trim()
    }
    if ($null -eq $MeiliKey) {
        $MeiliKey = "meili_$Timestamp"
    }
    
    # Check and add DATABASE_URL if missing
    if ($EnvContent -notmatch "DATABASE_URL=") {
        $DatabaseUrl = "`nDATABASE_URL=postgresql://postgres:$PGPass@localhost:5432/archive_management"
        $EnvContent = $EnvContent.TrimEnd() + $DatabaseUrl + "`n"
        $NeedsUpdate = $true
        Write-Host "    - Added DATABASE_URL" -ForegroundColor Yellow
    }
    
    # Check and add AUTH_TRUST_HOST if missing
    if ($EnvContent -notmatch "AUTH_TRUST_HOST=") {
        $AuthTrustHost = "`nAUTH_TRUST_HOST=true"
        $EnvContent = $EnvContent.TrimEnd() + $AuthTrustHost + "`n"
        $NeedsUpdate = $true
        Write-Host "    - Added AUTH_TRUST_HOST=true" -ForegroundColor Yellow
    }
    
    # Check and add MEILI_MASTER_KEY if missing
    if ($EnvContent -notmatch "MEILI_MASTER_KEY=") {
        $MeiliMasterKey = "`nMEILI_MASTER_KEY=$MeiliKey"
        $EnvContent = $EnvContent.TrimEnd() + $MeiliMasterKey + "`n"
        $NeedsUpdate = $true
        Write-Host "    - Added MEILI_MASTER_KEY" -ForegroundColor Yellow
    }
    
    if ($NeedsUpdate) {
        $EnvContent | Out-File -FilePath $EnvPath -Encoding UTF8
        Write-Host "  - .env updated with missing variables" -ForegroundColor Green
    } else {
        Write-Host "  - .env already complete, no changes needed" -ForegroundColor Green
    }
}

# Copy .env to app directory (Next.js loads .env from app root by default)
$AppEnvPath = "$ArchiveHome\app\.env"

# Ensure app directory exists before copying
if (-not (Test-Path "$ArchiveHome\app")) {
    New-Item -ItemType Directory -Path "$ArchiveHome\app" -Force | Out-Null
}

Copy-Item -Path $EnvPath -Destination $AppEnvPath -Force
Write-Host "  - Copied .env to app directory" -ForegroundColor Green

# ============================================================================
# Step 4: Install/Configure PostgreSQL
# ============================================================================
# Step 4: Install/Configure PostgreSQL (Idempotent - based on Meilisearch pattern)
# ============================================================================
Write-Host ""
Write-Host "[Step 4/8] Configuring PostgreSQL..." -ForegroundColor Yellow

$PGPath = "C:\Program Files\PostgreSQL\16"
$PGDataPath = "$ArchiveHome\data\database"
$PGService = Get-Service -Name PostgreSQL -ErrorAction SilentlyContinue
$PGBinaryExists = Test-Path "$PGPath\bin\pg_ctl.exe"
$DataInitialized = Test-Path "$PGDataPath\PG_VERSION"

# Layer 1: Service exists -> Skip entire installation
if ($PGService) {
    Write-Host "  - PostgreSQL service exists ($($PGService.Status))" -ForegroundColor Green
} else {
    # Layer 2: Binary not exists -> Install from packages
    if (-not $PGBinaryExists) {
        Write-Host "  - PostgreSQL not installed, checking for installer..." -ForegroundColor Yellow
        
        $pgInstaller = Get-ChildItem -Path $PackagesPath -Filter "postgresql-*.exe" -ErrorAction SilentlyContinue | Select-Object -First 1

        if ($pgInstaller) {
            Write-Host "  - Found installer: $($pgInstaller.Name)" -ForegroundColor Gray
            Write-Host "  - Installing PostgreSQL (this may take a few minutes)..." -ForegroundColor Yellow

            # Simplified installation arguments (similar to Meilisearch simplicity)
            $installArgs = @(
                "--mode", "unattended",
                "--unattendedmodeui", "none",
                "--prefix", "`"$PGPath`""
            )

            try {
                # Use Job with timeout to prevent hanging on PostgreSQL installer
                # The installer may spawn child processes that don't exit properly
                $installJob = Start-Job -ScriptBlock {
                    param($installerPath, $argsList)
                    Start-Process -FilePath $installerPath -ArgumentList $argsList -Wait -NoNewWindow
                } -ArgumentList $pgInstaller.FullName, $installArgs

                # Wait up to 5 minutes (300 seconds)
                $timeoutSeconds = 300
                if (Wait-Job $installJob -Timeout $timeoutSeconds) {
                    $jobResult = Receive-Job $installJob
                    Write-Host "  - Installation process completed" -ForegroundColor Green
                } else {
                    Write-Host "  - Installation timeout ($timeoutSeconds seconds), checking installation status..." -ForegroundColor Yellow
                    Stop-Job $installJob
                }

                Remove-Job $installJob -Force -ErrorAction SilentlyContinue

                # Give installer a moment to finish file operations
                Start-Sleep -Seconds 3

                # Verify installation by checking binary existence (regardless of timeout)
                $PGBinaryExists = Test-Path "$PGPath\bin\pg_ctl.exe"
                if ($PGBinaryExists) {
                    Write-Host "  - PostgreSQL binaries verified" -ForegroundColor Green
                } else {
                    Write-Host "  - Warning: PostgreSQL binaries not found after installation" -ForegroundColor Yellow
                }
            } catch {
                Write-Host "  - Warning: Installation error: $_" -ForegroundColor Yellow
                # Check if binary exists anyway (installer might have detected existing installation)
                $PGBinaryExists = Test-Path "$PGPath\bin\pg_ctl.exe"
            }
        } else {
            Write-Host "  - ERROR: PostgreSQL installer not found in: $PackagesPath" -ForegroundColor Red
            Write-Host "    Expected file pattern: postgresql-*.exe" -ForegroundColor Yellow
        }
    } else {
        Write-Host "  - PostgreSQL executable exists" -ForegroundColor Gray
    }
    
    # Layer 3: Binary exists + Service not exists -> Create service
    if ($PGBinaryExists -and -not (Get-Service -Name PostgreSQL -ErrorAction SilentlyContinue)) {
        Write-Host "  - Creating PostgreSQL service..." -ForegroundColor Yellow
        
        # Stop and remove default service created by installer (if any)
        $defaultService = Get-Service -Name PostgreSQL -ErrorAction SilentlyContinue
        if ($defaultService) {
            Write-Host "  - Removing default service..." -ForegroundColor Gray
            Stop-Service -Name PostgreSQL -Force -ErrorAction SilentlyContinue
            & sc.exe delete PostgreSQL 2>&1 | Out-Null
            Start-Sleep -Seconds 2
        }
        
        # Initialize custom data directory (idempotent: check if already initialized)
        if (-not $DataInitialized) {
            Write-Host "  - Initializing database cluster..." -ForegroundColor Yellow
            
            if (-not (Test-Path $PGDataPath)) {
                New-Item -ItemType Directory -Path $PGDataPath -Force | Out-Null
            }
            
            # Set permissions
            icacls $PGDataPath /grant "NETWORK SERVICE:(OI)(CI)F" 2>$null
            icacls $PGDataPath /grant "LOCAL SERVICE:(OI)(CI)F" 2>$null
            icacls $PGDataPath /grant "Users:(OI)(CI)F" 2>$null
            
            # Initialize database with trust auth (idempotent)
            $initResult = & "$PGPath\bin\initdb.exe" -U postgres -A trust -D $PGDataPath -E UTF8 --locale=C 2>&1
            if ($LASTEXITCODE -eq 0) {
                Write-Host "  - Database cluster initialized" -ForegroundColor Green
                $DataInitialized = $true
            } else {
                Write-Host "  - Warning: Database initialization may have issues" -ForegroundColor Yellow
                Write-Host "    $initResult" -ForegroundColor Gray
            }
        } else {
            Write-Host "  - Data directory already initialized" -ForegroundColor Green
        }
        
        # Create service (idempotent: ignore if fails)
        Write-Host "  - Creating PostgreSQL service..." -ForegroundColor Yellow
        & "$PGPath\bin\pg_ctl.exe" register -N PostgreSQL -D $PGDataPath 2>$null
        
        Start-Sleep -Seconds 2
        
        $PGService = Get-Service -Name PostgreSQL -ErrorAction SilentlyContinue
        if ($PGService) {
            Write-Host "  - PostgreSQL service created" -ForegroundColor Green
        } else {
            Write-Host "  - Warning: Service creation may have failed" -ForegroundColor Yellow
        }
    }
}

# Ensure PostgreSQL is running (idempotent)
try {
    Start-Service -Name PostgreSQL -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 3
    
    $svc = Get-Service PostgreSQL -ErrorAction SilentlyContinue
    if ($svc -and $svc.Status -eq "Running") {
        Write-Host "  - PostgreSQL is running" -ForegroundColor Green
        
        # Create database if not exists (idempotent)
        $result = & "$PGPath\bin\psql.exe" -U postgres -d postgres -t -c "SELECT 1 FROM pg_database WHERE datname='archive_management'" 2>$null
        $result = $result.Trim()

        if ([string]::IsNullOrWhiteSpace($result)) {
            Write-Host "  - Creating database..." -ForegroundColor Yellow

            # Suppress errors from createdb (might fail if DB exists)
            $ErrorActionPreference = "Continue"
            try {
                & "$PGPath\bin\createdb.exe" -U postgres archive_management 2>&1 | Out-Null
            } catch {}
            $ErrorActionPreference = "Stop"

            Start-Sleep -Seconds 2

            # Verify database exists
            $verify = & "$PGPath\bin\psql.exe" -U postgres -d postgres -t -c "SELECT 1 FROM pg_database WHERE datname='archive_management'" 2>$null
            $verify = $verify.Trim()

            if (-not [string]::IsNullOrWhiteSpace($verify)) {
                Write-Host "  - Database 'archive_management' created" -ForegroundColor Green
            } else {
                Write-Host "  - Warning: Database creation may have failed" -ForegroundColor Yellow
            }
        } else {
            Write-Host "  - Database 'archive_management' already exists" -ForegroundColor Gray
        }
    }
} catch {
    Write-Host "  - Warning: PostgreSQL may not be running properly" -ForegroundColor Yellow
}

# ============================================================================
# Step 5: Install Node.js
# ============================================================================
Write-Host ""
Write-Host "[Step 5/8] Configuring Node.js..." -ForegroundColor Yellow

if ($NodeInstalled) {
    Write-Host "  - Node.js is installed" -ForegroundColor Gray
} else {
    $NodeExe = Get-ChildItem -Path $PackagesPath -Filter "nodejs-*.msi" -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($NodeExe) {
        Write-Host "  - Installing Node.js..." -ForegroundColor Yellow
        Start-Process -FilePath "msiexec.exe" -ArgumentList "/i", $NodeExe.FullName, "/quiet", "/norestart" -Wait -NoNewWindow
        
        if (Test-Path "C:\Program Files\nodejs\node.exe") {
            Write-Host "  - Node.js installed" -ForegroundColor Green
            $NodeInstalled = $true
        }
    }
}

# ============================================================================
# Step 6: Install PM2
# ============================================================================
Write-Host ""
Write-Host "[Step 6/8] Configuring PM2..." -ForegroundColor Yellow

if ($PM2Installed) {
    Write-Host "  - PM2 is installed" -ForegroundColor Gray
} else {
    $npmPath = "C:\Program Files\nodejs\npm.cmd"
    if (Test-Path $npmPath) {
        Write-Host "  - Installing PM2..." -ForegroundColor Yellow
        
        # Use Chinese mirror
        & $npmPath config set registry https://registry.npmmirror.com 2>$null | Out-Null
        & $npmPath install -g pm2 2>$null | Out-Null
        & $npmPath config set registry https://registry.npmjs.org 2>$null | Out-Null
        
        if (Test-Path "$env:APPDATA\npm\pm2.cmd") {
            Write-Host "  - PM2 installed" -ForegroundColor Green
            $PM2Installed = $true
        }
    }
}

# ============================================================================
# Step 7: Install Meilisearch + Create Windows Service
# ============================================================================
Write-Host ""
Write-Host "[Step 7/8] Configuring Meilisearch..." -ForegroundColor Yellow

$MeiliPath = "C:\Program Files\Meilisearch\meilisearch.exe"
$MeiliService = Get-Service -Name Meilisearch -ErrorAction SilentlyContinue

# Check if service already exists
if ($MeiliService) {
    Write-Host "  - Meilisearch service exists ($($MeiliService.Status))" -ForegroundColor Green
} else {
    # Check if executable exists
    if (-not (Test-Path $MeiliPath)) {
        $MeiliExe = Get-ChildItem -Path $PackagesPath -Filter "meilisearch*.exe" -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($MeiliExe) {
            Write-Host "  - Installing Meilisearch executable..." -ForegroundColor Yellow

            if (-not (Test-Path "C:\Program Files\Meilisearch")) {
                New-Item -ItemType Directory -Path "C:\Program Files\Meilisearch" -Force | Out-Null
            }

            Copy-Item -Path $MeiliExe.FullName -Destination $MeiliPath -Force
            Write-Host "  - Meilisearch executable installed" -ForegroundColor Green
        } else {
            Write-Host "  - Meilisearch executable not found in packages" -ForegroundColor Red
        }
    } else {
        Write-Host "  - Meilisearch executable exists" -ForegroundColor Gray
    }

    # Create Windows service only if executable exists and service doesn't exist
    if ((Test-Path $MeiliPath) -and -not (Get-Service -Name Meilisearch -ErrorAction SilentlyContinue)) {
        Write-Host "  - Creating Meilisearch service..." -ForegroundColor Yellow

        # Stop existing process if any
        Stop-Process -Name meilisearch -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 2

        # Get Meilisearch key from .env
        $EnvPath = "$ArchiveHome\config\.env"
        $MeiliKey = "defaultKey"
        if (Test-Path $EnvPath) {
            $keyLine = Select-String "MEILI_MASTER_KEY=" $EnvPath | Select-Object -First 1
            if ($keyLine) {
                $MeiliKey = $keyLine.Line.Split("=")[1].Trim()
            }
        }

        # Create service
        $binPath = "`"$MeiliPath`" --master-key=`"$MeiliKey`" --db-path=`"$ArchiveHome\data\meilisearch`" --http-addr=`"localhost:7700`""

        sc.exe create Meilisearch binPath= $binPath start= demand DisplayName= "Meilisearch Search Engine" 2>&1 | Out-Null

        Start-Sleep -Seconds 2

        # Re-check if service was created
        $MeiliService = Get-Service -Name Meilisearch -ErrorAction SilentlyContinue
        if ($MeiliService) {
            Write-Host "  - Meilisearch service created" -ForegroundColor Green

            # Start service
            sc.exe start Meilisearch 2>&1 | Out-Null
            Start-Sleep -Seconds 5

            $MeiliService = Get-Service -Name Meilisearch -ErrorAction SilentlyContinue
            if ($MeiliService -and $MeiliService.Status -eq "Running") {
                Write-Host "  - Meilisearch service started" -ForegroundColor Green
            } else {
                Write-Host "  - Meilisearch service created but not running" -ForegroundColor Yellow
            }
        } else {
            # Service creation failed, try as background process
            Write-Host "  - Service creation failed, starting as background process..." -ForegroundColor Yellow
            Start-Process -FilePath $MeiliPath -ArgumentList "--master-key=$MeiliKey", "--db-path=$ArchiveHome\data\meilisearch", "--http-addr=localhost:7700" -WindowStyle Hidden

            Start-Sleep -Seconds 5

            $portCheck = netstat -an | Select-String ":7700"
            if ($portCheck) {
                Write-Host "  - Meilisearch started (background process)" -ForegroundColor Green
            } else {
                Write-Host "  - Failed to start Meilisearch" -ForegroundColor Red
            }
        }
    }
}

# ============================================================================
# Step 8: Copy application files
# ============================================================================
Write-Host ""
Write-Host "[Step 8/8] Copying application files..." -ForegroundColor Yellow

# Copy config
$ConfigDir = Join-Path $InstallPath "config"
if (Test-Path $ConfigDir) {
    Copy-Item -Path "$ConfigDir\*" -Destination "$ArchiveHome\config" -Recurse -Force
}

# Copy scripts
$ScriptsDir = Join-Path $InstallPath "scripts"
if (Test-Path $ScriptsDir) {
    Copy-Item -Path "$ScriptsDir\*.bat" -Destination "$ArchiveHome\scripts" -Force
    Copy-Item -Path "$ScriptsDir\*.ps1" -Destination "$ArchiveHome\scripts" -Force
}

# Copy services
$ServicesDir = Join-Path $InstallPath "services"
if (Test-Path $ServicesDir) {
    Copy-Item -Path "$ServicesDir\*.json" -Destination "$ArchiveHome\services" -Force
}

# Copy init-data
$InitDataDir = Join-Path $InstallPath "init-data"
if (Test-Path $InitDataDir) {
    Copy-Item -Path "$InitDataDir\*.sql" -Destination "$ArchiveHome\init-data" -Force
}

# Copy app directory
$AppSource = Join-Path $InstallPath "app"
$AppTarget = Join-Path $ArchiveHome "app"
if ((Test-Path $AppSource) -and ($InstallPath -ne $ArchiveHome)) {
    Write-Host "  - Copying application..." -ForegroundColor Yellow

    if (-not (Test-Path $AppTarget)) {
        New-Item -ItemType Directory -Path $AppTarget -Force | Out-Null
    }

    # Use robocopy for faster and more reliable copying
    # /E = copy subdirectories including empty ones
    # /MIR = mirror directory tree
    # /R:0 = no retry count
    # /W:0 = no wait
    # /MT = multi-threaded copy
    Write-Host "  - Copying all application files..." -ForegroundColor Gray
    $roboResult = robocopy $AppSource $AppTarget /E /MIR /R:0 /W:0 /MT:4 2>&1

    # robocopy returns 0-7 for success, 8+ for errors
    if ($LASTEXITCODE -ge 8) {
        Write-Host "  - Warning: Some files may not have been copied (exit code: $LASTEXITCODE)" -ForegroundColor Yellow
    }

    Write-Host "  - Application copied" -ForegroundColor Green
    
    # Re-copy .env to app directory (robocopy /MIR may have deleted it)
    $EnvPath = "$ArchiveHome\config\.env"
    $AppEnvPath = "$ArchiveHome\app\.env"
    if (Test-Path $EnvPath) {
        Copy-Item -Path $EnvPath -Destination $AppEnvPath -Force
        Write-Host "  - .env copied to app directory" -ForegroundColor Green
    }
}

Write-Host "  - Files copied" -ForegroundColor Green

# ============================================================================
# Auto-start services after installation
# ============================================================================
Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "Starting all services..." -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Start PostgreSQL
Write-Host "[1/3] PostgreSQL..." -ForegroundColor Yellow
try {
    Start-Service -Name PostgreSQL -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 3
    if ((Get-Service PostgreSQL -ErrorAction SilentlyContinue).Status -eq "Running") {
        Write-Host "  - PostgreSQL started" -ForegroundColor Green
    }
} catch {
    Write-Host "  - Failed to start PostgreSQL" -ForegroundColor Red
}

# Start Meilisearch (already started above, just verify)
Write-Host "[2/3] Meilisearch..." -ForegroundColor Yellow
$meiliRunning = $false
try {
    $svc = Get-Service -Name Meilisearch -ErrorAction SilentlyContinue
    if ($svc -and $svc.Status -eq "Running") {
        $meiliRunning = $true
    }
} catch {}

if (-not $meiliRunning) {
    try {
        Start-Service -Name Meilisearch -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 3
    } catch {
        # Start as process
        Start-Process -FilePath $MeiliPath -ArgumentList "--master-key=$MeiliKey", "--db-path=$ArchiveHome\data\meilisearch", "--http-addr=localhost:7700" -WindowStyle Hidden
        Start-Sleep -Seconds 5
    }
}

$meiliCheck = netstat -an | Select-String ":7700"
if ($meiliCheck) {
    Write-Host "  - Meilisearch started" -ForegroundColor Green
} else {
    Write-Host "  - Meilisearch may not be ready" -ForegroundColor Yellow
}

# ============================================================================
# Initialize Database (Run migrations and seed data)
# ============================================================================
Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "Initializing Database..." -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

$PGPath = "C:\Program Files\PostgreSQL\16"

# Check if PostgreSQL is running
$pgService = Get-Service -Name PostgreSQL -ErrorAction SilentlyContinue
if (-not $pgService -or $pgService.Status -ne "Running") {
    Write-Host "  - Starting PostgreSQL service..." -ForegroundColor Yellow
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
    Write-Host "  - ERROR: PostgreSQL is not responding" -ForegroundColor Red
    Write-Host "    Please check PostgreSQL installation" -ForegroundColor Yellow
} else {
    Write-Host "  - PostgreSQL is ready" -ForegroundColor Green

    # Create database if not exists
    try {
        $dbExists = & "$PGPath\bin\psql.exe" -U postgres -d postgres -t -c "SELECT 1 FROM pg_database WHERE datname='archive_management'" 2>$null
        $dbExists = $dbExists.Trim()

        if ([string]::IsNullOrWhiteSpace($dbExists)) {
            Write-Host "  - Creating database 'archive_management'..." -ForegroundColor Yellow

            # Try to create database (suppress errors)
            $ErrorActionPreference = "Continue"
            try {
                & "$PGPath\bin\createdb.exe" -U postgres archive_management 2>&1 | Out-Null
            } catch {
                # Ignore errors - we'll check if database exists below
            }
            $ErrorActionPreference = "Stop"

            Start-Sleep -Seconds 2

            # Verify database was created (or already exists)
            $dbCheck = & "$PGPath\bin\psql.exe" -U postgres -d postgres -t -c "SELECT 1 FROM pg_database WHERE datname='archive_management'" 2>$null
            $dbCheck = $dbCheck.Trim()

            if (-not [string]::IsNullOrWhiteSpace($dbCheck)) {
                Write-Host "  - Database 'archive_management' ready" -ForegroundColor Green
            } else {
                Write-Host "  - Warning: Database creation may have failed" -ForegroundColor Yellow
            }
        } else {
            Write-Host "  - Database 'archive_management' already exists" -ForegroundColor Gray
        }
    } catch {
        Write-Host "  - Warning: Database check failed" -ForegroundColor Yellow
    }

    # Check if tables already exist
    $ErrorActionPreference = "Continue"
    try {
        # Use -q (quiet) to suppress NOTICE messages
        $tableCheck = & "$PGPath\bin\psql.exe" -U postgres -d archive_management -q -t -c "SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='User'" 2>$null
    } catch {}
    $ErrorActionPreference = "Stop"

    if ([string]::IsNullOrWhiteSpace($tableCheck)) {
        Write-Host "  - Creating database schema..." -ForegroundColor Yellow

        # Execute schema SQL
        $schemaSQL = "$ArchiveHome\init-data\init-schema.sql"
        if (Test-Path $schemaSQL) {
            $ErrorActionPreference = "Continue"
            try {
                # Use -q (quiet) and capture all output
                $output = & "$PGPath\bin\psql.exe" -U postgres -d archive_management -q -f $schemaSQL 2>&1
                $exitCode = $LASTEXITCODE
            } catch {}
            $ErrorActionPreference = "Stop"

            if ($exitCode -eq 0) {
                Write-Host "  - Database schema created successfully" -ForegroundColor Green
            } else {
                # Check if it's just "already exists" warnings
                $verifyCheck = & "$PGPath\bin\psql.exe" -U postgres -d archive_management -q -t -c "SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='User'" 2>$null
                if (-not [string]::IsNullOrWhiteSpace($verifyCheck)) {
                    Write-Host "  - Database schema already exists" -ForegroundColor Gray
                } else {
                    Write-Host "  - Warning: Schema creation may have issues" -ForegroundColor Yellow
                }
            }
        } else {
            Write-Host "  - ERROR: init-schema.sql not found at $schemaSQL" -ForegroundColor Red
        }
    } else {
        Write-Host "  - Database schema already exists" -ForegroundColor Gray
    }

    # Check if we need to insert initial data
    # Use -t (tuples only) and escape quotes properly
    $ErrorActionPreference = "Continue"
    try {
        # In PowerShell: use "" to escape " in SQL string
        $checkAdmin = & "$PGPath\bin\psql.exe" -U postgres -d archive_management -q -t -c "SELECT 1 FROM ""User"" WHERE username='admin' LIMIT 1" 2>$null
    } catch {}
    $ErrorActionPreference = "Stop"

    if ($checkAdmin -notmatch "1") {
        Write-Host "  - Inserting initial data..." -ForegroundColor Yellow

        $initSQL = "$ArchiveHome\init-data\init-database.sql"
        if (Test-Path $initSQL) {
            $ErrorActionPreference = "Continue"
            try {
                # Use -q (quiet) to suppress notices
                $sqlOutput = & "$PGPath\bin\psql.exe" -U postgres -d archive_management -q -f $initSQL 2>&1
                $exitCode = $LASTEXITCODE
            } catch {}
            $ErrorActionPreference = "Stop"

            if ($exitCode -eq 0) {
                Write-Host "  - Initial data inserted successfully" -ForegroundColor Green
            } else {
                # Check if admin user actually exists now
                $verifyUser = & "$PGPath\bin\psql.exe" -U postgres -d archive_management -q -t -c "SELECT 1 FROM \""User\"" WHERE username='admin'" 2>$null
                if (-not [string]::IsNullOrWhiteSpace($verifyUser)) {
                    Write-Host "  - Initial data already exists" -ForegroundColor Gray
                } else {
                    Write-Host "  - Warning: Initial data insertion may have issues" -ForegroundColor Yellow
                }
            }
        } else {
            Write-Host "  - Warning: init-database.sql not found" -ForegroundColor Yellow
        }
    } else {
        Write-Host "  - Initial data already exists (admin user found)" -ForegroundColor Gray
    }
}

Write-Host ""

# Start Application via PM2
Write-Host "[3/3] Application..." -ForegroundColor Yellow

if ($PM2Installed) {
    $pm2 = "$env:APPDATA\npm\pm2.cmd"
    $npm = "C:\Program Files\nodejs\npm.cmd"
    $ecosystem = "$ArchiveHome\app\ecosystem.config.js"
    $packageJson = "$ArchiveHome\app\package.json"

    if (Test-Path $ecosystem) {
        # Create logs directory if not exists
        $logsDir = "$ArchiveHome\app\logs"
        if (-not (Test-Path $logsDir)) {
            New-Item -ItemType Directory -Path $logsDir -Force | Out-Null
        }

        cd "$ArchiveHome\app"

        # Install npm dependencies if package.json exists and node_modules not exists
        if ((Test-Path $packageJson) -and -not (Test-Path "$ArchiveHome\app\node_modules")) {
            Write-Host "  - Installing npm dependencies..." -ForegroundColor Yellow

            # Use Chinese mirror for faster download
            & $npm config set registry https://registry.npmmirror.com 2>$null | Out-Null
            & $npm install --production 2>&1 | Out-Null
            & $npm config set registry https://registry.npmjs.org 2>$null | Out-Null

            if (Test-Path "$ArchiveHome\app\node_modules") {
                Write-Host "  - Dependencies installed" -ForegroundColor Green
            } else {
                Write-Host "  - Warning: Dependencies may not be fully installed" -ForegroundColor Yellow
            }
        }

        # Stop existing (ignore errors if not exists)
        try { & $pm2 delete archive-management 2>$null } catch {}
        try { & $pm2 stop archive-management 2>$null } catch {}

        # Start application
        $result = & $pm2 start $ecosystem 2>&1 | Out-String

        Start-Sleep -Seconds 8

        $appCheck = netstat -an | Select-String ":3000"
        if ($appCheck) {
            Write-Host "  - Application started (PM2)" -ForegroundColor Green
        } else {
            Write-Host "  - Application may not be ready yet" -ForegroundColor Yellow
        }
    } else {
        Write-Host "  - ecosystem.config.js not found" -ForegroundColor Red
    }
} else {
    Write-Host "  - PM2 not installed" -ForegroundColor Red
}

# ============================================================================
# Completion
# ============================================================================
Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "Installation Complete!" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Installation path: $ArchiveHome" -ForegroundColor Gray
Write-Host "Default account: admin / admin123" -ForegroundColor Gray
Write-Host ""
Write-Host "Access URLs:" -ForegroundColor Cyan
Write-Host "  Application:  http://localhost:3000" -ForegroundColor Gray
Write-Host "  Search:       http://localhost:7700" -ForegroundColor Gray
Write-Host ""
Write-Host "Management Scripts:" -ForegroundColor Cyan
Write-Host "  $ArchiveHome\scripts\start.bat   - Start all services" -ForegroundColor Gray
Write-Host "  $ArchiveHome\scripts\stop.bat    - Stop all services" -ForegroundColor Gray
Write-Host "  $ArchiveHome\scripts\monitor.bat - Monitor & management" -ForegroundColor Gray
Write-Host ""
