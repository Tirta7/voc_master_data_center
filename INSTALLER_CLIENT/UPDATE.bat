@echo off
setlocal enabledelayedexpansion

:: SELF-ELEVATION
net session >nul 2>&1
if %errorlevel% neq 0 (
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process cmd.exe -ArgumentList '/c \"%~f0\" & pause' -Verb RunAs -Wait"
    exit /b 0
)

chcp 437 >nul 2>&1
title VOC Billiard - Update Aplikasi
color 0E
set "INSTALL_DIR=%~dp0"
cd /d "%INSTALL_DIR%"

set "GITHUB_TOKEN="
set "GITHUB_USERNAME=tirta7"
set "GDRIVE_FOLDER_ID="
if exist "%INSTALL_DIR%.token" (
    for /f "usebackq tokens=1,* delims==" %%a in ("%INSTALL_DIR%.token") do (
        if /i "%%a"=="GITHUB_TOKEN"    set "GITHUB_TOKEN=%%b"
        if /i "%%a"=="GITHUB_USERNAME" set "GITHUB_USERNAME=%%b"
        if /i "%%a"=="GDRIVE_FOLDER_ID" set "GDRIVE_FOLDER_ID=%%b"
    )
)
if "!GITHUB_TOKEN!"=="" (
    if exist "%INSTALL_DIR%.env" (
        for /f "tokens=2 delims==" %%v in ('findstr /i "GITHUB_TOKEN" "%INSTALL_DIR%.env"') do set "GITHUB_TOKEN=%%v"
    )
)
if "!GDRIVE_FOLDER_ID!"=="" (
    if exist "%INSTALL_DIR%.env" (
        for /f "tokens=2 delims==" %%v in ('findstr /i "GDRIVE_FOLDER_ID" "%INSTALL_DIR%.env"') do set "GDRIVE_FOLDER_ID=%%v"
    )
)

echo.
echo  ============================================================
echo    VOC BILLIARD - Update ke Versi Terbaru
echo  ============================================================
echo.

if "!GITHUB_TOKEN!"=="" (
    echo  [!] Token tidak ditemukan di .token atau .env
    set /p "GITHUB_TOKEN=  Masukkan GitHub Token: "
)

if "!GDRIVE_FOLDER_ID!"=="" (
    echo.
    set /p "GDRIVE_FOLDER_ID=  Masukkan Google Drive Folder ID untuk Backup: "
    echo GDRIVE_FOLDER_ID=!GDRIVE_FOLDER_ID!>> "%INSTALL_DIR%.env"
)

echo  [1/5] Login ke registry...
echo !GITHUB_TOKEN! | docker login ghcr.io -u !GITHUB_USERNAME! --password-stdin
if errorlevel 1 (
    echo  [ERROR] Gagal login. Pastikan token masih valid.
    pause & exit /b 1
)

echo.
echo  [2/5] Mengecek Rclone...
rclone version >nul 2>&1
if errorlevel 1 (
    echo  [!] Rclone tidak ditemukan. Menginstall otomatis via winget...
    winget install Rclone.Rclone --exact --source winget --silent --accept-package-agreements --accept-source-agreements
)

:: ──────────────────────────────────────────────────────────────
:: [3/5] Pull image dari Docker Hub DENGAN RETRY (postgres, redis, mosquitto, cloudflared)
::       Image ini jarang berubah, SKIP jika sudah ada di lokal
:: ──────────────────────────────────────────────────────────────
echo.
echo  [3/5] Mengecek image pendukung (postgres, redis, mosquitto)...
echo       [INFO] Jika sudah ada, proses ini akan cepat...

set "DOCKERHUB_IMAGES=postgres:16-alpine redis:7-alpine eclipse-mosquitto:2.0 cloudflare/cloudflared:latest"

for %%I in (%DOCKERHUB_IMAGES%) do (
    :: Cek apakah image sudah ada di lokal
    docker image inspect %%I >nul 2>&1
    if errorlevel 1 (
        echo  [+] Mengunduh %%I ^(belum ada di lokal^)...
        set PULL_OK=0
        :: Coba pull maksimal 3x dengan jeda antar percobaan
        for /L %%r in (1,1,3) do (
            if !PULL_OK!==0 (
                docker pull %%I
                if not errorlevel 1 (
                    set PULL_OK=1
                ) else (
                    echo  [!] Percobaan %%r gagal, mencoba lagi dalam 5 detik...
                    timeout /t 5 /nobreak >nul
                )
            )
        )
        if !PULL_OK!==0 (
            echo  [SKIP] %%I gagal diunduh. Melanjutkan dengan versi yang ada...
        )
    ) else (
        echo  [SKIP] %%I sudah ada di lokal, tidak perlu download ulang.
    )
)

:: ──────────────────────────────────────────────────────────────
:: [4/5] Pull image aplikasi VOC dari ghcr.io (WAJIB update)
::       ghcr.io jarang timeout karena CDN GitHub lebih stabil
:: ──────────────────────────────────────────────────────────────
echo.
echo  [4/5] Mengunduh update VOC dari GitHub Registry...
docker pull ghcr.io/!GITHUB_USERNAME!/voc-backend:latest
if errorlevel 1 (
    echo  [ERROR] Gagal download voc-backend.
    pause & exit /b 1
)

docker pull ghcr.io/!GITHUB_USERNAME!/voc-frontend:latest
if errorlevel 1 (
    echo  [ERROR] Gagal download voc-frontend.
    pause & exit /b 1
)

:: ──────────────────────────────────────────────────────────────
:: [5/5] Restart layanan dengan versi baru
:: ──────────────────────────────────────────────────────────────
echo.
echo  [5/5] Restart layanan dengan versi baru...
docker compose -f "%INSTALL_DIR%docker-compose.yml" --env-file "%INSTALL_DIR%.env" up -d --no-pull
if errorlevel 1 (
    echo  [ERROR] Gagal restart layanan.
    pause & exit /b 1
)

echo.
echo  [OK] Update selesai! Menunggu 15 detik...
timeout /t 15 /nobreak >nul

echo.
echo  ============================================================
echo   Update berhasil! Aplikasi berjalan dengan versi terbaru.
echo  ============================================================
echo.
start http://localhost:3000
pause >nul
endlocal

