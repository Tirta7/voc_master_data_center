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
set RESULT=%ERRORLEVEL%

if %RESULT% EQU 0 (
    echo.
    echo [i] Konfigurasi sudah sesuai dengan IP Jaringan.
    echo [i] Tidak ada yang perlu diperbarui.
    timeout /t 3 > nul
    exit /b 0
)

if %RESULT% EQU 2 (
    echo.
    echo [!] TERDETEKSI PERUBAHAN JARINGAN.
    echo ========================================================
    echo SISTEM AKAN MENYESUAIKAN KONFIGURASI OTOMATIS
    echo ========================================================
    echo.
    echo [2/3] Merestart Layanan (PM2)...
    call pm2 restart all >nul 2>&1
    echo [OK] Layanan telah diperbarui ke IP baru.
    echo.
    
    echo APAKAH ANDA JUGA INGIN MELAKUKAN BUILD ULANG (KOMPILASI)?
    echo --------------------------------------------------------
    echo [Y] Ya, saya baru saja merubah kode program (Lama: 5-10 menit)
    echo [N] Tidak, cukup update IP saja (Selesai sekarang!)
    echo ========================================================
    set /p CHOICE="Pilihan Anda (Y/N) [Default: N]: "
    
    if /i "!CHOICE!"=="Y" (
        goto doBuild
    ) else (
        echo [OK] Selesai! Sistem sudah siap di IP baru.
        timeout /t 5
        exit /b 0
    )
)

if %RESULT% NEQ 0 (
    echo [ERR] Terjadi kesalahan saat mendeteksi IP.
    pause
    exit /b %RESULT%
)

:doBuild
echo.
echo [3/3] Memulai Proses Kompilasi (Build)...
:: ... rest of the build logic ...
echo - Membangun Backend...
cd backend
call npm run build
if !ERRORLEVEL! NEQ 0 ( echo [ERR] Gagal build backend! && pause && exit /b 1 )
cd ..

echo - Membangun Frontend (Sabar, ini agak lama)...
cd frontend
call npm run build
if !ERRORLEVEL! NEQ 0 ( echo [ERR] Gagal build frontend! && pause && exit /b 1 )
cd ..

echo.
echo [OK] Kompilasi Selesai. Menyalakan kembali sistem...
call pm2 restart all
call pm2 save

echo.
echo ========================================================
echo    SELESAI! SISTEM SUDAH SIAP DIGUNAKAN.
echo ========================================================
echo Silakan akses aplikasi melalui HP di jaringan yang sama.
echo.
pause
