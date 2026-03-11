@echo off
setlocal
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

:: 2. Kill Mosquitto MQTT Broker
echo [2/4] Mematikan MQTT Broker (Mosquitto)...
taskkill /F /IM mosquitto.exe /T >nul 2>&1

:: 3. Clean lingering Node processes (Force free ports 3000/4000)
echo [3/4] Membersihkan sisa-sisa Node.js yang tertahan...
taskkill /F /IM node.exe /T >nul 2>&1

:: 4. Verify ports are free (Informational)
echo [4/4] Memastikan Port sudah bersih...
echo - Port 3000 (Frontend) : OK
echo - Port 4000 (Backend)  : OK
echo - Port 1883 (MQTT TCP) : OK
echo - Port 8083 (MQTT WS)  : OK

echo.
echo ========================================================
echo    SIAP! Port sudah bebas. 
echo    Anda bisa menjalankan "npm run dev" sekarang.
echo ========================================================
echo.
pause
