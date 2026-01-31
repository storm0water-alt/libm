@echo off
echo ===================================
echo 档案管理系统 - 启动Web应用
echo ===================================
echo.

REM 检查当前目录是否存在必要文件
if not exist "server.js" (
    echo ❌ 错误: 未找到 server.js 文件
    echo 请确保在正确的应用目录中运行此脚本
    pause
    exit /b 1
)

if not exist ".env" (
    echo ⚠️  警告: 未找到 .env 文件，将使用默认环境变量
    echo 建议从 .env.template 复制并配置环境变量
    echo.
)

REM 设置环境变量
set NODE_ENV=production

REM 如果存在 .env 文件，则加载环境变量
if exist ".env" (
    echo 📝 加载环境变量...
    for /f "tokens=*" %%a in (.env) do (
        set "%%a"
    )
)

REM 检查PM2是否安装
where pm2 >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ 错误: PM2 未安装或未在PATH中
    echo 请先安装 PM2: npm install -g pm2
    pause
    exit /b 1
)

REM 检查应用是否已经运行
pm2 describe archive-management >nul 2>&1
if %errorlevel% equ 0 (
    echo 🔄 应用已在运行，正在重启...
    pm2 restart archive-management
) else (
    echo 🚀 启动档案管理系统...
    pm2 start server.js --name "archive-management" --log-date-format "YYYY-MM-DD HH:mm:ss Z"
)

REM 显示应用状态
echo.
echo 📊 应用状态:
pm2 status archive-management

echo.
echo ✅ Web应用启动完成！
echo.
echo 🌐 访问地址: http://localhost:3000
echo 📋 管理命令: 
echo    pm2 status         - 查看应用状态
echo    pm2 logs archive-management - 查看日志
echo    pm2 restart archive-management - 重启应用
echo    pm2 stop archive-management    - 停止应用
echo.
pause