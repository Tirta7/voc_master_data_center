@echo off
setlocal
color 0B
title VOC BILLIARD - FULL REFRESH

echo ========================================================
echo        VOC BILLIARD - RESTART SYSTEM ^& NETWORK
echo ========================================================
echo Menyegarkan IP dan seluruh layanan...
echo ========================================================
echo.

cd /d "%~dp0"

:: 1. Sinkronisasi IP sebelum restart
echo [1/3] Memperbarui Konfigurasi IP Jaringan...
node update_ip.js
echo.

:: 2. Restart PM2
echo [2/3] Melakukan Restart pada semua proses PM2...
call pm2 restart all
echo.

:: 3. Flush logs
echo [3/3] Membersihkan log sistem (Flush)...
call pm2 flush

echo.
echo ========================================================
echo    SELESAI! SISTEM TELAH DISIKAL ^& IP DIPERBARUI.
echo ========================================================
echo.
pause
