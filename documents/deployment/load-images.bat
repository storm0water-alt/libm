@echo off
REM ==========================================
REM Docker 镜像加载脚本 (WSL2 优化版)
REM ==========================================

echo ======================================
echo 档案管理系统 - Docker 镜像加载 (WSL2 优化版)
echo ======================================
echo.

REM 检查 WSL2 是否可用
echo 检查 WSL2 环境...
wsl --version >nul 2>&1
if %errorlevel% neq 0 (
    echo 错误：WSL2 未安装或未启用
    echo 请先安装 WSL2 并在 WSL2 中执行部署
    pause
    exit /b 1
)

echo WSL2 环境检测通过
echo.

REM 进入 WSL2 并执行镜像加载脚本
echo 正在进入 WSL2 并执行镜像加载...
echo.

wsl bash -c "cd $(wslpath -w '%~dp0') && chmod +x load-images.sh && ./load-images.sh"

if %errorlevel% neq 0 (
    echo.
    echo 错误：镜像加载失败
    pause
    exit /b %errorlevel%
)

echo.
echo ======================================
echo 镜像加载完成！
echo ======================================
echo.

echo 下一步操作：
echo 1. 配置环境变量：
echo    wsl bash -c "cd $(wslpath -w '%~dp0') && cp .env.example .env"
echo    然后编辑 .env 文件，配置 Windows 文件路径：
echo    SOURCE_DIRECTORIES=C:\MobileDrive,D:\BackupPDFs
echo    ARCHIVE_STORAGE_PATH=C:\ArchiveStorage
echo    IMPORT_CONCURRENCY=3
echo.
echo 2. 启动服务：
echo    wsl bash -c "cd $(wslpath -w '%~dp0') && docker-compose up -d"
echo.
echo 3. 访问系统：
echo    http://localhost:3000
echo.
echo 4. 运行环境检查：
echo    wsl bash -c "cd $(wslpath -w '%~dp0') && ./check-wsl2.sh"
echo.
pause
