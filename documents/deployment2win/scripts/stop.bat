@echo off
REM Stop all services
PowerShell -ExecutionPolicy Bypass -File "%~dp0toolkit.ps1" stop
