@echo off
setlocal
title VOC Billiard - Hentikan Layanan
color 0C

echo.
echo =====================================================
echo    VOC BILLIARD - MENGHENTIKAN LAYANAN
echo =====================================================
echo.

cd /d "%~dp0"

echo [>>] Menghentikan semua container Docker...
docker compose down
if %errorLevel% equ 0 (
    echo [OK] Semua layanan berhasil dihentikan.
) else (
    echo [!] Gagal menghentikan via docker compose. Coba paksa hentikan...
    docker stop voc_frontend voc_backend voc_postgres voc_redis voc_mosquitto >nul 2>&1
    echo [OK] Container dihentikan paksa.
)

echo.
echo [i] Data database tetap aman tersimpan di Docker Volume.
echo     Untuk memulai lagi: klik DEPLOY.bat
echo.
pause
endlocal
