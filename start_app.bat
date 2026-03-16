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
echo.

:: 2. Bersihkan sisa proses lama agar tidak bentrok
echo [2/6] Membersihkan sisa proses lama...
taskkill /F /IM mosquitto.exe >nul 2>&1
taskkill /F /IM node.exe /T >nul 2>&1
call pm2 stop all >nul 2>&1

:: Wait for port 4000 closure with retry
set /a "RETRY_COUNT=0"
:checkPort
netstat -ano | findstr :4000 | findstr LISTENING >nul
if %ERRORLEVEL% equ 0 (
    set /a "RETRY_COUNT+=1"
    if !RETRY_COUNT! gtr 5 (
        echo [ERR] Port 4000 masih terkunci oleh sistem. Mencoba paksa...
        for /f "tokens=5" %%a in ('netstat -aon ^| findstr :4000 ^| findstr LISTENING') do taskkill /F /PID %%a >nul 2>&1
    )
    echo [WAIT] Menunggu Port 4000 lepas (!RETRY_COUNT!/10)...
    timeout /t 2 > nul
    if !RETRY_COUNT! lss 10 goto checkPort
)

:: 3. Pastikan Redis berjalan (Server Cache)
echo [3/6] Memastikan Redis berjalan...
sc query Redis | find "RUNNING" >nul
if %ERRORLEVEL% neq 0 (
    echo [WRN] Redis tidak berjalan. Mencoba menyalakan...
    net start Redis >nul 2>&1
    if %ERRORLEVEL% neq 0 (
        echo [ERR] Gagal menyalakan Redis. Pastikan Redis terpasang sebagai Service.
    ) else (
        echo [OK] Redis berhasil dinyalakan.
    )
) else (
    echo [OK] Redis sudah aktif.
)
timeout /t 1 > nul

:: 4. Jalankan Mosquitto MQTT Broker
echo [4/6] Memulai MQTT Broker...
if exist "mosquitto.conf" (
    start /b "" "C:\Program Files\mosquitto\mosquitto.exe" -c mosquitto.conf
    timeout /t 2 > nul
) else (
    echo [ERR] File mosquitto.conf tidak ditemukan!
    pause
    exit /b 1
)

:: 5. Jalankan PM2 Ecosystem
echo [5/6] Memulai Backend ^& Frontend via PM2...
if exist "ecosystem.config.js" (
    call pm2 start ecosystem.config.js
    call pm2 save
) else (
    echo [ERR] File ecosystem.config.js tidak ditemukan!
    pause
    exit /b 1
)

:: 6. Buka Browser Otomatis
echo [6/6] Membuka Dashboard Admin...
timeout /t 3 > nul
start http://localhost:3000

echo.
echo ========================================================
echo    SISTEM SUDAH ONLINE ^& DASHBOARD TERBUKA!
echo ========================================================
echo.
echo Jendela ini akan tertutup otomatis dalam 5 detik...
timeout /t 5 > nul
exit /b 0
