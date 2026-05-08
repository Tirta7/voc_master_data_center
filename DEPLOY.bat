@echo off
title VOC Billiard - Mulai Layanan
color 0A

echo.
echo =====================================================
echo    VOC BILLIARD - MEMULAI LAYANAN
echo =====================================================
echo.

:: 0. Pastikan folder storage ada
if not exist "%~dp0backend\storage\ai" mkdir "%~dp0backend\storage\ai" >nul 2>&1

:: 1. Jalankan Service Pendukung
echo [>>] Mengaktifkan database ^& message broker...

:: Coba jalankan semua kemungkinan nama service
net start mosquitto >nul 2>&1
net start Redis >nul 2>&1
net start Memurai >nul 2>&1

:: Coba jalankan PostgreSQL (berbagai versi)
net start postgresql-x64-17 >nul 2>&1
net start postgresql-x64-16 >nul 2>&1
net start postgresql-x64-15 >nul 2>&1
net start postgresql-x64-14 >nul 2>&1
net start postgresql-x64-13 >nul 2>&1
net start postgresql >nul 2>&1

echo [OK] Layanan pendukung siap.

:: 2. Jalankan PM2
echo [>>] Menjalankan Backend ^& Frontend...

pm2 resurrect >nul 2>&1
if errorlevel 1 (
    cd /d "%~dp0"
    pm2 start ecosystem.config.js
)

:: 3. Tunggu Aplikasi Siap
echo [..] Menunggu aplikasi siap (10 detik)...
timeout /t 10 /nobreak >nul

:: 4. Cari IP untuk ditampilkan
set "MY_IP=localhost"
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /i "IPv4" ^| findstr /v "169.254"') do (
    for /f "tokens=1" %%b in ("%%a") do set "MY_IP=%%b"
)

echo.
echo =====================================================
echo    VOC Billiard Berjalan!
echo =====================================================
echo    Akses PC : http://localhost:3001
echo    Akses HP : http://%MY_IP%:3001
echo =====================================================
echo.

pm2 list
start http://localhost:3001

pause
