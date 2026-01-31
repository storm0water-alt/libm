@echo off
echo ===================================
echo 档案管理系统 - 日志轮转脚本
echo ===================================
echo.

set LOG_DIR=C:\ArchiveLogs
set MAX_SIZE=100
set ARCHIVE_DIR=C:\ArchiveLogs\archive

echo 📝 开始日志轮转检查...
echo 日志目录: %LOG_DIR%
echo 最大文件大小: %MAX_SIZE%MB

rem 处理应用日志
echo.
echo 📄 处理应用日志...
if exist "%ARCHIVE_DIR%" (
    for /f "delims=" %%a in ('dir /b "%ARCHIVE_DIR%\*.log"') do (
        for /f "tokens=3" %%b in ("%%a") do (
            set size=%%c
            set filename=%%d
            set filepath="%ARCHIVE_DIR%\%%filename"
            
            rem 检查文件大小 (简单估计)
            for /f "tokens=3" %%x in ("%%b") do (
                if %%x equ %%a (
                    set size=%%y
                )
            )
            
            if !size! equ 0 (
                echo   跳过空文件: %%filename
            ) else (
                echo   检查文件: %%filename (大小: !size! bytes)
                
                rem 转换大小为MB (粗略估计)
                set /a sizemb=!size!/1048576
                if !sizemb! GEQ %MAX_SIZE% (
                    echo   ⚠️ 文件超过%MAX_SIZE%MB，进行轮转
                    
                    rem 创建轮转文件
                    for /f "tokens=2 delims=." %%t in ("%%~d") do (
                        for /f "tokens=2 delims=/" %%n in ("%%t") do (
                            set timestamp=%%n-%%d
                        )
                    )
                    
                    set rotatefile="%ARCHIVE_DIR%\%%filename-%timestamp%.log"
                    
                    rem 移动旧日志到轮转文件
                    move "!filepath!" "!rotatefile!" 2>nul
                    
                    if exist "!rotatefile!" (
                        echo     ✅ 轮转完成: !rotatefile!
                    ) else (
                        echo     ❌ 轮转失败: %%filename
                    )
                ) else (
                    echo   ✅ 文件大小正常: !filename
                )
            )
        )
    ) else (
        echo   目录不存在: %ARCHIVE_DIR%
    )

rem 处理数据库日志
echo.
echo 🐘 处理数据库日志...
set DB_LOG_DIR=%LOG_DIR%\database
if exist "%DB_LOG_DIR%" (
    for /f "delims=" %%a in ('dir /b "%DB_LOG_DIR%\*.log"') do (
        set filename=%%a
        echo   检查数据库日志: %%filename
        rem 简单文件大小检查 (数据库日志通常较小)
        
        rem 重命名旧日志 (保留策略)
        for /f "tokens=2 delims=." %%t in ("%%~na") do (
            set oldname=%%t.log
            set newname=%%t-old.log
            if exist "%DB_LOG_DIR%\%%oldname%" (
                ren "%DB_LOG_DIR%\%%oldname%" "%%newname%" 2>nul
                echo     ✅ 重命名: %%oldname -^> %%newname%
            )
        )
    )
)

rem 处理Meilisearch日志
echo.
echo 🔍 处理搜索日志...
set SEARCH_LOG_DIR=%LOG_DIR%\meilisearch
if exist "%SEARCH_LOG_DIR%" (
    for /f "delims=" %%a in ('dir /b "%SEARCH_LOG_DIR%\*.log"') do (
        set filename=%%a
        echo   检查搜索日志: %%filename
        rem Meilisearch日志通常较小，简单轮转
        
        set rotatefile=%SEARCH_LOG_DIR%\%%~na%-old.log
        if exist "!rotatefile!" (
            del "!rotatefile!" 2>nul
            echo     ✅ 清理旧搜索日志
        )
    )
)

rem 检查重要错误日志
echo.
echo ⚠️ 检查重要错误日志...
set CRITICAL_LOG=%LOG_DIR%\critical-errors.log
if exist "%CRITICAL_LOG%" (
    for /f "tokens=2 delims=]" %%a in ('type "%CRITICAL_LOG%" 2^>nul ^| findstr /V /C:"\[\]"') do (
        for /f "tokens=2 delims=," %%b in ("%%a") do (
            echo   关键错误记录: %%b
        )
    )
    
    for /f "tokens=*" %%a in ('findstr /N "." "%CRITICAL_LOG%"') do (
        echo   错误: %%a
    )
) else (
    echo   无重要错误记录
)

rem 清理旧日志 (30天策略)
echo.
echo 🧹 清理30天前的旧日志...
for /f "delims=" %%a in ('forfiles /p "%LOG_DIR%" /m -30 -c "cmd /c echo @path"') do (
    set filedate=%%a
    set /a cutoffdate=%date:~8,2%%date:~3,2%%date:~6,2%
    
    if !filedate! LSS !cutoffdate! (
        echo   删除过期日志: %%@path%
        del "%%@path%" /q 2>nul
    )
)

echo.
echo ✅ 日志轮转完成！
echo.
echo 当前日志文件:
dir "%LOG_DIR%" /b
echo.
pause