@echo off
title STOP VOC BILLIARD
color 0C

echo ========================================================
echo          VOC BILLIARD - MEMATIKAN SISTEM
echo ========================================================
echo.
echo Sedang mematikan seluruh servis Docker secara aman (Graceful Shutdown)...
echo.

cd /d "%~dp0"

:: Matikan docker-compose
docker compose down

echo.
echo ========================================================
echo [SUKSES] Semua servis berhasil dimatikan.
echo ========================================================
echo Komputer sekarang aman untuk direstart atau dimatikan.
echo.
pause
