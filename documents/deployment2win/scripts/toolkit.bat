@echo off
REM ============================================================================
REM Archive Management System - Operation Toolkit
REM ============================================================================
REM Usage:
REM   toolkit.bat              - Show help
REM   toolkit.bat status       - View service status
REM   toolkit.bat start        - Start all services
REM   toolkit.bat stop         - Stop all services
REM   toolkit.bat restart      - Restart all services
REM   toolkit.bat health       - Health check
REM   toolkit.bat logs         - View logs
REM   toolkit.bat backup       - Database backup
REM   toolkit.bat diagnose     - Run diagnostics
REM   toolkit.bat init-db      - Initialize database (create DB, schema, seed)
REM   toolkit.bat db-update <file> - Execute SQL update script
REM   toolkit.bat reset        - Reset services (keep data)
REM   toolkit.bat reset -clean - Reset services and clean data
REM   toolkit.bat start pg     - Start PostgreSQL only
REM   toolkit.bat start ms     - Start Meilisearch only
REM   toolkit.bat start app    - Start Application only
REM   toolkit.bat diagnose pg  - Diagnose PostgreSQL only
REM   toolkit.bat diagnose db  - Diagnose database only
REM   toolkit.bat reset pg     - Reset PostgreSQL service
REM ============================================================================
PowerShell -ExecutionPolicy Bypass -File "%~dp0toolkit.ps1" %*
