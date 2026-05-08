@echo off
setlocal enabledelayedexpansion
title VOC Billiard - Mulai Layanan
color 0A

echo.
echo =====================================================
echo    VOC BILLIARD - MEMULAI LAYANAN
echo =====================================================
echo.

cd /d "%~dp0"

:: --- 1. Pastikan Services Windows berjalan ---
echo [>>] Memastikan layanan pendukung aktif...

net start mosquitto >nul 2>&1
net start Redis >nul 2>&1
net start Memurai >nul 2>&1

:: Cek PostgreSQL (semua versi)
set PG_STARTED=0
for %%v in (17 16 15 14 13) do (
    sc query postgresql-x64-%%v >nul 2>&1
    if !errorLevel! equ 0 (
        net start postgresql-x64-%%v >nul 2>&1
        set PG_STARTED=1
    )
)
if %PG_STARTED%==0 (
    echo [!] PostgreSQL service tidak ditemukan. Pastikan PostgreSQL terinstall.
)

echo [OK] Layanan pendukung siap.

:: --- 2. Jalankan / Restart PM2 ---
echo [>>] Menjalankan Backend dan Frontend...

pm2 list >nul 2>&1
if %errorLevel% neq 0 (
    echo [!] PM2 tidak ditemukan. Jalankan INSTALL.bat terlebih dahulu.
    pause
    exit /b 1
)

:: Coba resurrect dulu (lebih cepat)
pm2 resurrect >nul 2>&1
if %errorLevel% neq 0 (
    :: Kalau gagal, start fresh dari ecosystem
    pm2 start ecosystem.config.js
)

:: --- 3. Tunggu dan Verifikasi ---
echo [..] Menunggu aplikasi siap (15 detik)...
timeout /t 15 /nobreak >nul

:: --- 4. Deteksi IP ---
set MY_IP=
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /i "IPv4" ^| findstr /v "169.254"') do (
    set "R=%%a"
    set "R=!R: =!"
    if not defined MY_IP if not "!R!"=="" set MY_IP=!R!
)
if not defined MY_IP set MY_IP=localhost

echo.
echo =====================================================
echo    VOC Billiard Berjalan!
echo =====================================================
echo.
echo    PC Server  : http://localhost:3001
echo    HP / PC    : http://%MY_IP%:3001
echo =====================================================
echo.

pm2 list

:: Buka browser
timeout /t 3 /nobreak >nul
start http://localhost:3001

pause
endlocal
