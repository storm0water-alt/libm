@echo off
chcp 65001 >nul
REM ============================================================
REM Archive Management System - Admin User Verification Tool
REM ============================================================
echo.
echo ================================================
echo Admin User Verification Tool
echo ================================================
echo.
REM Set paths
set PGPATH=C:\Program Files\PostgreSQL\16\bin
set PSQL=%PGPATH%\psql.exe
set DBNAME=archive_management
echo [Step 1/5] Checking database connection...
echo.
%PSQL% -U postgres -d %DBNAME% -c "SELECT 1;" >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Cannot connect to database
    echo Please check if PostgreSQL service is running
    pause
    exit /b 1
)
echo [OK] Database connection successful
echo.
echo [Step 2/5] Checking admin user...
echo.
%PSQL% -U postgres -d %DBNAME% -c "SELECT username, role, status FROM \""User\"" WHERE username='admin';"
if errorlevel 1 (
    echo [ERROR] Failed to query admin user
    pause
    exit /b 1
)
echo.
echo [Step 3/5] Checking password hash...
echo.
%PSQL% -U postgres -d %DBNAME% -c "SELECT username, substring(password, 1, 10) as hash_prefix, length(password) as hash_length FROM \""User\"" WHERE username='admin';"
if errorlevel 1 (
    echo [ERROR] Failed to query password hash
    pause
    exit /b 1
)
echo.
echo [Step 4/5] Testing bcrypt password 'admin123'...
echo.
REM Create temp SQL file to test password
echo SELECT username FROM "User" WHERE username='admin' AND password = crypt('admin123', password); > %TEMP%\test_password.sql
%PSQL% -U postgres -d %DBNAME% -f %TEMP%\test_password.sql
if errorlevel 1 (
    echo [WARN] Password verification query failed
)
del %TEMP%\test_password.sql >nul 2>&1
echo.
echo [Step 5/5] Checking all users...
echo.
%PSQL% -U postgres -d %DBNAME% -c "SELECT username, role, status FROM \""User\"" ORDER BY username;"
echo.
echo ================================================
echo Verification Complete
echo ================================================
echo.
echo If admin user exists and password is correct, try login with:
echo   Username: admin
echo   Password: admin123
echo.
echo If still fails, check:
echo   1. PM2 logs: pm2 logs archive-management
echo   2. Application logs: type C:\ArchiveManagement\app\logs\combined.log
echo   3. Browser Network tab for actual error message
echo.
pause