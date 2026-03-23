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

# Find bcryptjs module - search in multiple possible locations
# Note: Next.js standalone build places node_modules in app/node_modules/
$installPath = Split-Path $PSScriptRoot -Parent
Write-Info "Installation path: $installPath"

$bcryptPaths = @(
    # Next.js standalone build location (primary)
    "$installPath\app\node_modules\bcryptjs",
    # Relative paths
    "$PSScriptRoot\..\app\node_modules\bcryptjs",
    "$PSScriptRoot\..\..\app\node_modules\bcryptjs",
    # Common installation locations
    "C:\ArchiveManagement\app\node_modules\bcryptjs",
    "C:\archive-management\app\node_modules\bcryptjs"
)

$bcryptPath = $null
foreach ($path in $bcryptPaths) {
    try {
        $normalizedPath = [System.IO.Path]::GetFullPath($path)
        Write-Host "  Checking: $normalizedPath" -ForegroundColor Gray
        if (Test-Path $normalizedPath) {
            $bcryptPath = $normalizedPath
            Write-Host "  Found!" -ForegroundColor Green
            break
        }
    } catch {}
}

# If not found, try to search recursively
if (-not $bcryptPath) {
    Write-Host ""
    Write-Warn "bcryptjs not found in standard locations, searching recursively..."
    $appPath = "$installPath\app"
    if (Test-Path $appPath) {
        Write-Info "Searching in: $appPath"
        $found = Get-ChildItem -Path $appPath -Recurse -Filter "bcrypt.js" -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($found) {
            # bcryptjs package directory is two levels up from bcrypt.js
            $bcryptPath = Split-Path (Split-Path $found.FullName -Parent) -Parent
            Write-Info "Found bcryptjs at: $bcryptPath"
        } else {
            # Try alternative: look for index.js in bcryptjs folder
            $found = Get-ChildItem -Path $appPath -Recurse -Directory -Filter "bcryptjs" -ErrorAction SilentlyContinue | Select-Object -First 1
            if ($found) {
                $bcryptPath = $found.FullName
                Write-Info "Found bcryptjs directory at: $bcryptPath"
            }
        }
    }
}

if (-not $bcryptPath) {
    Write-Host ""
    Write-Err "bcryptjs module not found!"
    Write-Host ""
    Write-Host "Possible causes:" -ForegroundColor Yellow
    Write-Host "  1. The app was not properly installed"
    Write-Host "  2. node_modules was not included in the deployment"
    Write-Host ""
    Write-Info "Solutions:"
    Write-Host ""
    Write-Host "  Option 1: Run npm install in the app directory" -ForegroundColor Yellow
    Write-Host "            cd $installPath\app" -ForegroundColor Gray
    Write-Host "            npm install bcryptjs" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  Option 2: Rebuild the deployment package" -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

Write-Info "Using bcryptjs from: $bcryptPath"

# Generate bcrypt hash using Node.js via temp file (more reliable than -e)
Write-Info "Generating password hash..."

$tempJsFile = Join-Path $env:TEMP "genhash-$([Guid]::NewGuid().ToString()).js"
try {
    # Escape backslashes for JavaScript string
    $bcryptPathJs = $bcryptPath.Replace('\', '\\')
    $jsCode = "const bcrypt = require('$bcryptPathJs'); console.log(bcrypt.hashSync('$Password', 10));"
    Set-Content -Path $tempJsFile -Value $jsCode -Encoding UTF8 -NoNewline

    $hash = & "$($nodePath.Source)" $tempJsFile 2>&1

    if ($LASTEXITCODE -ne 0) {
        Write-Err "Failed to generate hash: $hash"
        exit 1
    }

    $hash = $hash.Trim()
    Write-Info "Generated hash: $($hash.Substring(0, [Math]::Min(20, $hash.Length)))..."
} finally {
    # Clean up temp file
    if (Test-Path $tempJsFile) {
        Remove-Item $tempJsFile -Force -ErrorAction SilentlyContinue
    }
}

# Update password in database
Write-Info "Updating admin password in database..."

# Use temp SQL file to avoid PowerShell quoting issues with psql
$tempSqlFile = Join-Path $env:TEMP "updatepwd-$([Guid]::NewGuid().ToString()).sql"
try {
    # Write SQL to temp file (avoids all quoting issues)
    $updateSql = "UPDATE `"User`" SET password = '$hash' WHERE username = 'admin';"
    Set-Content -Path $tempSqlFile -Value $updateSql -Encoding UTF8 -NoNewline

    # Set PostgreSQL connection environment variables
    $env:PGHOST = $dbConfig.host
    $env:PGPORT = $dbConfig.port
    $env:PGDATABASE = $dbConfig.database
    $env:PGUSER = $dbConfig.user

    $updateResult = & "$psqlPath\psql.exe" -f $tempSqlFile 2>&1

    if ($LASTEXITCODE -ne 0) {
        Write-Err "Failed to update password: $updateResult"
        exit 1
    }
} finally {
    if (Test-Path $tempSqlFile) {
        Remove-Item $tempSqlFile -Force -ErrorAction SilentlyContinue
    }
}

# Verify update
Write-Info "Verifying password update..."
$tempVerifyFile = Join-Path $env:TEMP "verify-$([Guid]::NewGuid().ToString()).sql"
try {
    $verifySql = "SELECT username, role, status FROM `"User`" WHERE username='admin';"
    Set-Content -Path $tempVerifyFile -Value $verifySql -Encoding UTF8 -NoNewline
    $verifyResult = & "$psqlPath\psql.exe" -f $tempVerifyFile 2>&1
} finally {
    if (Test-Path $tempVerifyFile) {
        Remove-Item $tempVerifyFile -Force -ErrorAction SilentlyContinue
    }
}

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
