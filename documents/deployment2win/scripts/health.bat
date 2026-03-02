@echo off
REM Health check
PowerShell -ExecutionPolicy Bypass -File "%~dp0toolkit.ps1" health
