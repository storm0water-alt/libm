@echo off
echo ===================================
echo 档案管理系统 - 数据库备份脚本
echo ===================================
echo.

rem 设置变量
set BACKUP_DIR=D:\ArchiveBackups
set TIMESTAMP=%date:~0,4%%date:~4,2%%date:~10,2%_%time:~0,2%%time:~3,2%
set BACKUP_FILE=%BACKUP_DIR%\backup-%TIMESTAMP%.sql

echo 📊 开始数据库备份...
echo 备份文件: %BACKUP_FILE%

rem 检查数据库是否有变化
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d archive_management -c "SELECT EXTRACT(EPOCH FROM MAX(last_modified)) FROM (SELECT MAX(last_modified) AS last_modified FROM archives WHERE last_modified IS NOT NULL UNION SELECT MAX(created_at) AS last_modified FROM operation_logs WHERE created_at IS NOT NULL UNION SELECT MAX(updated_at) AS last_modified FROM system_configs WHERE updated_at IS NOT NULL) AS t);" > temp_last_change.txt

rem 执行备份
"C:\Program Files\PostgreSQL\16\bin\pg_dump.exe" -U postgres -d archive_management --verbose --no-password --file="%BACKUP_FILE%" --host=localhost --port=5432

if %ERRORLEVEL% EQU 0 (
    echo ✅ 数据库备份完成: %BACKUP_FILE%
    echo 文件大小:
    dir "%BACKUP_FILE%" | findstr "backup-"
) else (
    echo ❌ 数据库备份失败
    echo 错误代码: %ERRORLEVEL%
    pause
    exit /b 1
)

rem 清理旧备份 (保留最近7个)
echo.
echo 🧹 清理旧备份文件...
for /f "skip=7 delims=" %%a in ('dir /b /a-d "%BACKUP_DIR%\backup-*.sql"') do (
    if not "%%a"=="%BACKUP_FILE%" (
        echo 删除旧备份: %%a
        del "%%a"
    )
)

echo.
echo 📋 备份完成！
echo 当前备份目录:
dir "%BACKUP_DIR%" /b
echo.
pause