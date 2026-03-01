@echo off
color 0A
echo ========================================================
echo        VOC BILLIARD - UPDATE SYSTEM ^& DETEKSI IP
echo ========================================================
echo Alat ini akan menyesuaikan IP Address jika Anda pindah WiFi
echo dan akan memperbarui sistem jika ada perubahan kode sumber.
echo Jangan tutup jendela ini sebelum tertulis "SELESAI".
echo ========================================================
echo.

cd /d "d:\Billiard_APPS"

echo [1/4] Mendeteksi IP Address WiFi saat ini...
node update_ip.js

echo.
echo [2/4] Melakukan Build Ulang Backend...
cd backend
call npm run build
cd ..

echo.
echo [3/4] Melakukan Build Ulang Frontend (Memasukkan IP Baru)...
cd frontend
call npm run build
cd ..

echo.
echo [4/4] Merestart Sistem PM2...
call pm2 restart all
call pm2 save

echo.
echo ========================================================
echo    SELESAI! SISTEM SUDAH DIPERBARUI DAN SIAP DIGUNAKAN.
echo ========================================================
pause
