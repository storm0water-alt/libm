@echo off
chcp 65001 >nul
echo ================================================
echo 档案管理系统 - 数据库备份
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

set "BACKUP_PATH=%ARCHIVE_HOME%\..\ArchiveBackups"
if not exist "%BACKUP_PATH%" mkdir "%BACKUP_PATH%"

for /f "tokens=2 delims==" %%a in ('wmic os get localdatetime /value') do set dt=%%a
set TIMESTAMP=%dt:~0,4%-%dt:~4,2%-%dt:~6,2%-%dt:~8,4%
set BACKUP_FILE=%BACKUP_PATH%\backup-%TIMESTAMP%.sql

set "PGPATH=C:\Program Files\PostgreSQL\16\bin"
for /f "usebackq tokens=2 delims==" %%a in (`findstr /c:"POSTGRES_PASSWORD=" "%ARCHIVE_HOME%\config\.env"`) do set "DB_PASS=%%a"

echo 正在备份数据库到:
echo %BACKUP_FILE%
echo.

"%PGPATH%\pg_dump.exe" -U postgres -d archive_management > "%BACKUP_FILE%"

if exist "%BACKUP_FILE%" (
    for %%i in ("%BACKUP_FILE%") do echo 备份完成: %%~zi 字节
) else (
    echo 备份失败
)

echo.
echo 最近备份:
dir /b /o-d "%BACKUP_PATH%\backup-*.sql" 2>nul | head /5
echo.
pause
