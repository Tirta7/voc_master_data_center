@echo off
setlocal enabledelayedexpansion
title VOC Billiard - Setup dari GitHub
color 0A

echo.
echo =====================================================
echo    VOC BILLIARD - SETUP PC BARU DARI GITHUB
echo =====================================================
echo    Letakkan file ini di folder manapun (misal D:\)
echo    Script akan otomatis download dan install semua.
echo =====================================================
echo.
echo Butuh: koneksi internet + jalankan sebagai Administrator
echo.

:: Cek Administrator
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [!] Jalankan sebagai ADMINISTRATOR!
    pause
    exit /b 1
)

:: --- Pilih lokasi instalasi ---
echo Pilih lokasi instalasi:
echo  [1] D:\Billiard_APPS  (direkomendasikan)
echo  [2] C:\Billiard_APPS
echo  [3] Ketik sendiri
echo.
set /p LOC="  Pilihan (1/2/3, default=1): "
if "%LOC%"=="2" set INSTALL_DIR=C:\Billiard_APPS
if "%LOC%"=="3" (
    set /p INSTALL_DIR="  Path instalasi: "
)
if not defined INSTALL_DIR set INSTALL_DIR=D:\Billiard_APPS

echo [OK] Instalasi ke: %INSTALL_DIR%
echo.
pause

:: --- STEP 1: Git ---
echo.
echo --- [1/3] Memeriksa Git ---
git --version >nul 2>&1
if %errorLevel% equ 0 (
    for /f "tokens=*" %%i in ('git --version') do echo [OK] %%i
) else (
    echo [>>] Menginstall Git via winget...
    winget install Git.Git --silent --accept-package-agreements --accept-source-agreements
    set "PATH=%PATH%;C:\Program Files\Git\cmd"
    git --version >nul 2>&1
    if !errorLevel! neq 0 (
        echo [!] Git gagal. Download manual: https://git-scm.com/download/win
        echo     Setelah install, jalankan file ini lagi.
        pause
        exit /b 1
    )
    echo [OK] Git berhasil diinstall.
)

:: --- STEP 2: Clone/Pull repo ---
echo.
echo --- [2/3] Download Code dari GitHub ---
if exist "%INSTALL_DIR%\.git" (
    echo [OK] Repository sudah ada. Update ke versi terbaru...
    git -C "%INSTALL_DIR%" pull origin main
) else (
    if not exist "%INSTALL_DIR%" mkdir "%INSTALL_DIR%"
    echo [>>] Download code (bisa beberapa menit)...
    git clone https://github.com/Tirta7/voc_master_data_center.git "%INSTALL_DIR%"
    if !errorLevel! neq 0 (
        echo [ERROR] Clone gagal! Periksa koneksi internet.
        pause
        exit /b 1
    )
    echo [OK] Code berhasil didownload.
)

:: --- STEP 3: Jalankan INSTALL.bat ---
echo.
echo --- [3/3] Jalankan Installer Utama ---
if not exist "%INSTALL_DIR%\INSTALL.bat" (
    echo [ERROR] INSTALL.bat tidak ditemukan di %INSTALL_DIR%!
    pause
    exit /b 1
)

cd /d "%INSTALL_DIR%"
call "%INSTALL_DIR%\INSTALL.bat"
endlocal
