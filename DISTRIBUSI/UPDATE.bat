@echo off
chcp 65001 >nul
title VOC Billiard - Update Aplikasi
color 0B
cls

echo.
echo  ╔══════════════════════════════════════════════════════════╗
echo  ║        VOC BILLIARD — UPDATE APLIKASI                   ║
echo  ╚══════════════════════════════════════════════════════════╝
echo.

set INSTALL_DIR=%~dp0
cd /d "%INSTALL_DIR%"

echo [1/3] Mengunduh versi terbaru...
docker compose pull
if errorlevel 1 (
    echo  [ERROR] Gagal update! Cek koneksi internet.
    pause & exit /b 1
)

echo [2/3] Menerapkan update...
docker compose up -d --remove-orphans
if errorlevel 1 (
    echo  [ERROR] Gagal menerapkan update!
    pause & exit /b 1
)

echo [3/3] Membersihkan image lama...
docker image prune -f >nul 2>&1

echo.
echo  ╔══════════════════════════════════════════════════════════╗
echo  ║  UPDATE SELESAI! Aplikasi sudah diperbarui.             ║
echo  ╚══════════════════════════════════════════════════════════╝
echo.
start http://localhost:3000
pause
