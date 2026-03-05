@echo off
cd /d "%~dp0"
powershell -ExecutionPolicy Bypass -File "create-desktop-shortcut.ps1"
