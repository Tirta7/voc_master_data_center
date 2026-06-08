@echo off
setlocal enabledelayedexpansion

chcp 437 >nul 2>&1
title VOC Billiard - Matikan Layanan
color 0C
set "INSTALL_DIR=%~dp0"
cd /d "%INSTALL_DIR%"

echo.
echo  ============================================================
echo    VOC BILLIARD - Mematikan Semua Layanan
echo  ============================================================
echo.

docker compose -f "%INSTALL_DIR%docker-compose.yml" down
if errorlevel 1 (
    echo  [!] Ada masalah saat mematikan layanan.
) else (
    echo  [OK] Semua layanan berhasil dihentikan.
)

echo.
echo  Tekan sembarang tombol untuk menutup...
pause >nul
endlocal
