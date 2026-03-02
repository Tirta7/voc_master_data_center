@echo off
color 0C
echo ========================================================
echo        VOC BILLIARD - STOP ALL BACKGROUND SYSTEMS
echo ========================================================
echo Mematikan semua layanan (Backend ^& Frontend)...
echo ========================================================
echo.

cd /d "d:\Billiard_APPS"

echo [1/2] Menghentikan semua proses PM2...
call pm2 stop all

echo.
echo [2/2] Mematikan PM2 Daemon...
call pm2 kill

echo.
echo ========================================================
echo    SELESAI! SEMUA SISTEM TELAH DINONAKTIFKAN.
echo ========================================================
pause
