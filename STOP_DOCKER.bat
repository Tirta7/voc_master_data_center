@echo off
title VOC Billiard — Stop Layanan
color 0C
chcp 65001 >nul 2>&1

echo.
echo  ╔══════════════════════════════════════════════════════════╗
echo  ║         VOC BILLIARD — MENGHENTIKAN LAYANAN...          ║
echo  ╚══════════════════════════════════════════════════════════╝
echo.

cd /d "%~dp0"
docker compose down

echo.
echo  [OK] Semua layanan dihentikan. Data tersimpan aman.
echo.
pause
