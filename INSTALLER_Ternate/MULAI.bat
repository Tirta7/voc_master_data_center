@echo off
setlocal enabledelayedexpansion

:: ============================================================
:: SELF-ELEVATION
:: ============================================================
net session >nul 2>&1
if %errorlevel% neq 0 (
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process cmd.exe -ArgumentList '/c \"%~f0\" & pause' -Verb RunAs -Wait"
    exit /b 0
)

chcp 437 >nul 2>&1
title VOC Billiard - Mulai Layanan
color 0A
set "INSTALL_DIR=%~dp0"
cd /d "!INSTALL_DIR!"

cls
echo.
echo  ============================================================
echo    VOC BILLIARD - Menjalankan Semua Layanan
echo  ============================================================
echo.

docker info >nul 2>&1
if not errorlevel 1 goto DOCKER_OK

echo  [!] Docker Engine belum aktif. Membuka Docker Desktop...
start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe"
echo  Menunggu Docker siap...

set "DW=0"
:WAIT_D
timeout /t 10 /nobreak >nul
set /a "DW+=10"
docker info >nul 2>&1
if not errorlevel 1 goto DOCKER_OK
if !DW! LSS 90 goto WAIT_D

echo  [ERROR] Docker tidak bisa dijalankan. Buka manual lalu coba lagi.
pause
exit /b 1

:DOCKER_OK
echo  [OK] Docker Engine aktif.
echo  [..] Memulai semua layanan...

docker compose -f "!INSTALL_DIR!docker-compose.yml" --env-file "!INSTALL_DIR!.env" up -d
if errorlevel 1 (
    echo  [ERROR] Gagal memulai layanan!
    pause
    exit /b 1
)

echo.
echo  [OK] Semua layanan berjalan!
echo      Menunggu aplikasi siap...
timeout /t 10 /nobreak >nul

for /f "delims=" %%i in ('powershell -NoProfile -Command "([System.Net.Dns]::GetHostAddresses([System.Net.Dns]::GetHostName()) | Where-Object {$_.AddressFamily -eq 'InterNetwork'} | Select-Object -First 1).IPAddressToString"') do set "SERVER_IP=%%i"
if "!SERVER_IP!"=="" set "SERVER_IP=localhost"

cls
echo.
echo  ============================================================
echo    VOC BILLIARD SIAP DIGUNAKAN
echo  ============================================================
echo.
echo    Browser PC ini  : http://localhost:3000
echo    Akses dari HP   : http://!SERVER_IP!:3000
echo    Halaman Kasir   : http://!SERVER_IP!:3000/billing
echo    Akses Online    : https://Ternate.vocbilliard.online
echo.
echo  ============================================================
echo.
echo  Tekan sembarang tombol untuk membuka browser...
pause >nul

start http://localhost:3000
endlocal
