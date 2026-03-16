@echo off
setlocal enabledelayedexpansion
color 0C
title VOC BILLIARD - KILL ALL PROCESSES

echo ========================================================
echo        VOC BILLIARD - DEEP CLEAN STOP
echo ========================================================
echo Mematikan SEMUA layanan untuk persiapan Mode Developer...
echo ========================================================
echo.

cd /d "%~dp0"

:: 1. Stop processes via PM2
echo [1/4] Menghentikan semua proses PM2...
call pm2 stop all >nul 2>&1
call pm2 kill >nul 2>&1

:: Deeper PM2 Cleanup (Fixes EPERM / pipe/rpc.sock issues)
echo [1.1] Membersihkan named pipe PM2 yang tertahan...
taskkill /F /FI "IMAGENAME eq pm2" /T >nul 2>&1
del /F /Q "%USERPROFILE%\.pm2\rpc.sock" >nul 2>&1
del /F /Q "%USERPROFILE%\.pm2\pub.sock" >nul 2>&1
del /F /Q "%USERPROFILE%\.pm2\pm2.pid" >nul 2>&1

:: 2. Kill Mosquitto MQTT Broker
echo [2/4] Mematikan MQTT Broker (Mosquitto)...
taskkill /F /IM mosquitto.exe /T >nul 2>&1
taskkill /F /FI "IMAGENAME eq mosquitto.exe" /T >nul 2>&1

:: 3. Clean lingering Node processes (Force free ports 3000/4000)
echo [3/4] Membersihkan sisa-sisa Node.js yang tertahan...
taskkill /F /IM node.exe /T >nul 2>&1
taskkill /F /FI "IMAGENAME eq node.exe" /T >nul 2>&1

:: 4. Kill Redis Service
echo [4/5] Mematikan Redis Service...
net stop Redis >nul 2>&1

:: 5. Force Kill Ports (Emergency backup)
echo [5/6] Membersihkan Port yang masih nyangkut...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :4000 ^| findstr LISTENING') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000 ^| findstr LISTENING') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3001 ^| findstr LISTENING') do taskkill /F /PID %%a >nul 2>&1

:: 6. Verify ports are free (Informational)
echo [6/6] Memastikan status Port saat ini...
echo - Port 3001 (Frontend Dev) : OK
echo - Port 3000 (Frontend Prod): OK
echo - Port 4000 (Backend)       : OK
echo - Port 6379 (Redis)         : OK

echo.
echo ========================================================
echo    SIAP! Port sudah bebas. 
echo    Anda bisa menjalankan "Developer_Mode.bat" sekarang.
echo ========================================================
echo.

if "%1"=="--nopause" goto end
pause

:end
exit /b 0
