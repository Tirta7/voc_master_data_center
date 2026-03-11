@echo off
setlocal
color 0E
title VOC BILLIARD - ULTIMATE AUTO-START

echo ========================================================
echo        VOC BILLIARD SYSTEM - BOOTING UP
echo ========================================================
echo Menyiapkan infrastruktur (IP, MQTT, PM2)...
echo ========================================================
echo.

cd /d "%~dp0"

:: 1. Update IP agar selalu sinkron dengan WiFi saat ini
echo [1/5] Sinkronisasi IP Jaringan...
node update_ip.js
echo.

:: 2. Bersihkan sisa proses lama agar tidak bentrok
echo [2/5] Membersihkan sisa proses lama...
taskkill /F /IM mosquitto.exe >nul 2>&1
call pm2 stop all >nul 2>&1

:: 3. Jalankan Mosquitto MQTT Broker
echo [3/5] Memulai MQTT Broker...
if exist "mosquitto.conf" (
    start /b "" "C:\Program Files\mosquitto\mosquitto.exe" -c mosquitto.conf
    timeout /t 2 > nul
) else (
    echo [ERR] File mosquitto.conf tidak ditemukan!
    pause
    exit /b 1
)

:: 4. Jalankan PM2 Ecosystem
echo [4/5] Memulai Backend ^& Frontend via PM2...
if exist "ecosystem.config.js" (
    call pm2 start ecosystem.config.js
    call pm2 save
) else (
    echo [ERR] File ecosystem.config.js tidak ditemukan!
    pause
    exit /b 1
)

:: 5. Buka Browser Otomatis
echo [5/5] Membuka Dashboard Admin...
timeout /t 3 > nul
start http://localhost:3000

echo.
echo ========================================================
echo    SISTEM SUDAH ONLINE ^& DASHBOARD TERBUKA!
echo ========================================================
echo.
echo Jendela ini akan tertutup otomatis dalam 5 detik...
timeout /t 5 > nul
exit
