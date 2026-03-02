@echo off
REM Restart all services
PowerShell -ExecutionPolicy Bypass -File "%~dp0toolkit.ps1" restart
