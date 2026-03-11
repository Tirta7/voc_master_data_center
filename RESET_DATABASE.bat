@echo off
setlocal
title VOC BILLIARD - FULL FACTORY RESET
color 4F

echo ========================================================
echo       VOC SYSTEM - SECURITY VERIFICATION
echo ========================================================
set /p PWD="Masukan Password Keamanan: "

if NOT "%PWD%"=="123" (
    color 0C
    echo.
    echo [ERROR] PASSWORD SALAH! Akses ditolak.
    timeout /t 3 > nul
    exit /b
)

cls
echo ========================================================
echo        PERINGATAN KERAS: FACTORY RESET TOTAL
echo ========================================================
echo Aksi ini akan MENGHAPUS PERMANEN:
echo 1. Seluruh Database (Transaksi, Kas, Member, Meja)
echo 2. Seluruh File Upload (Logo, Banner Promo, Gambar Hadiah)
echo 3. Riwayat Aktivitas Sistem
echo ========================================================
echo.
set /p CONFIRM="Ketik 'RESET' untuk melanjutkan: "

if /i NOT "%CONFIRM%"=="RESET" (
    echo.
    echo [INFO] Reset dibatalkan. Tidak ada data yang dihapus.
    pause
    exit /b
)

echo.
echo [1/4] Menghentikan semua layanan sistem...
call pm2 stop all >nul 2>&1
taskkill /F /IM node.exe /T >nul 2>&1
taskkill /F /IM mosquitto.exe /T >nul 2>&1

echo.
echo [2/4] Menjalankan Deep Cleanup (Database ^& Media)...
cd /d "%~dp0\backend"
call npx ts-node -r tsconfig-paths/register factory-reset.ts

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERR] Terjadi kesalahan saat proses reset!
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo [3/4] Membangun kembali fondasi sistem...
echo Menyiapkan database baru...

echo.
echo [4/4] Menghidupkan ulang seluruh sistem...
cd /d "%~dp0"
call start_app.bat

echo.
echo ========================================================
echo    RESET SELESAI! SISTEM KEMBALI SEPERTI BARU.
echo ========================================================
echo Akun Admin Bawaan: admin / 123
echo.
pause
