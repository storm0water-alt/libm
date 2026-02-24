@echo off
chcp 65001 >nul
echo ================================================
echo 档案管理系统 - 版本升级
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

echo [1/4] 停止服务...
call "%ARCHIVE_HOME%\scripts\stop.bat"

echo.
echo [2/4] 备份数据库...
call "%ARCHIVE_HOME%\scripts\backup.bat"

echo.
echo [3/4] 备份当前配置...
if exist "%ARCHIVE_HOME%\config\.env" copy "%ARCHIVE_HOME%\config\.env" "%ARCHIVE_HOME%\config\.env.backup" >nul
if exist "%ARCHIVE_HOME%\config\config.json" copy "%ARCHIVE_HOME%\config\config.json" "%ARCHIVE_HOME%\config\config.json.backup" >nul
echo   - 配置已备份

echo.
echo [4/4] 请手动更新应用文件，然后运行 start.bat 启动服务
echo.
echo 升级步骤:
echo   1. 解压新版本覆盖 %ARCHIVE_HOME%
echo   2. 恢复配置: copy config\.env.backup config\.env
echo   3. 运行 start.bat
echo.
pause
