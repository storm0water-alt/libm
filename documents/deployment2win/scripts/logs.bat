@echo off
REM View application logs
PowerShell -ExecutionPolicy Bypass -File "%~dp0toolkit.ps1" logs
