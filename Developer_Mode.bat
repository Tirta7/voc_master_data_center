@echo off
setlocal enabledelayedexpansion
color 0B
title VOC BILLIARD - DEVELOPER MODE (STABLE)

:init
cls
echo ========================================================
echo        VOC BILLIARD - MODE DEVELOPER ACTIVE
echo ========================================================
echo.

cd /d "%~dp0"

:: 1. Force stop all current apps
echo [1/6] Membersihkan sistem (PM2, Node, Redis, MQTT)...
call Stop_Sistem.bat --nopause

:: 2. IP Sync & Get IP for Dashboard
echo [2/6] Sinkronisasi IP Jaringan...
:: We run node and capture output if we wanted, but let's keep it simple:
:: update_ip.js already updates .env files.
node update_ip.js
echo.

:: 3. Start Redis
echo [3/6] Menjalankan Redis Service...
net start Redis >nul 2>&1

:: 4. Start MQTT
echo [4/6] Memulai MQTT Broker (Mosquitto)...
net stop mosquitto >nul 2>&1
taskkill /F /IM mosquitto.exe >nul 2>&1
timeout /t 1 > nul
start "MQTT BROKER" cmd /k ""C:\Program Files\mosquitto\mosquitto.exe" -c mosquitto.conf -v"
timeout /t 2 > nul

:: 5. Start Backend
echo [5/6] Menjalankan Backend (start:dev)...
start "NESTJS - BACKEND (DEV)" cmd /k "cd backend && npm run start:dev"

:: 6. Start Frontend (Modified to use port 3001)
echo [6/6] Menjalankan Frontend (npm run dev)...
start "NEXTJS - FRONTEND (DEV)" cmd /k "cd frontend && npm run dev"

echo.
echo ========================================================
echo    SISTEM SEDANG BERJALAN!
echo ========================================================
echo    Frontend (Local)   : http://localhost:3001
echo    Backend            : http://localhost:4000
echo    MQTT WebSocket     : ws://(Cek IP WiFi):8083
echo ========================================================
echo.
echo [TIPS] Gunakan Port 3001 untuk Frontend di Browser.
echo [TIPS] Jendela "MQTT BROKER" akan log semua traffic IoT.
echo.
echo JANGAN TUTUP JENDELA INI. 
echo Tekan sembarang tombol untuk RESTART ULANG SEMUA...
pause > nul
goto init
