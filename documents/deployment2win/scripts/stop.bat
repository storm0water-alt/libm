@echo off
chcp 65001 >nul
echo ================================================
echo 档案管理系统 - 停止服务
echo ================================================
echo.

set "SCRIPT_PATH=%~dp0"
set "ARCHIVE_HOME=%~dp0.."

:: 读取安装配置
if exist "%ARCHIVE_HOME%\config.ini" (
    for /f "usebackq tokens=1,2 delims==" %%a in ("%ARCHIVE_HOME%\config.ini") do set "%%a=%%b"
)

if not defined ARCHIVE_HOME (
    echo 错误: 未找到 config.ini，请先运行 install.bat
    pause
    exit /b 1
)

set "NPM_PATH=%APPDATA%\npm"

echo [1/3] 停止应用...
if exist "%NPM_PATH%\pm2.cmd" (
    "%NPM_PATH%\pm2.cmd" stop archive-management
    "%NPM_PATH%\pm2.cmd" kill
    echo   - 应用已停止 (PM2)
) else (
    taskkill /F /IM node.exe >nul 2>&1
    echo   - 应用已停止
)

echo.
echo [2/3] 停止 Meilisearch...
taskkill /F /IM meilisearch.exe >nul 2>&1
echo   - Meilisearch 已停止

echo.
echo [3/3] 停止 PostgreSQL...
net stop PostgreSQL
echo   - PostgreSQL 已停止

echo.
echo ================================================
echo 所有服务已停止
echo ================================================
pause
