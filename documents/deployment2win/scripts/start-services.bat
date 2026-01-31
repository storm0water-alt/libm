@echo off
echo ===================================
echo 档案管理系统 - 启动所有服务
echo ===================================
echo.

echo 🐘 启动PostgreSQL服务...
net start PostgreSQL

echo ⏳ 等待PostgreSQL启动...
timeout /t 15

echo 🔍 启动Meilisearch服务...
net start Meilisearch

echo ⏳ 等待Meilisearch启动...
timeout /t 10

echo 🚀 启动Node.js应用 (PM2)...
cd /d "D:\ArchiveManagement"
set NODE_ENV=production
set DATABASE_URL=postgresql://postgres:secure_password_%date:~0,10%@localhost:5432/archive_management
set MEILISEARCH_URL=http://localhost:7700
set MEILISEARCH_MASTER_KEY=search_master_key_%date:~0,10%
set NEXTAUTH_SECRET=nextauth_secret_%date:~0,10%
set NEXTAUTH_URL=http://localhost:3000

REM 启动PM2
"%APPDATA%\npm\pm2.cmd" start "D:\ArchiveManagement\config\ecosystem.config.js"

echo.
echo ✅ 服务启动完成！
echo.
echo 📊 服务状态检查: 运行 check-status.ps1
echo 🌐 应用访问: http://localhost:3000
echo 📋 管理面板: 运行 services\目录中的脚本
echo.
pause