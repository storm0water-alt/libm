@echo off
echo ===================================
echo 档案管理系统 - 停止所有服务
echo ===================================
echo.

echo 🛑 停止Node.js应用 (PM2)...
cd /d "D:\ArchiveManagement"
"%APPDATA%\npm\pm2.cmd" stop archive-management

echo 🛑 停止Meilisearch服务...
net stop Meilisearch

echo 🛑 停止PostgreSQL服务...
net stop PostgreSQL

echo.
echo ✅ 所有服务已停止！
echo.
pause