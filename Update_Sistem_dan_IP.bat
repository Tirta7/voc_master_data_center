@echo off
setlocal enabledelayedexpansion
color 0B
title VOC BILLIARD - UPDATE SYSTEM ^& IP

echo ========================================================
echo        VOC BILLIARD - UPDATE SYSTEM ^& DETEKSI IP
echo ========================================================
echo Alat ini akan menyesuaikan IP Address jika Anda pindah WiFi.
echo ========================================================
echo.

cd /d "%~dp0"

:: 1. Deteksi IP dan Update Config
echo [1/3] Mendeteksi IP Address WiFi saat ini...
node update_ip.js
if %ERRORLEVEL% NEQ 0 (
    echo [ERR] Gagal menjalankan update_ip.js
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo ========================================================
echo APAKAH ANDA INGIN MELAKUKAN BUILD ULANG (KOMPILASI)?
echo --------------------------------------------------------
echo [Y] Ya, saya baru saja merubah kode program (Lama: 5-10 menit)
echo [N] Tidak, saya hanya ganti WiFi saja (Cepat: 10 detik)
echo ========================================================
set /p CHOICE="Pilihan Anda (Y/N): "

if /i "%CHOICE%"=="Y" (
    echo.
    echo [2/3] Menghentikan Sistem Sementara...
    :: Menggunakan Stop_Sistem.bat agar lebih bersih (Fix EPERM)
    call Stop_Sistem.bat --nopause

    echo.
    echo [3/3] Memulai Proses Kompilasi ^(Build^)...
    
    echo - Membangun Backend...
    cd backend
    call npm run build
    if !ERRORLEVEL! NEQ 0 ( echo [ERR] Gagal build backend! && pause && exit /b 1 )
    cd ..

    echo - Membangun Frontend ^(Sabar, ini agak lama^)...
    cd frontend
    call npm run build
    if !ERRORLEVEL! NEQ 0 ( echo [ERR] Gagal build frontend! && pause && exit /b 1 )
    cd ..

    echo.
    echo [OK] Kompilasi Selesai. Menyalakan kembali sistem...
    call pm2 restart all
    call pm2 save
) else (
    echo.
    echo [2/2] Merestart Sistem PM2 ^(Tanpa Build^)...
    call pm2 restart all
    echo.
    echo [OK] Konfigurasi IP telah diperbarui dan sistem direstart.
)

echo.
echo ========================================================
echo    SELESAI! SISTEM SUDAH SIAP DIGUNAKAN.
echo ========================================================
echo Silakan akses aplikasi melalui HP di jaringan yang sama.
echo.
pause
