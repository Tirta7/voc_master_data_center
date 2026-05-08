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

echo [>>] Menghentikan semua layanan di PM2...
pm2 stop all
pm2 delete all

echo.
echo [>>] Mematikan layanan pendukung (jika diperlukan)...
:: Opsional: jika ingin mematikan database juga, tapi biasanya biarkan saja
:: net stop mosquitto
:: net start Redis
:: net stop postgresql-x64-16

echo.
echo [OK] Aplikasi telah dihentikan.
echo.
pause
endlocal
