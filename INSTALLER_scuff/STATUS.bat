@echo off
setlocal enabledelayedexpansion

chcp 437 >nul 2>&1
title VOC Billiard - Status Layanan
color 0B
set "INSTALL_DIR=%~dp0"
cd /d "%INSTALL_DIR%"

cls
echo.
echo  ============================================================
echo    VOC BILLIARD - Status Semua Layanan
echo  ============================================================
echo.

docker compose -f "%INSTALL_DIR%docker-compose.yml" ps

echo.
echo  ---- Penggunaan Sumber Daya ----
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.Status}}"

echo.
for /f "delims=" %%i in ('powershell -NoProfile -Command "([System.Net.Dns]::GetHostAddresses([System.Net.Dns]::GetHostName()) | Where-Object {$_.AddressFamily -eq 'InterNetwork'} | Select-Object -First 1).IPAddressToString"') do set "SERVER_IP=%%i"
if "!SERVER_IP!"=="" set "SERVER_IP=localhost"

echo  ============================================================
echo   Akses Aplikasi:
echo   Browser PC ini  : http://localhost:3000
echo   Akses dari HP   : http://!SERVER_IP!:3000
echo  ============================================================
echo.
echo  Tekan sembarang tombol untuk menutup...
pause >nul
endlocal
