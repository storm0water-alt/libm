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
        Write-Host "  Solution: Re-run install.bat to create the database" -ForegroundColor $Yellow
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
            Write-Host "  Solution: Re-run install.bat to create the database schema" -ForegroundColor $Yellow
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
        Write-Host "  Solution: Run init-database.sql manually or re-run install.bat" -ForegroundColor $Yellow
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


    if ($LASTEXITCODE -eq 6) {
        Write-Host "  Connection: SUCCESS" -ForegroundColor $Green
    } else {
        Write-Host "  Connection: FAILED" -ForegroundColor $Red
        Write-Host "  ERROR: Cannot connect to database!" -ForegroundColor $Red
        Write-Host "  Check if PostgreSQL is running and PostgreSQL service is started" -ForegroundColor $Yellow
    }
}

