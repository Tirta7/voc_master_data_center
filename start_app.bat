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
if errorlevel 1 (
    echo [ERR] Gagal menjalankan update_ip.js!
    pause
    exit /b 1
)
echo [OK] Update IP selesai.
echo.

:: 2. Bersihkan sisa proses lama agar tidak bentrok
echo [2/6] Membersihkan sisa proses lama...
taskkill /F /IM mosquitto.exe >nul 2>&1
taskkill /F /IM node.exe /T >nul 2>&1
taskkill /F /IM PM2 >nul 2>&1
call pm2 kill >nul 2>&1

:: Hapus paksa socket files (Penyebab utama EPERM di Windows)
if exist "%HOMEDRIVE%%HOMEPATH%\.pm2\rpc.sock" del /f /q "%HOMEDRIVE%%HOMEPATH%\.pm2\rpc.sock" >nul 2>&1
if exist "%HOMEDRIVE%%HOMEPATH%\.pm2\pub.sock" del /f /q "%HOMEDRIVE%%HOMEPATH%\.pm2\pub.sock" >nul 2>&1
if exist "%HOMEDRIVE%%HOMEPATH%\.pm2\pm2.pid" del /f /q "%HOMEDRIVE%%HOMEPATH%\.pm2\pm2.pid" >nul 2>&1

echo [OK] Cleanup selesai.

:: Wait for port 4000 closure with retry
set /a RETRY_COUNT=0
:checkPort
netstat -ano | findstr LISTENING | findstr ":4000" >nul
if errorlevel 1 (
    echo [OK] Port 4000 siap.
    goto portReady
)

set /a RETRY_COUNT+=1
echo [WAIT] Menunggu Port 4000 lepas (!RETRY_COUNT!/10)...

if !RETRY_COUNT! gtr 5 (
    for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":4000" ^| findstr LISTENING') do taskkill /F /PID %%a >nul 2>&1
)

timeout /t 2 > nul
if !RETRY_COUNT! lss 10 goto checkPort
echo [ERR] Port 4000 gagal dilepaskan.
pause

:portReady

:: 3. Pastikan Redis berjalan
echo [3/6] Memastikan Redis berjalan...
sc query Redis | find "RUNNING" >nul
if errorlevel 1 (
    echo [WRN] Redis tidak berjalan. Mencoba menyalakan...
    net start Redis >nul 2>&1
) else (
    echo [OK] Redis aktif.
)

:: 3b. Pastikan PostgreSQL berjalan
echo [3b/6] Memastikan PostgreSQL berjalan...
sc query postgresql-x64-18 | find "RUNNING" >nul
if errorlevel 1 (
    echo [WRN] PostgreSQL tidak berjalan. Mencoba menyalakan...
    net start postgresql-x64-18 >nul 2>&1
) else (
    echo [OK] PostgreSQL aktif.
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
echo [5/6] Memulai Backend ^& Frontend...
if exist "ecosystem.config.js" (
    echo [DEBUG] Mencoba PM2...
    call pm2 start ecosystem.config.js
    if errorlevel 1 (
        echo [WRN] PM2 gagal ^(Akses Ditolak^). Menggunakan metode backup...
        
        :: Backup: Jalankan langsung di jendela baru
        echo [INFO] Menyalankan Backend...
        start "VOC-Backend" /d "backend" cmd /c "node dist/main.js"
        
        timeout /t 2 > nul
        
        echo [INFO] Menyalankan Frontend...
        start "VOC-Frontend" /d "frontend" cmd /c "npm run start"
    ) else (
        call pm2 save
    )
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
