@echo off
setlocal enabledelayedexpansion
title VOC Billiard - Update ke Versi Terbaru
color 0B

echo.
echo =====================================================
echo    VOC BILLIARD - UPDATE VERSI TERBARU
echo =====================================================
echo    Script ini akan:
echo     1. Pull code terbaru dari GitHub
echo     2. Rebuild aplikasi yang berubah
echo     3. Restart layanan via PM2
echo =====================================================
echo.
pause

cd /d "%~dp0"

echo [>>] Mengambil update dari GitHub...
git pull origin main
if %errorLevel% neq 0 (
    echo [!] Git pull gagal. Periksa koneksi internet.
    pause
    exit /b 1
)

echo.
echo [>>] Memperbarui dependencies dan me-rebuild...

:: Backend
cd /d "%~dp0backend"
echo [>>] Backend: npm install...
call npm install --prefer-offline --legacy-peer-deps 2>nul || call npm install --legacy-peer-deps
echo [>>] Backend: npm run build...
call npm run build

:: Frontend
cd /d "%~dp0frontend"
if exist ".next" rmdir /s /q ".next"
echo [>>] Frontend: npm install...
call npm install --prefer-offline --legacy-peer-deps 2>nul || call npm install --legacy-peer-deps
echo [>>] Frontend: npm run build...
call npm run build

echo.
echo [>>] Me-restart layanan...
cd /d "%~dp0"
pm2 restart all
pm2 save

echo.
echo =====================================================
echo    Update selesai!
echo =====================================================
echo.
pm2 list
echo.
pause
endlocal
