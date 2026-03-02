@echo off
REM View service status
PowerShell -ExecutionPolicy Bypass -File "%~dp0toolkit.ps1" status
