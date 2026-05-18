@echo off
setlocal enabledelayedexpansion
title VOC Billiard - Mulai Layanan
color 0A

echo.
echo =====================================================
echo    VOC BILLIARD - MEMULAI LAYANAN (Docker)
echo =====================================================
echo.

cd /d "%~dp0"

:: --- 1. Pastikan Docker berjalan ---
echo [>>] Memeriksa Docker Engine...
docker info >nul 2>&1
if %errorLevel% neq 0 (
    echo [!] Docker Engine belum berjalan. Membuka Docker Desktop...
    start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe"
    echo     Menunggu Docker siap (30 detik)...
    timeout /t 30 /nobreak >nul
    docker info >nul 2>&1
    if %errorLevel% neq 0 (
        echo [ERROR] Docker gagal berjalan. Buka Docker Desktop secara manual dulu.
        pause
        exit /b 1
    )
)
echo [OK] Docker Engine berjalan.

:: --- 2. Deteksi IP server saat ini ---
set MY_IP=
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /i "IPv4" ^| findstr /v "169.254"') do (
    set "R=%%a"
    set "R=!R: =!"
    if not defined MY_IP if not "!R!"=="" set MY_IP=!R!
)
if not defined MY_IP set MY_IP=localhost

:: Update IP di .env jika berubah
if exist ".env" (
    powershell -Command "(Get-Content .env) -replace 'SERVER_IP=.*', 'SERVER_IP=%MY_IP%' | Set-Content .env"
    echo [OK] IP server diperbarui: %MY_IP%
)

:: --- 3. Jalankan Docker Compose ---
echo [>>] Menjalankan semua layanan Docker...
docker compose up -d
if %errorLevel% neq 0 (
    echo [ERROR] Gagal menjalankan layanan Docker!
    echo         Coba: docker compose logs
    pause
    exit /b 1
)

:: --- 4. Tunggu aplikasi siap ---
echo [..] Menunggu aplikasi siap (20 detik)...
timeout /t 20 /nobreak >nul

:: --- 5. Tampilkan status ---
echo.
echo =====================================================
echo    VOC Billiard Berjalan!
echo =====================================================
echo.
echo    PC Server  : http://localhost:3000
echo    HP / PC    : http://%MY_IP%:3000
echo =====================================================
echo.
docker compose ps

:: Buka browser
timeout /t 3 /nobreak >nul
start http://localhost:3000

pause
endlocal
