@echo off
chcp 65001 >nul
title VOC Billiard - Update Aplikasi
color 0B
cls

echo.
echo  ============================================================
echo    VOC BILLIARD - UPDATE APLIKASI
echo  ============================================================
echo.

set INSTALL_DIR=%~dp0
cd /d "%INSTALL_DIR%"

echo [1/3] Mengunduh versi terbaru dari cloud...
docker compose pull
if errorlevel 1 (
    echo.
    echo  [ERROR] Gagal mengunduh update! Periksa koneksi internet Anda.
    echo.
    pause
    exit /b 1
)

echo [2/3] Menerapkan update aplikasi...
docker compose up -d --remove-orphans
if errorlevel 1 (
    echo.
    echo  [ERROR] Gagal menerapkan update ke container!
    echo.
    pause
    exit /b 1
)

echo [3/3] Membersihkan file cache lama...
docker image prune -f >nul 2>&1

echo.
echo  ============================================================
echo    UPDATE SELESAI! Aplikasi berhasil diperbarui ke versi terbaru.
echo  ============================================================
echo.
start http://localhost:3000
pause
