@echo off
echo =========================================
echo       VOC BILLIARD CACHE CLEANER
echo =========================================
echo.
echo Peringatan: Pastikan Anda telah mematikan terminal server Frontend dan Backend (Ctrl + C) sebelum melanjutkan.
echo.
pause

echo.
echo Membersihkan Cache Frontend (Next.js)...
if exist "frontend\.next" rmdir /s /q "frontend\.next"
if exist "frontend\node_modules\.cache" rmdir /s /q "frontend\node_modules\.cache"
echo [OK] Frontend cache dibersihkan.

echo.
echo Membersihkan Cache Backend (NestJS ^& WhatsApp)...
if exist "backend\dist" rmdir /s /q "backend\dist"
if exist "backend\auth_info_baileys" rmdir /s /q "backend\auth_info_baileys"
if exist "backend\node_modules\.cache" rmdir /s /q "backend\node_modules\.cache"
echo [OK] Backend cache dibersihkan.

echo.
echo =========================================
echo        PEMBERSIHAN SELESAI!
echo =========================================
echo Anda dapat menjalankan ulang aplikasi sekarang (npm run dev / npm run start:dev).
echo.
pause
