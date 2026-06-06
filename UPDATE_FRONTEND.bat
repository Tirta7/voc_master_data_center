@echo off
color 0A
title Update Frontend - VOC Billiard

echo ========================================================
echo        MEMBANGUN ULANG FRONTEND (Next.js)
echo ========================================================
echo Tunggu sebentar, proses ini memakan waktu beberapa saat...
echo.

cd /d "%~dp0"
cd frontend
call npm run build

echo.
echo ========================================================
echo        RESTART APLIKASI (PM2)
echo ========================================================
cd ..
call pm2 restart ecosystem.config.js --update-env

echo.
echo ========================================================
echo [OK] Selesai! Perubahan frontend Anda sudah aktif.
echo ========================================================
pause
