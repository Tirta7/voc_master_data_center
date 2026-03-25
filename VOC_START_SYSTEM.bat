@echo off
setlocal enabledelayedexpansion
color 0B
title VOC BILLIARD - ULTIMATE STARTUP (STABLE v3)

echo ========================================================
echo        VOC BILLIARD SYSTEM - GLOBAL STARTUP
echo ========================================================
echo Menyiapkan infrastruktur (IP, Build, MQTT, Redis, PM2)...
echo ========================================================
echo.

cd /d "%~dp0"

:: 1. Sinkronisasi IP Jaringan
echo [1/7] Sinkronisasi IP Jaringan...
if exist "update_ip.js" (
    node update_ip.js
    set IP_RESULT=!ERRORLEVEL!
)
echo.

:: 3. Aggressive Port Cleanup (Hanya jika IP berubah atau Force)
if "!IP_RESULT!"=="2" (
    echo [3/7] Terdeteksi perubahan IP. Membersihkan proses lama...
    taskkill /F /IM mosquitto.exe >nul 2>&1
    taskkill /F /IM node.exe /T >nul 2>&1
    taskkill /F /IM PM2 >nul 2>&1
    call pm2 kill >nul 2>&1
    
    for %%p in (1883 8083 3000 4000) do (
        for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":%%p" ^| findstr LISTENING') do (
            taskkill /F /PID %%a >nul 2>&1
        )
    )
) else (
    echo [3/7] IP tetap. Melewati pembersihan berat...
)
echo.

:: 4. Pastikan Redis & Postgres (Parallel-like check)
echo [4/7] Memeriksa Database...
start /b "" net start Redis >nul 2>&1
start /b "" net start postgresql-x64-18 >nul 2>&1
echo [OK] Database Service dimintai aktif.

:: 5. Jalankan MQTT Broker
echo [5/7] Memeriksa MQTT Broker...
tasklist /FI "IMAGENAME eq mosquitto.exe" 2>NUL | find /I /N "mosquitto.exe">NUL
if "%ERRORLEVEL%"=="1" (
    if exist "C:\Program Files\mosquitto\mosquitto.exe" (
        start /b "" "C:\Program Files\mosquitto\mosquitto.exe" -c mosquitto.conf
        echo [OK] MQTT Broker dijalankan.
    )
) else (
    echo [OK] MQTT Broker sudah aktif.
)
echo.

:: 6. Jalankan PM2 Ecosystem
echo [6/7] Memulai Backend ^& Frontend...
if "!IP_RESULT!"=="2" (
    call pm2 restart ecosystem.config.js
) else (
    call pm2 start ecosystem.config.js --no-daemon >nul 2>&1
    if errorlevel 1 (
        call pm2 restart ecosystem.config.js
    )
)
call pm2 save >nul 2>&1
echo [OK] Aplikasi aktif.
echo.

:: 7. Buka Browser
echo [7/7] Menyiapkan Dashboard...
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /R "IPv4.*192.168."') do (
    set IP=%%a
    set IP=!IP:^ =!
    goto openBrowser
)
set IP=localhost

:openBrowser
start http://!IP!:3000

echo ========================================================
echo    SYSTEM ONLINE @ http://!IP!:3000
echo ========================================================
echo.
timeout /t 3 > nul
exit /b 0
