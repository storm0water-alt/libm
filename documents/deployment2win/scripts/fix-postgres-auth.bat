@echo off
REM PostgreSQL Authentication Fix Tool

echo.
echo ================================================
echo PostgreSQL Authentication Fix Tool
echo ================================================
echo.
echo This script will help fix login failure issues.
echo.
echo Symptoms:
echo   - Login shows "Username or password error"
echo   - No new output in PM2 logs
echo   - Network response shows garbled text
echo.
echo Root Cause:
echo   PostgreSQL authentication configuration mismatch
echo.
echo ================================================
echo.

pause

REM Run PowerShell script
PowerShell -NoProfile -ExecutionPolicy Bypass -File "%~dp0fix-postgres-auth.ps1"

pause
