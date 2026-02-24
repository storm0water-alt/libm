@echo off
REM 档案管理系统 - 安装启动脚本
REM 调用 PowerShell 执行安装

echo 正在启动安装程序...
PowerShell -ExecutionPolicy Bypass -File "%~dp0install.ps1"
