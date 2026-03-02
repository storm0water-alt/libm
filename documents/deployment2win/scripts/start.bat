@echo off
REM Start all services
PowerShell -ExecutionPolicy Bypass -File "%~dp0toolkit.ps1" start
