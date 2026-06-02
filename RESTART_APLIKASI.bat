@echo off
title Restart Aplikasi VOC Billiard
echo ===================================================
echo Merestart Aplikasi Docker untuk Terapkan Pengaturan HTTPS
echo ===================================================
cd d:\Billiard_APPS\INSTALLER_CLIENT
docker compose up -d
echo.
echo Restart selesai! Silakan refresh browser Anda.
pause
