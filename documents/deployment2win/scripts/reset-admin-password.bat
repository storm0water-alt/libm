@echo off
cd /d "%~dp0"
powershell -ExecutionPolicy Bypass -File ".\reset-admin-password.ps1" %*
pause
