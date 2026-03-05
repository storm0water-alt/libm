@echo off
cd /d "%~dp0"

echo ========================================
echo   Launcher - Add Icon
echo ========================================
echo.

if not exist "launcher.exe" (
    echo [ERROR] launcher.exe not found
    goto :end
)

if not exist "icon.ico" (
    echo [ERROR] icon.ico not found
    goto :end
)

if not exist "tools\ResourceHacker.exe" (
    echo [ERROR] tools\ResourceHacker.exe not found
    goto :end
)

echo [1/2] Adding icon...
"%~dp0tools\ResourceHacker.exe" -open "%~dp0launcher.exe" -save "%~dp0launcher_with_icon.exe" -action add -res "%~dp0icon.ico" -mask ICONGROUP,MAINICON

if exist "%~dp0launcher_with_icon.exe" (
    echo [2/2] Replacing file...
    copy /Y "%~dp0launcher_with_icon.exe" "%~dp0launcher.exe"
    del /F "%~dp0launcher_with_icon.exe"
    echo.
    echo [DONE] Icon added successfully!
) else (
    echo [ERROR] Failed to add icon
)

:end
echo.
pause
