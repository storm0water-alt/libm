@echo off
echo ===================================
echo 档案管理系统 - 停止Web应用
echo ===================================
echo.

REM 检查PM2是否安装
where pm2 >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ 错误: PM2 未安装或未在PATH中
    pause
    exit /b 1
)

REM 检查应用是否在运行
pm2 describe archive-management >nul 2>&1
if %errorlevel% equ 0 (
    echo 🛑 停止档案管理系统...
    pm2 stop archive-management
    echo ✅ Web应用已停止！
) else (
    echo ℹ️  应用未在运行
)

echo.
echo 📋 其他管理命令:
echo    pm2 status         - 查看所有应用状态
echo    pm2 delete archive-management - 完全删除应用配置
echo    pm2 restart archive-management - 重启应用
echo.
pause