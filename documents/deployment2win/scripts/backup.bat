@echo off
REM Database backup
PowerShell -ExecutionPolicy Bypass -File "%~dp0toolkit.ps1" backup
