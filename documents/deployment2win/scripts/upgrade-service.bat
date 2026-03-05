@echo off
REM Upgrade services to auto-start version
REM Run as Administrator
PowerShell -ExecutionPolicy Bypass -File "%~dp0upgrade-service.ps1"
