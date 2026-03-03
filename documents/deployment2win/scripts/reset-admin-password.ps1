# Reset Admin Password Script
# Usage: .\reset-admin-password.ps1 [-Password "newpassword"]
# Encoding: UTF-8

param(
    [string]$Password = "admin123"
)

$ErrorActionPreference = "Stop"

# Colors for output
function Write-Info { Write-Host "[INFO] $args" -ForegroundColor Cyan }
function Write-Success { Write-Host "[SUCCESS] $args" -ForegroundColor Green }
function Write-Err { Write-Host "[ERROR] $args" -ForegroundColor Red }
function Write-Warn { Write-Host "[WARNING] $args" -ForegroundColor Yellow }

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   Admin Password Reset Tool" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Find PostgreSQL installation
$pgPaths = @(
    "C:\Program Files\PostgreSQL\16\bin",
    "C:\Program Files\PostgreSQL\15\bin",
    "C:\Program Files\PostgreSQL\14\bin",
    "C:\Program Files\PostgreSQL\13\bin"
)

$psqlPath = $null
foreach ($path in $pgPaths) {
    if (Test-Path "$path\psql.exe") {
        $psqlPath = $path
        break
    }
}

if (-not $psqlPath) {
    # Try to find in PATH
    $psqlInPath = Get-Command psql -ErrorAction SilentlyContinue
    if ($psqlInPath) {
        $psqlPath = Split-Path $psqlInPath.Source
    }
}

if (-not $psqlPath) {
    Write-Err "PostgreSQL not found. Please install PostgreSQL or add it to PATH."
    exit 1
}

Write-Info "Found PostgreSQL at: $psqlPath"

# Load config
$configPath = "$PSScriptRoot\..\config\config.json"
if (-not (Test-Path $configPath)) {
    Write-Err "Config file not found: $configPath"
    exit 1
}

$config = Get-Content $configPath | ConvertFrom-Json
$dbConfig = $config.database

Write-Info "Database: $($dbConfig.database) on $($dbConfig.host):$($dbConfig.port)"

# Set environment variables for passwordless connection
$env:PGHOST = $dbConfig.host
$env:PGPORT = $dbConfig.port
$env:PGDATABASE = $dbConfig.database
$env:PGUSER = $dbConfig.user

# Find Node.js
$nodePath = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodePath) {
    Write-Err "Node.js not found. Please install Node.js."
    exit 1
}

Write-Info "Found Node.js at: $($nodePath.Source)"

# Find bcryptjs module
$bcryptPaths = @(
    "$PSScriptRoot\..\app\node_modules\bcryptjs",
    "$PSScriptRoot\..\..\app\node_modules\bcryptjs",
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
    Write-Warn "bcryptjs module not found"
    Write-Info "Please run the following command manually in the app directory:"
    Write-Host ""
    Write-Host "  cd C:\ArchiveManagement\app" -ForegroundColor Yellow
    Write-Host "  node -e \"const bcrypt = require('bcryptjs'); console.log(bcrypt.hashSync('$Password', 10));\"" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Then update the database with the generated hash."
    exit 1
}

Write-Info "Found bcryptjs at: $bcryptPath"

# Generate bcrypt hash using Node.js (single line to avoid encoding issues)
Write-Info "Generating password hash..."

$nodeCmd = "const bcrypt = require('$bcryptPath'); console.log(bcrypt.hashSync('$Password', 10));"
$hash = & "$($nodePath.Source)" -e $nodeCmd 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Err "Failed to generate hash: $hash"
    exit 1
}

$hash = $hash.Trim()
Write-Info "Generated hash: $($hash.Substring(0, [Math]::Min(20, $hash.Length)))..."

# Update password in database
Write-Info "Updating admin password in database..."

# Use double quotes for SQL to handle the hash properly
$updateSql = "UPDATE \""User\"" SET password = '$hash' WHERE username = 'admin';"
$updateResult = & "$psqlPath\psql.exe" -c $updateSql 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Err "Failed to update password: $updateResult"
    Write-Info "Trying alternative method..."

    # Try with explicit connection string
    $connStr = "postgresql://$($dbConfig.user)@$($dbConfig.host):$($dbConfig.port)/$($dbConfig.database)"
    $updateResult = & "$psqlPath\psql.exe" "$connStr" -c $updateSql 2>&1

    if ($LASTEXITCODE -ne 0) {
        Write-Err "Alternative method also failed: $updateResult"
        Write-Host ""
        Write-Info "Please check PostgreSQL authentication settings."
        Write-Info "Run: .\fix-postgres-auth.ps1"
        exit 1
    }
}

# Verify update
Write-Info "Verifying password update..."
$verifySql = "SELECT username, role, status FROM \""User\"" WHERE username='admin';"
$verifyResult = & "$psqlPath\psql.exe" -c $verifySql 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Success "Password reset successfully!"
    Write-Host ""
    Write-Host "Admin credentials:" -ForegroundColor Green
    Write-Host "  Username: admin" -ForegroundColor White
    Write-Host "  Password: $Password" -ForegroundColor White
    Write-Host ""
    Write-Info "User info:"
    Write-Host $verifyResult
} else {
    Write-Err "Verification failed: $verifyResult"
    exit 1
}

Write-Host ""
Write-Info "Done. You can now login with the new password."
