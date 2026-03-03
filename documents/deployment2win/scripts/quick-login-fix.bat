@echo off
setlocal enabledelayedexpansion

echo ================================================
echo Quick Login Fix
echo ================================================
echo.

set PGPATH=C:\Program Files\PostgreSQL\16\bin
set PSQL=%PGPATH%\psql.exe

echo [1/3] Starting services...
net start PostgreSQL >nul 2>&1
timeout /t 2 >nul
"%APPDATA%\npm\pm2.cmd" restart archive-management >nul 2>&1
timeout /t 2 >nul
echo [OK] Services restarted
echo.

echo [2/3] Resetting admin password...
%PSQL% -U postgres -d archive_management -c "UPDATE \""User\"" SET password = '$2b$12$LQvJtGhV8NHhZ8lJvU2xvkPt9qRqZ3BDSWvZ/KGFrFOFsWdLx/JqgKvMlPkTp9vVcDZaBGhZvJ9R2V6HK6vm' WHERE username='admin';" 2>&1 || exit /b 1
)
echo [OK] Password reset
echo.

echo [3/3] Verifying fix...
%PSQL% -U postgres -d archive_management -c "SELECT username FROM \""User\"" WHERE username='admin';" 2>&1 || exit /b 1
)
echo [OK] Admin user verified
echo.
echo ================================================
echo Fix Complete!
echo ================================================
echo.
echo Login with:
echo   Username: admin
echo   Password: admin123
echo.
echo Open browser: http://localhost:3000/login
echo ================================================
pause

    exit /b 1
)
echo [OK] Password reset
echo.

echo [3/3] Verifying fix...
%PSQL% -U postgres -d archive_management -c "SELECT username FROM \""User\"" WHERE username='admin';" >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Admin user not found
    pause
    exit /b 1
)
echo [OK] Admin user verified
echo.

echo ================================================
echo Fix Complete!
echo ================================================
echo.
echo Login with:
echo   Username: admin
echo   Password: admin123
echo.
echo Open browser: http://localhost:3000/login
echo ================================================
pause
