@echo off
SETLOCAL EnableDelayedExpansion

set PORT=4000
echo [INFO] Checking for processes occupying port %PORT%...

:: Find the PID(s) using the specified port
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :%PORT% ^| findstr LISTENING') do (
    set PID=%%a
    if not "!PID!"=="" (
        echo [INFO] Found process !PID! on port %PORT%. Terminating...
        taskkill /F /PID !PID! >nul 2>&1
        if !errorlevel! equ 0 (
            echo [SUCCESS] Process !PID! has been terminated.
        ) else (
            echo [WARNING] Failed to terminate process !PID! or it was already closed.
        )
    )
)

:: Wait a moment for the port to be fully released
timeout /t 1 /nobreak >nul

echo [INFO] Starting Backend in Developer Mode (npm run start:dev)...
cd /d "%~dp0backend"
npm run start:dev

pause
