@echo off
setlocal enabledelayedexpansion
title VOC Billiard — Setup dari GitHub
color 0A
chcp 65001 > nul

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║       VOC BILLIARD — SETUP DARI GITHUB (PC BARU)            ║
echo ╠══════════════════════════════════════════════════════════════╣
echo ║  Script ini akan:                                            ║
echo ║   1. Install Git (jika belum ada)                           ║
echo ║   2. Download semua code dari GitHub                        ║
echo ║   3. Install Node.js, PostgreSQL, Redis, Mosquitto, PM2     ║
echo ║   4. Build dan jalankan aplikasi                            ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.
echo  Butuh internet. Letakkan file ini di folder mana saja.
echo  Contoh: letakkan di D:\  atau  C:\Users\[nama]\Desktop
echo.

:: ─────────────────────────────────────────────────────────────
:: CEK ADMINISTRATOR
:: ─────────────────────────────────────────────────────────────
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [!] Jalankan sebagai ADMINISTRATOR!
    echo     Klik kanan file ini → Run as administrator
    pause
    exit /b 1
)

:: ─────────────────────────────────────────────────────────────
:: PILIH FOLDER INSTALASI
:: ─────────────────────────────────────────────────────────────
echo  Pilih lokasi instalasi:
echo   [1] D:\Billiard_APPS  (default, direkomendasikan)
echo   [2] C:\Billiard_APPS
echo   [3] Ketik sendiri
echo.
set /p LOC_PILIH="  Pilihan (1/2/3): "

if "%LOC_PILIH%"=="1" set INSTALL_DIR=D:\Billiard_APPS
if "%LOC_PILIH%"=="2" set INSTALL_DIR=C:\Billiard_APPS
if "%LOC_PILIH%"=="3" (
    set /p INSTALL_DIR="  Ketik path lengkap (contoh: E:\VOC_Billiard): "
)
if not defined INSTALL_DIR set INSTALL_DIR=D:\Billiard_APPS

echo.
echo [>>] Akan diinstall ke: %INSTALL_DIR%
echo.
pause

:: ─────────────────────────────────────────────────────────────
:: STEP 1 — GIT
:: ─────────────────────────────────────────────────────────────
echo.
echo ══ STEP 1: Git ════════════════════════════════════════════════
git --version >nul 2>&1
if %errorLevel% equ 0 (
    for /f "tokens=*" %%i in ('git --version') do echo [OK] %%i sudah ada.
) else (
    echo [>>] Menginstall Git via winget...
    winget install Git.Git --silent --accept-package-agreements --accept-source-agreements
    if %errorLevel% neq 0 (
        echo [!] Gagal install Git otomatis.
        echo     Download manual dari: https://git-scm.com/download/win
        echo     Setelah install Git, jalankan file ini lagi.
        pause
        exit /b 1
    )
    :: Refresh PATH untuk Git
    set "PATH=%PATH%;C:\Program Files\Git\cmd"
    echo [OK] Git berhasil diinstall.
    echo [!!] Jika git tidak dikenali, restart Command Prompt dan jalankan ulang.
)

:: ─────────────────────────────────────────────────────────────
:: STEP 2 — CLONE DARI GITHUB
:: ─────────────────────────────────────────────────────────────
echo.
echo ══ STEP 2: Download Code dari GitHub ══════════════════════════

if exist "%INSTALL_DIR%\.git" (
    echo [OK] Repository sudah ada di %INSTALL_DIR%
    echo [>>] Update ke versi terbaru...
    git -C "%INSTALL_DIR%" pull origin main
    echo [OK] Code diperbarui.
) else (
    if exist "%INSTALL_DIR%" (
        echo [!!] Folder %INSTALL_DIR% sudah ada tapi bukan git repo.
        echo      Melanjutkan clone ke dalam folder...
    ) else (
        mkdir "%INSTALL_DIR%" 2>nul
    )

    echo [>>] Clone dari GitHub (bisa beberapa menit)...
    echo      URL: https://github.com/Tirta7/voc_master_data_center.git
    echo.
    git clone https://github.com/Tirta7/voc_master_data_center.git "%INSTALL_DIR%"
    if %errorLevel% neq 0 (
        echo [ERROR] Clone gagal!
        echo         Periksa koneksi internet Anda.
        pause
        exit /b 1
    )
    echo [OK] Code berhasil didownload ke %INSTALL_DIR%
)

:: ─────────────────────────────────────────────────────────────
:: STEP 3 — JALANKAN INSTALL.bat
:: ─────────────────────────────────────────────────────────────
echo.
echo ══ STEP 3: Jalankan Installer Utama ═══════════════════════════
echo [>>] Menjalankan INSTALL.bat di %INSTALL_DIR%...
echo.

if not exist "%INSTALL_DIR%\INSTALL.bat" (
    echo [ERROR] INSTALL.bat tidak ditemukan di %INSTALL_DIR%
    echo         Clone mungkin tidak lengkap. Coba hapus folder dan jalankan ulang.
    pause
    exit /b 1
)

call "%INSTALL_DIR%\INSTALL.bat"

endlocal
