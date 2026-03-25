@echo off
setlocal enabledelayedexpansion
color 0E
title VOC BILLIARD - ULTIMATE AUTO-START

echo ========================================================
echo        VOC BILLIARD SYSTEM - BOOTING UP
echo ========================================================
echo Menyiapkan infrastruktur (IP, MQTT, Redis, PM2)...
echo ========================================================
echo.

cd /d "%~dp0"

:: 1. Update IP agar selalu sinkron dengan WiFi saat ini
echo [1/6] Sinkronisasi IP Jaringan...
node update_ip.js
set IP_RESULT=%ERRORLEVEL%
echo.

:: 2. Bersihkan sisa proses (Hanya jika IP berubah)
if "%IP_RESULT%"=="2" (
    echo [2/6] Terdeteksi perubahan IP. Membersihkan proses lama...
    taskkill /F /IM mosquitto.exe >nul 2>&1
    taskkill /F /IM node.exe /T >nul 2>&1
    taskkill /F /IM PM2 >nul 2>&1
    call pm2 kill >nul 2>&1
    
    :: Hapus socket files (Penyebab utama EPERM di Windows)
    if exist "%HOMEDRIVE%%HOMEPATH%\.pm2\rpc.sock" del /f /q "%HOMEDRIVE%%HOMEPATH%\.pm2\rpc.sock" >nul 2>&1
    if exist "%HOMEDRIVE%%HOMEPATH%\.pm2\pub.sock" del /f /q "%HOMEDRIVE%%HOMEPATH%\.pm2\pub.sock" >nul 2>&1
) else (
    echo [2/6] IP tetap. Melewati pembersihan berat...
)
echo.

:: 3. Jalankan Redis ^& Postgres secara background
echo [3/6] Memastikan Database (Redis ^& Postgres) aktif...
start /b "" net start Redis >nul 2>&1
start /b "" net start postgresql-x64-18 >nul 2>&1
echo [OK] Database Service dipanggil.

:: 4. Jalankan Mosquitto MQTT Broker
echo [4/6] Memeriksa MQTT Broker...
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

:: 5. Jalankan PM2 Ecosystem
echo [5/6] Memulai Backend ^& Frontend...
if "%IP_RESULT%"=="2" (
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

:: 6. Buka Browser
echo [6/6] Menyiapkan Dashboard...
start http://localhost:3000

echo ========================================================
echo    SISTEM SUDAH ONLINE ^& DASHBOARD TERBUKA!
echo ========================================================
echo.
timeout /t 3 > nul
exit /b 0
