@echo off
chcp 65001 >nul
echo ================================================
echo 档案管理系统 - 启动服务
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

set "PGPATH=C:\Program Files\PostgreSQL\16\bin"
set "MEILIPATH=C:\Program Files\Meilisearch\meilisearch.exe"
set "NPM_PATH=%APPDATA%\npm"

echo 安装目录: %ARCHIVE_HOME%
echo.

echo [1/4] 启动 PostgreSQL...
net start PostgreSQL >nul 2>&1
timeout /t 10 /nobreak >nul
echo   - PostgreSQL 已启动

echo.
echo [2/4] 初始化数据库...
if exist "%PGPATH%\psql.exe" (
    "%PGPATH%\psql.exe" -U postgres -d archive_management -c "SELECT 1;" >nul 2>&1
    if errorlevel 1 (
        echo   - 创建数据库...
        "%PGPATH%\createdb.exe" -U postgres archive_management
        "%PGPATH%\psql.exe" -U postgres -d archive_management -f "%ARCHIVE_HOME%\init-data\init-database.sql"
    )
    echo   - 数据库就绪
) else (
    echo   - PostgreSQL 未正确安装，请先运行 install.bat
    pause
    exit /b 1
)

echo.
echo [3/4] 启动 Meilisearch...
for /f "usebackq tokens=2 delims==" %%a in (`findstr /c:"MEILISEARCH_MASTER_KEY=" "%ARCHIVE_HOME%\config\.env"`) do set "MEILIKEY=%%a"
if exist "%MEILIPATH%" (
    start /B "" "%MEILIPATH%" --master-key="%MEILIKEY%" --db-path="%ARCHIVE_HOME%\data\meilisearch" --http-addr="localhost:7700" >"%ARCHIVE_HOME%\logs\meilisearch.log" 2>&1
    timeout /t 5 /nobreak >nul
    echo   - Meilisearch 已启动
) else (
    echo   - Meilisearch 未安装，请先运行 install.bat
)

echo.
echo [4/4] 启动应用...
for /f "usebackq tokens=2 delims==" %%a in (`findstr /c:"POSTGRES_PASSWORD=" "%ARCHIVE_HOME%\config\.env"`) do set "DB_PASS=%%a"
for /f "usebackq tokens=2 delims==" %%a in (`findstr /c:"NEXTAUTH_SECRET=" "%ARCHIVE_HOME%\config\.env"`) do set "AUTH_KEY=%%a"
for /f "usebackq tokens=2 delims==" %%a in (`findstr /c:"MEILISEARCH_MASTER_KEY=" "%ARCHIVE_HOME%\config\.env"`) do set "MEILI_KEY=%%a"

set "DATABASE_URL=postgresql://postgres:%DB_PASS%@localhost:5432/archive_management"

if exist "%NPM_PATH%\pm2.cmd" (
    cd /d "%ARCHIVE_HOME%\app"
    "%NPM_PATH%\pm2.cmd" start "%ARCHIVE_HOME%\app\ecosystem.config.js"
    echo   - 应用已启动 (PM2)
) else (
    echo.
    echo   错误: PM2 未安装！
    echo   请确保已运行 install.bat 安装 Node.js 和 PM2
    echo.
    pause
    exit /b 1
)

echo.
echo ================================================
echo 服务启动完成！
echo ================================================
echo.
echo 应用访问: http://localhost:3000
echo 搜索服务: http://localhost:7700
echo.
echo 管理命令:
echo   pm2 status        - 查看进程状态
echo   pm2 logs archive-management - 查看应用日志
echo.
pause
