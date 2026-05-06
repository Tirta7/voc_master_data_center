@echo off
setlocal enabledelayedexpansion
title VOC Billiard — Update ke Versi Terbaru
color 0B
chcp 65001 >nul 2>&1

echo.
echo  ╔══════════════════════════════════════════════════════════════╗
echo  ║         VOC BILLIARD — UPDATE VERSI TERBARU                 ║
echo  ╠══════════════════════════════════════════════════════════════╣
echo  ║  Script ini akan:                                            ║
echo  ║   1. Pull code terbaru dari GitHub                          ║
echo  ║   2. Rebuild container yang berubah                         ║
echo  ║   3. Restart aplikasi (downtime ~1 menit)                   ║
echo  ╚══════════════════════════════════════════════════════════════╝
echo.
pause

cd /d "%~dp0"

echo  [>>] Mengambil update dari GitHub...
git pull origin main
if %errorLevel% neq 0 (
    echo  [!] Git pull gagal. Periksa koneksi internet.
    pause
    exit /b 1
)

echo.
echo  [>>] Rebuild dan restart layanan yang berubah...
docker compose --env-file .env up -d --build

echo.
echo  [OK] Update selesai!
docker compose ps
echo.
pause
endlocal
