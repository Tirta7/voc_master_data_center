@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul
title VOC Billiard - Update Aplikasi
color 0B
cls

echo.
echo  ============================================================
echo    VOC BILLIARD - UPDATE APLIKASI
echo  ============================================================
echo.

set INSTALL_DIR=%~dp0
cd /d "%INSTALL_DIR%"

:: ---- Load GITHUB_TOKEN from .env ----
if exist .env (
    for /f "tokens=2 delims==" %%i in ('findstr /I "GITHUB_TOKEN" .env') do set GITHUB_TOKEN=%%i
)

:: ---- Check if GITHUB_TOKEN is found ----
if "%GITHUB_TOKEN%"=="" (
    echo  [!] GITHUB_TOKEN tidak ditemukan di file .env.
    echo      Untuk mengunduh update dari registry private ghcr.io,
    echo      Anda perlu login terlebih dahulu.
    echo.
    set /p GITHUB_TOKEN=  Masukkan GitHub Token Anda: 
    echo.
)

if not "%GITHUB_TOKEN%"=="" (
    echo [0/3] Login ke GitHub Container Registry...
    echo %GITHUB_TOKEN% | docker login ghcr.io -u tirta7 --password-stdin
    if errorlevel 1 (
        echo.
        echo  [ERROR] Gagal login ke registry ghcr.io! 
        echo          Pastikan GITHUB_TOKEN valid dan memiliki izin read:packages.
        echo.
        pause
        exit /b 1
    )
    echo  [OK] Login berhasil.
    echo.
    
    :: Simpan token ke .env jika belum ada
    findstr /I "GITHUB_TOKEN" .env >nul 2>&1
    if errorlevel 1 (
        echo GITHUB_TOKEN=%GITHUB_TOKEN%>> .env
        echo  [OK] GITHUB_TOKEN berhasil disimpan ke .env untuk pembaruan berikutnya.
    )
)

echo [1/3] Mengunduh versi terbaru dari cloud...
docker compose pull
if errorlevel 1 (
    echo.
    echo  [ERROR] Gagal mengunduh update! Periksa koneksi internet Anda atau validitas Token.
    echo.
    pause
    exit /b 1
)

echo [2/3] Menerapkan update aplikasi...
docker compose up -d --remove-orphans
if errorlevel 1 (
    echo.
    echo  [ERROR] Gagal menerapkan update ke container!
    echo.
    pause
    exit /b 1
)

echo [3/3] Membersihkan file cache lama...
docker image prune -f >nul 2>&1

echo.
echo  ============================================================
echo    UPDATE SELESAI! Aplikasi berhasil diperbarui ke versi terbaru.
echo  ============================================================
echo.
start http://localhost:3000
pause

