@echo off
color 0B
echo ========================================================
echo        VOC BILLIARD - RESTART SYSTEM ^& MEMORY
echo ========================================================
echo Menyegarkan seluruh layanan (Backend ^& Frontend)...
echo ========================================================
echo.

cd /d "d:\Billiard_APPS"

echo [1/2] Melakukan Restart pada semua proses PM2...
call pm2 restart all

echo.
echo [2/2] Membersihkan log sistem (Flush)...
call pm2 flush

echo.
echo ========================================================
echo    SELESAI! MEMORI SISTEM SUDAH DISIKAL ULANG.
echo ========================================================
pause
